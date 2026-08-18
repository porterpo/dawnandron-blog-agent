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
  const currentYear = new Date().getFullYear();
  const queries = [
    `US LLC formation non-residents questions ${currentYear}`,
    `digital nomad best destinations ${currentYear} visa cost of living`,
    `remote work productivity routines tips ${currentYear}`,
    `nomad banking multi-currency cards international transfers ${currentYear}`,
    `travel hacks budget travel remote workers ${currentYear}`,
    `non-US resident US business tax compliance ${currentYear}`,
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
