export function buildImageDescriptionPrompt(topic: string): string {
  return `You are a creative director briefing an AI image generator for a blog hero image.

The blog post topic is: "${topic}"

Write a vivid, specific image description that:
- Depicts a scene, setting, or subject DIRECTLY related to this specific topic (not generic business/office imagery)
- Avoids clichés like "person at laptop", "woman at desk", "office meeting room"
- Uses concrete visual details: location, lighting, colors, mood, foreground/background elements
- Fits a wide landscape hero image format
- Describes a realistic, photographable scene (real locations, real people, real objects — nothing stylized or illustrated)
- Contains NO text, letters, words, or numbers in the scene

Respond with ONLY the image description, no explanation. 2-4 sentences max.`;
}

export function wrapImagePrompt(description: string): string {
  return `${description}

Style: photorealistic, high-resolution editorial photography. Natural lighting, true-to-life colors, real-world settings. Wide landscape format, sharp focus. No illustrations, no flat design, no cartoons, no digital art. No text, no letters, no words, no numbers anywhere in the image.`;
}
