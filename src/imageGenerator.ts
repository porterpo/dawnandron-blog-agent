import { buildImagePrompt } from "./prompts/imagePrompt.js";

const MIME_TYPE = "image/jpeg";
const GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image";

export async function generateHeroImage(topic: string): Promise<{ buffer: Buffer }> {
  const geminiKey = process.env.GEMINI_API_KEY;

  if (!geminiKey) throw new Error("GEMINI_API_KEY is not set");

  const prompt = buildImagePrompt(topic);
  console.log("\nGenerating hero image with Gemini...");

  const geminiRes = await fetch(
    `https://generativelanguage.googleapis.com/v1/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["IMAGE"] },
      }),
    }
  );

  if (!geminiRes.ok) throw new Error(`Gemini image error (${geminiRes.status}): ${await geminiRes.text()}`);

  const geminiData = await geminiRes.json() as {
    candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
  };

  const base64Data = geminiData.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;
  if (!base64Data) throw new Error("Gemini returned no image data");

  const buffer = Buffer.from(base64Data, "base64");
  console.log(`Image generated (${(buffer.length / 1024).toFixed(0)} KB).`);
  return { buffer };
}

