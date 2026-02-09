/**
 * Wrapper pour l'API Tavily - Recherche web pour IA
 * https://docs.tavily.com/docs/rest-api/api-reference
 */

const TAVILY_API_URL = "https://api.tavily.com";

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface TavilySearchResponse {
  query: string;
  results: TavilySearchResult[];
  answer?: string;
}

interface TavilySearchOptions {
  query: string;
  /** Nombre max de résultats (défaut: 5) */
  maxResults?: number;
  /** Inclure le contenu extrait des pages (défaut: true) */
  includeContent?: boolean;
  /** Profondeur de recherche : "basic" ou "advanced" (défaut: "advanced") */
  searchDepth?: "basic" | "advanced";
  /** Langue préférée pour les résultats */
  locale?: string;
}

/**
 * Lance une recherche web via Tavily et retourne les résultats avec contenu extrait
 */
export async function tavilySearch(
  options: TavilySearchOptions
): Promise<TavilySearchResponse> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY non configurée dans .env");
  }

  const {
    query,
    maxResults = 5,
    includeContent = true,
    searchDepth = "advanced",
  } = options;

  const response = await fetch(`${TAVILY_API_URL}/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      include_answer: true,
      include_raw_content: false,
      search_depth: searchDepth,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavily API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  return {
    query: data.query,
    answer: data.answer,
    results: (data.results ?? [])
      .slice(0, maxResults)
      .map((r: { title: string; url: string; content: string; score: number }) => ({
        title: r.title,
        url: r.url,
        content: includeContent ? r.content : "",
        score: r.score,
      })),
  };
}

/**
 * Formate les résultats Tavily en texte structuré pour injection dans un prompt
 */
export function formatSearchResults(response: TavilySearchResponse): string {
  const sections: string[] = [];

  if (response.answer) {
    sections.push(`## Synthèse rapide\n${response.answer}`);
  }

  sections.push(`## Sources web (${response.results.length} résultats)\n`);

  for (const result of response.results) {
    sections.push(
      `### ${result.title}\n` +
      `Source : ${result.url}\n` +
      `Pertinence : ${(result.score * 100).toFixed(0)}%\n\n` +
      `${result.content}\n`
    );
  }

  return sections.join("\n");
}
