import "dotenv/config";
import cron from "node-cron";
import { pickTopic, generatePostContent } from "./agent.js";
import { generateHeroImage } from "./imageGenerator.js";
import { saveDraft, readDraft } from "./draft.js";
import { sendDraftNotification, sendTelegramMessage } from "./telegram.js";
import { startPolling } from "./telegramPoller.js";
import { factCheckAndCorrect } from "./factChecker.js";

async function stage<T>(name: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const inner = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && err.cause ? ` (cause: ${String((err.cause as Error).message ?? err.cause)})` : "";
    const wrapped = new Error(`[${name}] ${inner}${cause}`);
    (wrapped as Error & { cause?: unknown }).cause = err;
    throw wrapped;
  }
}

// Monday 9am EST (14:00 UTC) — generate draft, save to GitHub, notify via Telegram, start polling
cron.schedule("0 14 * * 1", async () => {
  console.log(`\n[${new Date().toISOString()}] Generating draft...`);
  try {
    const { topic, pillar } = await stage("pick-topic", () => pickTopic());
    const post = await stage("generate-content", () => generatePostContent(topic, pillar));
    const factCheck = await stage("fact-check", () => factCheckAndCorrect(post));
    const { buffer: imageBuffer } = await stage("generate-image", () => generateHeroImage(topic));
    await stage("save-draft", () => saveDraft(factCheck.post));
    await stage("notify-telegram", () => sendDraftNotification(factCheck.post, imageBuffer, factCheck));
    await startPolling();
    console.log("Draft saved and sent to Telegram. Listening for replies.");
  } catch (err) {
    console.error("Draft generation failed:", err);
    const message = err instanceof Error ? err.message : String(err);
    try {
      await sendTelegramMessage(`Draft generation failed:\n${message}`);
    } catch {
      console.error("Failed to send Telegram error notification");
    }
  }
});

// Always start polling on startup so Telegram commands are handled at any time
void (async () => {
  try {
    const draft = await readDraft();
    if (draft) {
      console.log(`Found pending draft: "${draft.post.title}".`);
    }
  } catch (err) {
    console.error("Failed to read draft on startup:", err);
  }
  await startPolling();
})();

console.log("Blog agent scheduler started. Drafts Monday 9am EST, publishes on approval via Telegram.");
