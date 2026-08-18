import "dotenv/config";
import { generatePost } from "./agent.js";
import { publishPost } from "./publisher.js";
import { saveDraft, readDraft, deleteDraft } from "./draft.js";
import { sendDraftNotification } from "./telegram.js";

async function run() {
  const args = process.argv.slice(2);
  const mode = args[0] ?? "full";

  if (mode === "draft") {
    const topicFlag = args.indexOf("--topic");
    const topic = topicFlag !== -1 ? args[topicFlag + 1] : undefined;
    const { post, imageBuffer } = await generatePost(topic);
    await saveDraft(post);
    await sendDraftNotification(post, imageBuffer);
    console.log("Draft saved and sent to Telegram.");
  } else if (mode === "publish") {
    const draft = await readDraft();
    if (!draft) { console.log("No draft found."); return; }
    await publishPost(draft.post);
    await deleteDraft(draft.sha);
  } else {
    const topicFlag = args.indexOf("--topic");
    const topic = topicFlag !== -1 ? args[topicFlag + 1] : undefined;
    const { post } = await generatePost(topic);
    await publishPost(post);
  }
}

run().catch((err) => {
  console.error("Agent error:", err);
  process.exit(1);
});
