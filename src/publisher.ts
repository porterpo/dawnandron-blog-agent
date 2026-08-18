import type { GeneratedPost } from "./agent.js";

const MIME_TYPE = "image/jpeg";

export async function uploadImageToGCS(base64: string, apiUrl: string, apiKey: string): Promise<string> {
  const buffer = Buffer.from(base64, "base64");

  const requestUrlRes = await fetch(`${apiUrl}/api/uploads/request-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ name: `hero-${Date.now()}.jpg`, size: buffer.length, contentType: MIME_TYPE }),
  });
  if (!requestUrlRes.ok) throw new Error(`Upload URL request failed (${requestUrlRes.status}): ${await requestUrlRes.text()}`);

  const { uploadURL, objectPath } = await requestUrlRes.json();

  const putRes = await fetch(uploadURL, {
    method: "PUT",
    headers: { "Content-Type": MIME_TYPE },
    body: buffer,
  });
  if (!putRes.ok) throw new Error(`GCS upload failed (${putRes.status})`);

  console.log(`Hero image uploaded: ${objectPath}`);
  return objectPath;
}

export async function publishPost(post: GeneratedPost): Promise<void> {
  const apiUrl = process.env.DAWNANDRON_API_URL;
  const apiKey = process.env.DAWNANDRON_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("DAWNANDRON_API_URL and DAWNANDRON_API_KEY must be set");
  }

  const imageUrl = post.imageUrl;

  console.log(`\nPublishing "${post.title}" to ${apiUrl}...`);

  const response = await fetch(`${apiUrl}/api/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      title: post.title,
      slug: post.slug,
      content: post.content,
      imageUrl,
      publishedAt: new Date().toISOString(),
    }),
  });

  const contentType = response.headers.get("content-type") ?? "";
  const body = await response.text();

  console.log(`Response: ${response.status} ${response.statusText} (${contentType})`);
  console.log(`Body: ${body.slice(0, 300)}`);

  if (!response.ok || !contentType.includes("application/json")) {
    throw new Error(`Publish failed (${response.status}): ${body.slice(0, 500)}`);
  }

  console.log(`Post published successfully: ${post.slug}`);
}
