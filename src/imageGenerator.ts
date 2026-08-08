import { buildImagePrompt } from "./prompts/imagePrompt.js";

const REPLICATE_API = "https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions";

interface ReplicatePrediction {
  id: string;
  status: "starting" | "processing" | "succeeded" | "failed" | "canceled";
  output: string[] | null;
  error: string | null;
  urls: { get: string };
}

async function poll(url: string, apiKey: string): Promise<ReplicatePrediction> {
  while (true) {
    await new Promise((r) => setTimeout(r, 1500));
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data: ReplicatePrediction = await res.json();
    if (data.status === "succeeded" || data.status === "failed" || data.status === "canceled") {
      return data;
    }
  }
}

export async function generateHeroImage(topic: string): Promise<string> {
  const apiKey = process.env.REPLICATE_API_KEY;
  if (!apiKey) throw new Error("REPLICATE_API_KEY is not set");

  const prompt = buildImagePrompt(topic);
  console.log("\nGenerating hero image...");

  const createRes = await fetch(REPLICATE_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      input: {
        prompt,
        num_outputs: 1,
        aspect_ratio: "16:9",
        output_format: "webp",
        output_quality: 80,
      },
    }),
  });

  const rawBody = await createRes.text();
  console.log(`Replicate response status: ${createRes.status}`);
  console.log(`Replicate raw body: ${rawBody.slice(0, 500)}`);

  if (!createRes.ok) {
    throw new Error(`Replicate API error (${createRes.status}): ${rawBody}`);
  }

  let prediction: ReplicatePrediction;
  try {
    prediction = JSON.parse(rawBody);
  } catch {
    throw new Error(`Replicate returned non-JSON (${createRes.status}): ${rawBody.slice(0, 500)}`);
  }

  if (prediction.error) {
    throw new Error(`Replicate prediction error: ${prediction.error}`);
  }

  if (prediction.status !== "succeeded") {
    if (!prediction.urls?.get) {
      throw new Error(`Unexpected Replicate response: ${JSON.stringify(prediction)}`);
    }
    prediction = await poll(prediction.urls.get, apiKey);
  }

  if (prediction.status !== "succeeded" || !prediction.output?.[0]) {
    throw new Error(`Image generation failed: ${prediction.error ?? "unknown error"}`);
  }

  const imageUrl = prediction.output[0];
  console.log(`Hero image ready: ${imageUrl}`);
  return imageUrl;
}
