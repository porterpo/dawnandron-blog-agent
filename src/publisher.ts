import type { GeneratedPost } from "./agent.js";

export async function publishPost(post: GeneratedPost): Promise<void> {
  const apiUrl = process.env.DAWNANDRON_API_URL;
  const apiKey = process.env.DAWNANDRON_API_KEY;

  if (!apiUrl || !apiKey) {
    throw new Error("DAWNANDRON_API_URL and DAWNANDRON_API_KEY must be set");
  }

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
      imageUrl: post.imageUrl,
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
