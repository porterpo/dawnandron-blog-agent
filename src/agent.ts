import Anthropic from "@anthropic-ai/sdk";
import { DAWN_AND_RON_BRAND_SYSTEM_PROMPT } from "./prompts/brandVoice.js";
import { getTopicPickerPrompt } from "./prompts/topicPrompt.js";
import { generateHeroImage } from "./imageGenerator.js";
import { getTopicHistory } from "./topicHistory.js";
import { researchTrendingTopics } from "./topicResearch.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_TOPIC_ATTEMPTS = 4;

export interface GeneratedPost {
  title: string;
  slug: string;
  content: string;
  imageUrl: string;
  topic: string;
  pillar: string;
}

async function checkDuplicateTopic(
  candidate: string,
  previousTopics: string[]
): Promise<{ isDuplicate: boolean; reason: string }> {
  if (previousTopics.length === 0) return { isDuplicate: false, reason: "" };

  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 200,
    messages: [{
      role: "user",
      content: `Already-published blog post topics:\n${previousTopics.map((t) => `- ${t}`).join("\n")}\n\nCandidate new topic:\n"${candidate}"\n\nIs the candidate substantively the same subject as one already published, even if reworded (same product comparison, same tax form, same visa, same guide, just phrased differently)? A different country, different specific product set, or a genuinely different angle counts as NOT a duplicate.\n\nRespond with ONLY JSON: {"isDuplicate": true or false, "reason": "one sentence"}`,
    }],
  });
  const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
  const text = raw.replace(/^```(?:json)?\n?/m, "").replace(/```$/m, "").trim();
  try {
    const parsed = JSON.parse(text) as { isDuplicate: boolean; reason: string };
    return { isDuplicate: Boolean(parsed.isDuplicate), reason: parsed.reason ?? "" };
  } catch {
    console.warn("Duplicate check: failed to parse response, assuming not a duplicate.");
    return { isDuplicate: false, reason: "" };
  }
}

export async function pickTopic(): Promise<{ topic: string; pillar: string }> {
  const [{ topics, lastPillar }, research] = await Promise.all([getTopicHistory(), researchTrendingTopics()]);

  const rejected: Array<{ topic: string; reason: string }> = [];
  for (let attempt = 1; attempt <= MAX_TOPIC_ATTEMPTS; attempt++) {
    const prompt = getTopicPickerPrompt(topics, lastPillar, research, rejected.map((r) => r.topic));

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 256,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";
    const text = raw.replace(/^```(?:json)?\n?/m, "").replace(/```$/m, "").trim();
    const parsed = JSON.parse(text) as { topic: string; angle: string; pillar: string };

    const { isDuplicate, reason } = await checkDuplicateTopic(parsed.topic, topics);
    if (!isDuplicate) {
      console.log(`Auto-selected topic: ${parsed.topic}`);
      console.log(`Pillar: ${parsed.pillar}`);
      console.log(`Angle: ${parsed.angle}`);
      return { topic: parsed.topic, pillar: parsed.pillar };
    }

    console.warn(`Rejected duplicate topic (attempt ${attempt}/${MAX_TOPIC_ATTEMPTS}): "${parsed.topic}" — ${reason}`);
    rejected.push({ topic: parsed.topic, reason });
  }

  const last = rejected[rejected.length - 1];
  throw new Error(
    `Topic picker could not find a non-duplicate topic after ${MAX_TOPIC_ATTEMPTS} attempts. Last rejected: "${last?.topic}" (${last?.reason})`
  );
}

export function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled Post";
}

export function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function generatePostContent(topic: string, pillar: string): Promise<GeneratedPost> {
  console.log(`\nGenerating post for topic: "${topic}"...`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: DAWN_AND_RON_BRAND_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Write a complete, publish-ready blog post about the following topic:\n\n${topic}`,
      },
    ],
  });

  const content = response.content[0].type === "text" ? response.content[0].text : "";
  const title = extractTitle(content);
  const slug = slugify(title);
  return { title, slug, content, imageUrl: "", topic, pillar };
}

export async function generatePost(topicOverride?: string, pillarOverride?: string): Promise<{ post: GeneratedPost; imageBuffer: Buffer }> {
  const { topic, pillar } = topicOverride
    ? { topic: topicOverride, pillar: pillarOverride ?? "unknown" }
    : await pickTopic();

  const post = await generatePostContent(topic, pillar);
  const { buffer } = await generateHeroImage(topic);
  return { post, imageBuffer: buffer };
}
