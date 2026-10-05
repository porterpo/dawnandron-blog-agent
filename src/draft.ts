import type { GeneratedPost } from "./agent.js";

const REPO = "porterpo/dawnandron-blog-agent";
const DRAFT_PATH = "draft/pending.json";
// Written to a branch Railway does not watch, so saving/deleting a draft never triggers a redeploy
// that kills the container mid-generation. See topicHistory.ts for the same pattern.
const DATA_BRANCH = "data";

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function saveDraft(post: GeneratedPost): Promise<void> {
  const content = Buffer.from(JSON.stringify(post, null, 2)).toString("base64");

  let sha: string | undefined;
  const existing = await fetch(`https://api.github.com/repos/${REPO}/contents/${DRAFT_PATH}?ref=${DATA_BRANCH}`, {
    headers: headers(),
  });
  if (existing.ok) {
    const data = (await existing.json()) as { sha: string };
    sha = data.sha;
  }

  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${DRAFT_PATH}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: `draft: ${post.title}`,
      content,
      branch: DATA_BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!response.ok) throw new Error(`GitHub draft save error: ${await response.text()}`);
  console.log("Draft saved to GitHub: draft/pending.json");
}

export interface DraftData {
  post: GeneratedPost;
  sha: string;
}

export async function readDraft(): Promise<DraftData | null> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${DRAFT_PATH}?ref=${DATA_BRANCH}`, {
    headers: headers(),
  });
  if (!response.ok) {
    console.log("No draft found — skipping publish.");
    return null;
  }
  const data = (await response.json()) as { content: string; sha: string };
  const decoded = Buffer.from(data.content, "base64").toString("utf-8");
  try {
    return { post: JSON.parse(decoded) as GeneratedPost, sha: data.sha };
  } catch {
    console.warn("Draft file exists but contains invalid JSON — treating as no draft.");
    return null;
  }
}

export async function deleteDraft(sha: string): Promise<void> {
  await fetch(`https://api.github.com/repos/${REPO}/contents/${DRAFT_PATH}`, {
    method: "DELETE",
    headers: headers(),
    body: JSON.stringify({ message: "chore: remove published draft", sha, branch: DATA_BRANCH }),
  });
  console.log("Draft removed from GitHub.");
}
