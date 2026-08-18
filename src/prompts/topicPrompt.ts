const CURRENT_YEAR = new Date().getFullYear();

export const CONTENT_PILLARS: Record<string, string> = {
  "us-business-formation": "US Business Formation & Operations — LLC, EIN, bank accounts, payment processing, compliance",
  "remote-operations": "Remote Business Tools & Operations — software, workflows, hiring, managing a remote business",
  "tax-compliance": "Tax & Compliance — tax basics, deductions, and filing for non-US residents running US businesses",
  "nomad-lifestyle": "Digital Nomad Lifestyle — productivity, routines, remote work tips, time zone management",
  "travel": "Travel & Destinations — best cities for nomads, visa guides, travel hacks, cost of living breakdowns",
  "nomad-banking": "Nomad Banking & Finances — cards, transfers, multi-currency accounts, budgeting abroad",
  "health-insurance": "Health Insurance & Safety — international health coverage, travel insurance, emergency planning",
};

export function getTopicPickerPrompt(
  previousTopics: string[],
  lastPillar: string | null,
  research: string
): string {
  const pillarList = Object.entries(CONTENT_PILLARS)
    .map(([key, desc]) => `  - ${key}: ${desc}`)
    .join("\n");

  const avoidSection =
    previousTopics.length > 0
      ? `\n\nPreviously published topics — do NOT repeat or create a closely similar angle for any of these:\n${previousTopics.map((t) => `- ${t}`).join("\n")}`
      : "";

  const pillarRotationSection = lastPillar
    ? `\n\nThe last post used the pillar: "${lastPillar}". You MUST pick a DIFFERENT pillar this time.`
    : "";

  const researchSection = research
    ? `\n\nTrending questions and themes from current web research — use these to find timely, relevant angles:\n${research}`
    : "";

  return `You are an SEO strategist for Dawn & Ron (dawnandron.com), a site that serves non-U.S. residents, remote entrepreneurs, digital nomads, and travel enthusiasts. The current year is ${CURRENT_YEAR} — all topic suggestions must be framed around ${CURRENT_YEAR} and must NOT reference ${CURRENT_YEAR - 1} as the current year.

Generate ONE blog post topic. You must choose from one of these content pillars:
${pillarList}${pillarRotationSection}${avoidSection}${researchSection}

The topic must:
- Have strong SEO potential (specific, searchable, long-tail friendly)
- Be timely and relevant based on the research provided
- Go deeper than generic angles — find a specific, underserved question or angle

Respond with ONLY a JSON object in this format, no explanation:
{
  "topic": "the topic title",
  "angle": "one sentence describing the specific angle or audience",
  "pillar": "the pillar key chosen from the list above"
}`;
}
