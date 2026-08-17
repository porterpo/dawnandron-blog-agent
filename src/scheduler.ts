import "dotenv/config";
import cron from "node-cron";
import { generatePost } from "./agent.js";
import { saveDraft, readDraft } from "./draft.js";
import { sendDraftNotification, sendTelegramMessage } from "./telegram.js";
import { startPolling } from "./telegramPoller.js";

// Monday 9am EST (14:00 UTC) — generate draft, save to GitHub, notify via Telegram, start polling
cron.schedule("0 14 * * 1", async () => {
  console.log(`\n[${new Date().toISOString()}] Generating draft...`);
  try {
    const { post, imageBuffer } = await generatePost();
    await saveDraft(post);
    await sendDraftNotification(post, imageBuffer);
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

// On startup, resume polling if a draft is already pending (e.g. after Railway restart)
void (async () => {
  const draft = await readDraft();
  if (draft) {
    console.log(`Found pending draft: "${draft.post.title}". Resuming Telegram polling.`);
    await startPolling();
  }
})();

console.log("Blog agent scheduler started. Drafts Monday 9am EST, publishes on approval via Telegram.");
