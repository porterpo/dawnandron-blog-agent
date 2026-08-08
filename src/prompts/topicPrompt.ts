export function getTopicPickerPrompt(previousTopics: string[], research: string): string {
  const avoidSection =
    previousTopics.length > 0
      ? `\n\nPreviously published topics — do NOT repeat or create a closely similar angle for any of these:\n${previousTopics.map((t) => `- ${t}`).join("\n")}`
      : "";

  const researchSection = research
    ? `\n\nTrending questions and themes from current web research — use these to find timely, relevant angles:\n${research}`
    : "";

  return `You are an SEO strategist for Dawn & Ron (dawnandron.com), a site that serves non-U.S. residents, remote entrepreneurs, digital nomads, and travel enthusiasts.

Generate ONE blog post topic that:
- Has strong SEO potential (specific, searchable, long-tail friendly)
- Is timely and relevant based on the research provided
- Goes deeper than generic angles — find a specific, underserved question or angle
- Fits one of these content pillars:
  * US business formation for non-residents (LLC, EIN, bank accounts, payment processing)
  * Remote business operations and tools for global entrepreneurs
  * Tax and compliance basics for non-US residents running US businesses
  * Digital nomad lifestyle: productivity, routines, remote work tips
  * Travel: best destinations, visa guides, travel hacks, cost of living breakdowns
  * Banking and finances for nomads and travelers (cards, transfers, budgeting)
  * Health insurance and safety for international remote workers${avoidSection}${researchSection}

Respond with ONLY a JSON object in this format, no explanation:
{
  "topic": "the topic title",
  "angle": "one sentence describing the specific angle or audience"
}`;
}
