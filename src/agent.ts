import Anthropic from "@anthropic-ai/sdk";
import { DAWN_AND_RON_BRAND_SYSTEM_PROMPT } from "./prompts/brandVoice.js";
import { getTopicPickerPrompt } from "./prompts/topicPrompt.js";
import { generateHeroImage } from "./imageGenerator.js";
import { getTopicHistory } from "./topicHistory.js";
import { researchTrendingTopics } from "./topicResearch.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface GeneratedPost {
  title: string;
  slug: string;
  content: string;
  imageUrl: string;
  imageBase64?: string;
  topic: string;
}

async function pickTopic(): Promise<string> {
  const [history, research] = await Promise.all([getTopicHistory(), researchTrendingTopics()]);
  const prompt = getTopicPickerPrompt(history, research);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const text = raw.replace(/^```(?:json)?\n?/m, "").replace(/```$/m, "").trim();
  const parsed = JSON.parse(text);
  console.log(`Auto-selected topic: ${parsed.topic}`);
  console.log(`Angle: ${parsed.angle}`);
  return parsed.topic;
}

function extractTitle(markdown: string): string {
  const match = markdown.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : "Untitled Post";
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export async function generatePost(topicOverride?: string): Promise<{ post: GeneratedPost; imageBuffer: Buffer }> {
  const topic = topicOverride ?? (await pickTopic());

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

  const { buffer } = await generateHeroImage(topic);
  const post = { title, slug, content, imageUrl: "", imageBase64: buffer.toString("base64"), topic };
  return { post, imageBuffer: buffer };
}
