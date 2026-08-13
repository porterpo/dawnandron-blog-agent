import type { GeneratedPost } from "./agent.js";

function token() {
  const t = process.env.TELEGRAM_BOT_TOKEN;
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN not set");
  return t;
}

function chatId() {
  const id = process.env.TELEGRAM_CHAT_ID;
  if (!id) throw new Error("TELEGRAM_CHAT_ID not set");
  return id;
}

async function telegramPost(method: string, body: BodyInit, headers?: HeadersInit): Promise<void> {
  const response = await fetch(`https://api.telegram.org/bot${token()}/${method}`, {
    method: "POST",
    headers,
    body,
  });
  if (!response.ok) throw new Error(`Telegram ${method} error: ${await response.text()}`);
}

export async function sendTelegramMessage(text: string): Promise<void> {
  await telegramPost(
    "sendMessage",
    JSON.stringify({ chat_id: chatId(), text }),
    { "Content-Type": "application/json" }
  );
}

export async function sendDraftFile(post: GeneratedPost): Promise<void> {
  const form = new FormData();
  form.append("chat_id", chatId());
  form.append("caption", "Full draft — review before Tuesday 9am EST");
  form.append("document", new Blob([post.content], { type: "text/plain" }), `${post.slug}.md`);
  await telegramPost("sendDocument", form);
}

export async function sendDraftImage(buffer: Buffer): Promise<void> {
  const form = new FormData();
  form.append("chat_id", chatId());
  form.append("photo", new Blob([new Uint8Array(buffer)], { type: "image/jpeg" }), "hero.jpg");
  await telegramPost("sendPhoto", form);
}

export async function sendDraftNotification(post: GeneratedPost, imageBuffer: Buffer): Promise<void> {
  const preview = post.content.slice(0, 400);
  const message = [
    "📝 New Blog Draft Ready",
    "",
    `Title: ${post.title}`,
    "",
    "Preview:",
    preview + "...",
    "",
    "Commands:",
    "✏️ Reply with any edit request to update the draft",
    "🔄 Reply 'newtopic' to pick a completely new topic",
    "💡 Reply 'topic: your idea' to use your own topic",
    "❌ Reply 'cancel' to skip this week's post",
    "📋 Reply 'status' to check what's pending",
    "",
    "Auto-publishes Tuesday 9am EST.",
  ].join("\n");

  await sendDraftImage(imageBuffer);
  await sendTelegramMessage(message);
  await sendDraftFile(post);
  console.log("Telegram notification sent.");
}
