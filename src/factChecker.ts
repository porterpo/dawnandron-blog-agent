import Anthropic from "@anthropic-ai/sdk";
import type { GeneratedPost } from "./agent.js";
import { extractTitle, slugify } from "./agent.js";
import { DAWN_AND_RON_BRAND_SYSTEM_PROMPT } from "./prompts/brandVoice.js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TavilyResult {
  title: string;
  url: string;
  content: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

async function tavilySearch(query: string): Promise<TavilyResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) throw new Error("TAVILY_API_KEY not set");
  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ api_key: apiKey, query, search_depth: "basic", max_results: 5 }),
  });
  if (!response.ok) throw new Error(`Tavily error: ${await response.text()}`);
  const data = (await response.json()) as TavilyResponse;
  return data.results ?? [];
}

function parseJsonArray<T>(raw: string): T[] {
  const text = raw.replace(/^```(?:json)?\n?/m, "").replace(/```$/m, "").trim();
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

async function extractClaims(content: string): Promise<string[]> {
  const currentYear = new Date().getFullYear();
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    messages: [{
      role: "user",
      content: `Extract every specific factual claim in this blog post that could be wrong and must be verified before publishing. Focus on:
- Laws, regulations, or government rules (e.g. FinCEN, IRS, visa rules)
- Filing deadlines and effective dates
- Penalties, fines, or fees (any dollar amounts)
- Prices, subscription costs, transfer fees
- "As of ${currentYear}" claims or dated statements
- Product or service specifics (features, availability, limits)
- Numeric statistics

Skip generic advice, opinions, or common knowledge. Each claim must be self-contained (not require reading surrounding text to understand). Return no more than 20 of the most consequential claims.

Return ONLY a JSON array of strings. If nothing needs checking, return [].

Blog post:
"""
${content}
"""`,
    }],
  });
  const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    return parseJsonArray<string>(raw).filter((c) => typeof c === "string");
  } catch {
    console.warn("Fact-check: failed to parse claims JSON.");
    return [];
  }
}

interface Verification {
  claim: string;
  verdict: "confirmed" | "contradicted" | "uncertain";
  evidence: string;
  correction?: string;
}

async function verifyClaims(claims: string[]): Promise<Verification[]> {
  if (claims.length === 0) return [];

  const claimEvidence: Array<{ claim: string; snippets: string }> = [];
  for (const claim of claims) {
    try {
      const results = await tavilySearch(claim);
      const snippets = results
        .map((r, i) => `[${i + 1}] ${r.title} (${r.url})\n${r.content.slice(0, 400)}`)
        .join("\n\n");
      claimEvidence.push({ claim, snippets: snippets || "(no search results)" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`Fact-check search failed for claim: ${msg}`);
      claimEvidence.push({ claim, snippets: "(search failed)" });
    }
  }

  const bundle = claimEvidence
    .map((e, i) => `Claim ${i + 1}: ${e.claim}\nEvidence:\n${e.snippets}`)
    .join("\n\n---\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2048,
    messages: [{
      role: "user",
      content: `You are fact-checking claims in a blog post using web search results.

For each claim, decide:
- "confirmed" if search results clearly support it
- "contradicted" if search results clearly refute it (include a specific correction and cite the source)
- "uncertain" if evidence is missing, mixed, or unclear

Be conservative. Only mark "contradicted" when at least one specific search result directly refutes the claim AND you can state the correct fact. Absence of evidence is "uncertain", not "contradicted".

Return ONLY a JSON array, one entry per claim in the same order:
[{"claim": "...", "verdict": "confirmed"|"contradicted"|"uncertain", "evidence": "one sentence citing the specific source", "correction": "the corrected fact (only if contradicted)"}]

${bundle}`,
    }],
  });
  const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    return parseJsonArray<Verification>(raw);
  } catch {
    console.warn("Fact-check: failed to parse verification JSON.");
    return [];
  }
}

async function rewriteWithCorrections(post: GeneratedPost, contradicted: Verification[]): Promise<string> {
  const corrections = contradicted
    .map((v, i) => `${i + 1}. Wrong claim: ${v.claim}\n   Correct fact: ${v.correction}\n   Source: ${v.evidence}`)
    .join("\n\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4096,
    system: DAWN_AND_RON_BRAND_SYSTEM_PROMPT,
    messages: [{
      role: "user",
      content: `Rewrite this blog post to fix these specific inaccuracies. Keep the same overall topic, structure, tone, and target length (600 to 900 words). You may adjust the title, remove sections rendered irrelevant by corrections, or restructure paragraphs, but do not introduce unrelated new topics. Follow the brand voice rules (no em or en dashes, proper punctuation, reads human).

Corrections required:
${corrections}

Original post:
"""
${post.content}
"""

Return only the full corrected markdown, starting with the H1 title.`,
    }],
  });
  const text = response.content[0].type === "text" ? response.content[0].text : post.content;
  return text.trim();
}

export interface FactCheckResult {
  post: GeneratedPost;
  corrections: Array<{ was: string; now: string }>;
  uncertain: string[];
  rewritten: boolean;
}

export async function factCheckAndCorrect(post: GeneratedPost): Promise<FactCheckResult> {
  console.log("\nFact-checking draft...");

  let claims: string[];
  try {
    claims = await extractClaims(post.content);
  } catch (err) {
    console.warn("Fact-check extraction failed, skipping:", err);
    return { post, corrections: [], uncertain: [], rewritten: false };
  }
  console.log(`Extracted ${claims.length} claim(s) to verify.`);
  if (claims.length === 0) {
    return { post, corrections: [], uncertain: [], rewritten: false };
  }

  let verifications: Verification[];
  try {
    verifications = await verifyClaims(claims);
  } catch (err) {
    console.warn("Fact-check verification failed, skipping:", err);
    return { post, corrections: [], uncertain: [], rewritten: false };
  }

  const contradicted = verifications.filter((v) => v.verdict === "contradicted" && v.correction);
  const uncertain = verifications
    .filter((v) => v.verdict === "uncertain")
    .map((v) => v.claim);
  const confirmedCount = verifications.length - contradicted.length - uncertain.length;

  console.log(`Fact-check: ${confirmedCount} confirmed, ${contradicted.length} contradicted, ${uncertain.length} uncertain.`);

  if (contradicted.length === 0) {
    return { post, corrections: [], uncertain, rewritten: false };
  }

  let rewritten: string;
  try {
    rewritten = await rewriteWithCorrections(post, contradicted);
  } catch (err) {
    console.warn("Fact-check rewrite failed, keeping original post:", err);
    return { post, corrections: [], uncertain, rewritten: false };
  }

  const newTitle = extractTitle(rewritten);
  const corrected: GeneratedPost = {
    ...post,
    title: newTitle,
    slug: slugify(newTitle),
    content: rewritten,
  };

  return {
    post: corrected,
    corrections: contradicted.map((v) => ({ was: v.claim, now: v.correction ?? "" })),
    uncertain,
    rewritten: true,
  };
}
