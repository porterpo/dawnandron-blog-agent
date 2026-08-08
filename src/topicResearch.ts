interface TavilyResult {
  title: string;
  content: string;
}

interface TavilyResponse {
  results: TavilyResult[];
}

async function searchTavily(query: string): Promise<string[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      search_depth: "basic",
      max_results: 5,
    }),
  });

  if (!response.ok) throw new Error(`Tavily search error: ${await response.text()}`);
  const data = (await response.json()) as TavilyResponse;
  return data.results.map((r) => `- ${r.title}: ${r.content.slice(0, 200)}`);
}

export async function researchTrendingTopics(): Promise<string> {
  const queries = [
    "non-US resident open US LLC bank account questions 2024",
    "global entrepreneur US business formation common problems",
    "digital nomad lifestyle travel tips remote work trending",
    "best countries digital nomads 2024 visa banking",
  ];

  const sections: string[] = [];

  for (const query of queries) {
    try {
      const snippets = await searchTavily(query);
      sections.push(`Search: "${query}"\n${snippets.join("\n")}`);
    } catch (err) {
      console.warn(`Search failed for "${query}":`, err);
    }
  }

  return sections.join("\n\n");
}
