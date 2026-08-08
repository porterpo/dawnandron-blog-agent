import type { GeneratedPost } from "./agent.js";

export async function sendDraftNotification(post: GeneratedPost): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) throw new Error("TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID must be set");

  const preview = post.content.slice(0, 400);
  const message = [
    "📝 New Blog Draft Ready",
    "",
    `Title: ${post.title}`,
    "",
    "Preview:",
    preview + "...",
    "",
    "✅ Auto-publishes Tuesday 9am EST.",
    "❌ To cancel: delete draft/pending.json in GitHub before Tuesday.",
    "✏️ To edit: update draft/pending.json in GitHub before Tuesday.",
  ].join("\n");

  const msgResponse = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: message }),
  });
  if (!msgResponse.ok) throw new Error(`Telegram sendMessage error: ${await msgResponse.text()}`);

  const form = new FormData();
  form.append("chat_id", chatId);
  form.append("caption", "Full draft — review before Tuesday 9am EST");
  form.append("document", new Blob([post.content], { type: "text/plain" }), `${post.slug}.md`);

  const docResponse = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
    method: "POST",
    body: form,
  });
  if (!docResponse.ok) throw new Error(`Telegram sendDocument error: ${await docResponse.text()}`);

  console.log("Telegram notification sent.");
}
