const REPO = "porterpo/dawnandron-blog-agent";
const HISTORY_PATH = "topics/history.json";

export interface TopicEntry {
  topic: string;
  pillar: string;
  date: string;
}

function headers() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fetchHistory(): Promise<{ entries: TopicEntry[]; sha?: string }> {
  const response = await fetch(`https://api.github.com/repos/${REPO}/contents/${HISTORY_PATH}`, {
    headers: headers(),
  });
  if (!response.ok) return { entries: [] };
  const data = (await response.json()) as { content: string; sha: string };
  const raw = JSON.parse(Buffer.from(data.content, "base64").toString("utf-8")) as unknown;

  // Support legacy string[] format
  const entries: TopicEntry[] = Array.isArray(raw)
    ? (raw as (string | TopicEntry)[]).map((item) =>
        typeof item === "string" ? { topic: item, pillar: "us-business-formation", date: "" } : item
      )
    : [];

  return { entries, sha: data.sha };
}

export async function getTopicHistory(): Promise<{ topics: string[]; lastPillar: string | null }> {
  const { entries } = await fetchHistory();
  const topics = entries.map((e) => e.topic);
  const lastPillar = entries.length > 0 ? entries[entries.length - 1].pillar : null;
  return { topics, lastPillar };
}

export async function addTopicToHistory(topic: string, pillar: string): Promise<void> {
  const { entries, sha } = await fetchHistory();

  entries.push({ topic, pillar, date: new Date().toISOString() });

  const content = Buffer.from(JSON.stringify(entries, null, 2)).toString("base64");

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
  console.log(`Topic history updated: "${topic}" (pillar: ${pillar})`);
}
