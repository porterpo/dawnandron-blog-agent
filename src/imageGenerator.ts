import { GoogleGenAI } from "@google/genai";
import { buildImagePrompt } from "./prompts/imagePrompt.js";

const MIME_TYPE = "image/jpeg";

export async function generateHeroImage(topic: string): Promise<{ objectPath: string; buffer: Buffer }> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const apiUrl = process.env.DAWNANDRON_API_URL;
  const apiKey = process.env.DAWNANDRON_API_KEY;

  if (!geminiKey) throw new Error("GEMINI_API_KEY is not set");
  if (!apiUrl) throw new Error("DAWNANDRON_API_URL is not set");
  if (!apiKey) throw new Error("DAWNANDRON_API_KEY is not set");

  const prompt = buildImagePrompt(topic);
  console.log("\nGenerating hero image with Gemini Imagen 3...");

  const ai = new GoogleGenAI({ apiKey: geminiKey });
  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-002",
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "16:9",
      outputMimeType: MIME_TYPE,
    },
  });

  const base64Data = response.generatedImages?.[0]?.image?.imageBytes;
  if (!base64Data) throw new Error("Gemini returned no image data");

  const buffer = Buffer.from(base64Data, "base64");
  console.log(`Image generated (${(buffer.length / 1024).toFixed(0)} KB). Uploading to GCS...`);

  const requestUrlRes = await fetch(`${apiUrl}/api/uploads/request-url`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      name: `hero-${Date.now()}.jpg`,
      size: buffer.length,
      contentType: MIME_TYPE,
    }),
  });

  if (!requestUrlRes.ok) {
    const body = await requestUrlRes.text();
    throw new Error(`Upload URL request failed (${requestUrlRes.status}): ${body}`);
  }

  const { uploadURL, objectPath } = await requestUrlRes.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": MIME_TYPE },
    body: buffer,
  });

  if (!putRes.ok) {
    throw new Error(`GCS upload failed (${putRes.status})`);
  }

  console.log(`Hero image uploaded: ${objectPath}`);
  return { objectPath, buffer };
}

