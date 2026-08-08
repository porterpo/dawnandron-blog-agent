import "dotenv/config";
import cron from "node-cron";
import { generatePost } from "./agent.js";
import { publishPost } from "./publisher.js";
import { saveDraft, readDraft, deleteDraft } from "./draft.js";
import { sendDraftNotification } from "./telegram.js";
import { startPolling, stopPolling } from "./telegramPoller.js";

// Monday 9am EST (14:00 UTC) — generate draft, save to GitHub, notify via Telegram, start polling
cron.schedule("0 14 * * 1", async () => {
  console.log(`\n[${new Date().toISOString()}] Generating draft...`);
  try {
    const post = await generatePost();
    await saveDraft(post);
    await sendDraftNotification(post);
    await startPolling();
    console.log("Draft saved and sent to Telegram. Listening for replies.");
  } catch (err) {
    console.error("Draft generation failed:", err);
  }
});

// Tuesday 9am EST (14:00 UTC) — publish draft if it exists
cron.schedule("0 14 * * 2", async () => {
  console.log(`\n[${new Date().toISOString()}] Checking for draft to publish...`);
  stopPolling();
  try {
    const draft = await readDraft();
    if (!draft) {
      console.log("No draft found — nothing to publish this week.");
      return;
    }
    await publishPost(draft.post);
    await deleteDraft(draft.sha);
    console.log("Post published and draft cleaned up.");
  } catch (err) {
    console.error("Scheduled publish failed:", err);
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

console.log("Blog agent scheduler started. Drafts Monday 9am EST, publishes Tuesday 9am EST.");
