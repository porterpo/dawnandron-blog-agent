import "dotenv/config";
import cron from "node-cron";
import { generatePost } from "./agent.js";
import { publishPost } from "./publisher.js";
import { saveDraft, readDraft, deleteDraft } from "./draft.js";
import { sendDraftNotification } from "./telegram.js";

// Monday 9am EST (14:00 UTC) — generate draft, save to GitHub, notify via Telegram
cron.schedule("0 14 * * 1", async () => {
  console.log(`\n[${new Date().toISOString()}] Generating draft...`);
  try {
    const post = await generatePost();
    await saveDraft(post);
    await sendDraftNotification(post);
    console.log("Draft saved and sent to Telegram.");
  } catch (err) {
    console.error("Draft generation failed:", err);
  }
});

// Tuesday 9am EST (14:00 UTC) — publish draft if it exists
cron.schedule("0 14 * * 2", async () => {
  console.log(`\n[${new Date().toISOString()}] Checking for draft to publish...`);
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

console.log("Blog agent scheduler started. Drafts Monday 9am EST, publishes Tuesday 9am EST.");
