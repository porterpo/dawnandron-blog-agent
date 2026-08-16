import Anthropic from "@anthropic-ai/sdk";
import { DAWN_AND_RON_BRAND_SYSTEM_PROMPT } from "./prompts/brandVoice.js";
import { readDraft, saveDraft, deleteDraft } from "./draft.js";
import { sendTelegramMessage, sendDraftFile, sendDraftImage } from "./telegram.js";
import { generatePost } from "./agent.js";
import { publishPost } from "./publisher.js";
import { addTopicToHistory } from "./topicHistory.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TelegramUpdate {
  update_id: number;
  message?: {
    text?: string;
    chat: { id: number };
  };
}

let pollingActive = false;
let pollingOffset = 0;

async function getUpdates(offset: number, timeout = 30): Promise<TelegramUpdate[]> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), (timeout + 5) * 1000);
    const response = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=${timeout}`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!response.ok) return [];
    const data = (await response.json()) as { ok: boolean; result: TelegramUpdate[] };
    return data.result ?? [];
  } catch {
    return [];
  }
}

async function applyEdit(content: string, editRequest: string): Promise<string> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: DAWN_AND_RON_BRAND_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Here is a blog post draft:\n\n${content}\n\nApply this edit request and return the complete updated post only, no explanation:\n\n${editRequest}`,
      },
    ],
  });
  return response.content[0].type === "text" ? response.content[0].text : content;
}

async function handleMessage(text: string): Promise<void> {
  const lower = text.trim().toLowerCase();

  if (lower === "approve") {
    const draft = await readDraft();
    if (!draft) {
      await sendTelegramMessage("No draft found to approve.");
      return;
    }
    await sendTelegramMessage("🚀 Publishing now...");
    try {
      await publishPost(draft.post);
      await addTopicToHistory(draft.post.topic);
      await deleteDraft(draft.sha);
      stopPolling();
      await sendTelegramMessage(`✅ Published: "${draft.post.title}"`);
    } catch (err) {
      await sendTelegramMessage("❌ Publish failed. Please try again.");
      console.error("Approve publish error:", err);
    }
    return;
  }

  if (lower === "cancel") {
    const draft = await readDraft();
    if (!draft) {
      await sendTelegramMessage("No draft found to cancel.");
      return;
    }
    await deleteDraft(draft.sha);
    stopPolling();
    await sendTelegramMessage("❌ Draft cancelled.");
    return;
  }

  if (lower === "status") {
    const draft = await readDraft();
    if (draft) {
      await sendTelegramMessage(`✅ Draft pending: "${draft.post.title}"\nReply "approve" to publish.`);
    } else {
      await sendTelegramMessage("No draft found. Nothing scheduled to publish.");
    }
    return;
  }

  if (lower === "newtopic") {
    const draft = await readDraft();
    if (!draft) {
      await sendTelegramMessage("No draft found.");
      return;
    }
    await sendTelegramMessage("🔄 Picking a new topic and regenerating the draft...");
    try {
      await deleteDraft(draft.sha);
      const { post: newPost, imageBuffer } = await generatePost();
      await saveDraft(newPost);
      await sendDraftImage(imageBuffer);
      await sendTelegramMessage(`✅ New draft ready!\n\nTitle: ${newPost.title}\n\nReply "approve" to publish.`);
      await sendDraftFile(newPost);
    } catch (err) {
      await sendTelegramMessage("❌ Failed to generate new topic. Please try again.");
      console.error("New topic error:", err);
    }
    return;
  }

  if (lower.startsWith("topic:")) {
    const customTopic = text.slice("topic:".length).trim();
    if (!customTopic) {
      await sendTelegramMessage('Please provide a topic after "topic:"\nExample: topic: Best countries for digital nomads in 2024');
      return;
    }
    const draft = await readDraft();
    if (!draft) {
      await sendTelegramMessage("No draft found.");
      return;
    }
    await sendTelegramMessage(`🔄 Generating a new draft for: "${customTopic}"...`);
    try {
      await deleteDraft(draft.sha);
      const { post: newPost, imageBuffer } = await generatePost(customTopic);
      await saveDraft(newPost);
      await sendDraftImage(imageBuffer);
      await sendTelegramMessage(`✅ New draft ready!\n\nTitle: ${newPost.title}\n\nReply "approve" to publish.`);
      await sendDraftFile(newPost);
    } catch (err) {
      await sendTelegramMessage("❌ Failed to generate draft. Please try again.");
      console.error("Custom topic error:", err);
    }
    return;
  }

  // Any other message is treated as an edit request
  const draft = await readDraft();
  if (!draft) {
    await sendTelegramMessage("No draft found to edit.");
    return;
  }

  await sendTelegramMessage("✏️ Applying your edit...");
  try {
    const updatedContent = await applyEdit(draft.post.content, text);
    draft.post.content = updatedContent;
    await saveDraft(draft.post);
    await sendTelegramMessage("✅ Draft updated! Here's the revised version:");
    await sendDraftFile(draft.post);
  } catch (err) {
    await sendTelegramMessage("❌ Failed to apply edit. Please try again.");
    console.error("Edit error:", err);
  }
}

export async function startPolling(): Promise<void> {
  if (pollingActive) return;
  pollingActive = true;

  // Skip messages that arrived before polling started
  const initial = await getUpdates(pollingOffset, 0);
  if (initial.length > 0) {
    pollingOffset = initial[initial.length - 1].update_id + 1;
  }

  console.log("Telegram polling started.");
  const authorizedChatId = process.env.TELEGRAM_CHAT_ID;

  void (async () => {
    while (pollingActive) {
      const updates = await getUpdates(pollingOffset);
      for (const update of updates) {
        pollingOffset = update.update_id + 1;
        const text = update.message?.text;
        const fromChat = update.message?.chat.id.toString();
        if (text && fromChat === authorizedChatId) {
          await handleMessage(text);
        }
      }
    }
    console.log("Telegram polling stopped.");
  })();
}

export function stopPolling(): void {
  pollingActive = false;
}
