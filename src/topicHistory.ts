const REPO = "porterpo/dawnandron-blog-agent";
const HISTORY_PATH = "topics/history.json";

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

export async function getTopicHistory(): Promise<string[]> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${HISTORY_PATH}`, {
    headers: headers(),
  });
  if (!response.ok) return [];
  const data = (await response.json()) as { content: string };
  return JSON.parse(Buffer.from(data.content, "base64").toString("utf-8")) as string[];
}

export async function addTopicToHistory(topic: string): Promise<void> {
  let topics: string[] = [];
  let sha: string | undefined;

  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${HISTORY_PATH}`, {
    headers: headers(),
  });
  if (response.ok) {
    const data = (await response.json()) as { content: string; sha: string };
    topics = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8")) as string[];
    sha = data.sha;
  }

  topics.push(topic);

  const content = Buffer.from(JSON.stringify(topics, null, 2)).toString("base64");

  const putResponse = await fetch(`https://api.github.com/repos/${REPO}/contents/${HISTORY_PATH}`, {
    method: "PUT",
    headers: headers(),
    body: JSON.stringify({
      message: `topics: add "${topic}"`,
      content,
      ...(sha ? { sha } : {}),
    }),
  });

  if (!putResponse.ok) throw new Error(`Failed to update topic history: ${await putResponse.text()}`);
  console.log(`Topic history updated: "${topic}"`);
}
