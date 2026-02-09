/**
 * Wrapper pour l'API SerpAPI — Analyse SERP Google
 * https://serpapi.com/search-api
 */

const SERPAPI_URL = "https://serpapi.com/search.json";

// --- Types de résultats ---

export interface SERPOrganicResult {
  position: number;
  title: string;
  link: string;
  snippet: string;
}

export interface SERPPeopleAlsoAsk {
  question: string;
  snippet: string;
  title: string;
  link: string;
}

export interface SERPAnswerBox {
  type: string;
  answer: string;
  source?: { title: string; link: string };
}

export interface SERPAnalysis {
  keyword: string;
  organicResults: SERPOrganicResult[];
  peopleAlsoAsk: SERPPeopleAlsoAsk[];
  answerBox: SERPAnswerBox | null;
  relatedSearches: string[];
  serpFeatures: string[];
  dominantFormats: string[];
}

interface SerpSearchOptions {
  query: string;
  /** Langue (défaut: "fr") */
  language?: string;
  /** Pays (défaut: "fr") */
  country?: string;
  /** Nombre de résultats (défaut: 10) */
  num?: number;
}

/**
 * Lance une recherche Google via SerpAPI
 */
export async function serpSearch(options: SerpSearchOptions) {
  const apiKey = process.env.SERPAPI;
  if (!apiKey) {
    throw new Error("SERPAPI non configurée dans .env");
  }

  const {
    query,
    language = "fr",
    country = "fr",
    num = 10,
  } = options;

  const params = new URLSearchParams({
    api_key: apiKey,
    q: query,
    engine: "google",
    hl: language,
    gl: country,
    google_domain: "google.fr",
    num: String(num),
  });

  const response = await fetch(`${SERPAPI_URL}?${params.toString()}`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SerpAPI error (${response.status}): ${errorText}`);
  }

  return response.json();
}

/**
 * Détecte les features SERP présentes dans la réponse
 */
function detectSerpFeatures(data: Record<string, unknown>): string[] {
  const features: string[] = [];

  if (data.answer_box) features.push("featured_snippet");
  if (data.knowledge_graph) features.push("knowledge_graph");
  if (Array.isArray(data.people_also_ask) && data.people_also_ask.length > 0)
    features.push("people_also_ask");
  if (Array.isArray(data.video_results) && data.video_results.length > 0)
    features.push("video_carousel");
  if (Array.isArray(data.shopping_results) && data.shopping_results.length > 0)
    features.push("shopping");
  if (Array.isArray(data.local_results) && (data.local_results as unknown[]).length > 0)
    features.push("local_pack");
  if (Array.isArray(data.top_stories) && data.top_stories.length > 0)
    features.push("top_stories");
  if (Array.isArray(data.images_results) && data.images_results.length > 0)
    features.push("image_pack");
  if (Array.isArray(data.related_searches) && data.related_searches.length > 0)
    features.push("related_searches");

  return features;
}

/**
 * Détecte les formats dominants dans les résultats organiques
 */
function detectDominantFormats(
  organicResults: SERPOrganicResult[]
): string[] {
  const formats = new Set<string>();

  for (const r of organicResults) {
    const titleLower = (r.title + " " + r.snippet).toLowerCase();

    if (/guide|tutoriel|comment|how to/.test(titleLower)) formats.add("guide");
    if (/\d+\s*(meilleur|top|best)|\btop\s*\d+/.test(titleLower)) formats.add("liste");
    if (/comparatif|compar|versus|vs\.?/.test(titleLower)) formats.add("comparatif");
    if (/avis|review|test/.test(titleLower)) formats.add("avis");
    if (/définition|c'est quoi|what is|qu'est/.test(titleLower)) formats.add("définition");
    if (/tableau|infograph|données/.test(titleLower)) formats.add("tableau");
    if (/vidéo|video|youtube/.test(titleLower)) formats.add("vidéo");
    if (/étape|step|tuto/.test(titleLower)) formats.add("tutoriel");
  }

  return [...formats];
}

/**
 * Analyse complète de la SERP pour un mot-clé
 */
export async function analyzeSERP(keyword: string): Promise<SERPAnalysis> {
  const data = await serpSearch({ query: keyword });

  // Résultats organiques
  const organicResults: SERPOrganicResult[] = (
    data.organic_results ?? []
  )
    .slice(0, 10)
    .map(
      (r: { position: number; title: string; link: string; snippet: string }) => ({
        position: r.position,
        title: r.title,
        link: r.link,
        snippet: r.snippet ?? "",
      })
    );

  // People Also Ask
  const peopleAlsoAsk: SERPPeopleAlsoAsk[] = (
    data.related_questions ?? data.people_also_ask ?? []
  ).map(
    (r: { question: string; snippet: string; title: string; link: string }) => ({
      question: r.question,
      snippet: r.snippet ?? "",
      title: r.title ?? "",
      link: r.link ?? "",
    })
  );

  // Answer Box / Featured Snippet
  let answerBox: SERPAnswerBox | null = null;
  if (data.answer_box) {
    const ab = data.answer_box as Record<string, unknown>;
    answerBox = {
      type: (ab.type as string) ?? "unknown",
      answer:
        (ab.answer as string) ??
        (ab.snippet as string) ??
        (ab.result as string) ??
        "",
      source: ab.link
        ? {
            title: (ab.displayed_link as string) ?? "",
            link: ab.link as string,
          }
        : undefined,
    };
  }

  // Recherches associées
  const relatedSearches: string[] = (data.related_searches ?? []).map(
    (r: { query: string }) => r.query
  );

  // Features détectées
  const serpFeatures = detectSerpFeatures(data);

  // Formats dominants
  const dominantFormats = detectDominantFormats(organicResults);

  return {
    keyword,
    organicResults,
    peopleAlsoAsk,
    answerBox,
    relatedSearches,
    serpFeatures,
    dominantFormats,
  };
}

/**
 * Formate l'analyse SERP en texte pour injection dans les prompts Claude
 */
export function formatSERPForPrompt(analysis: SERPAnalysis): string {
  const sections: string[] = [];

  // Features SERP
  if (analysis.serpFeatures.length > 0) {
    sections.push(
      `## Features SERP détectées\n${analysis.serpFeatures.join(", ")}`
    );
  }

  // Featured Snippet
  if (analysis.answerBox) {
    sections.push(
      `## Featured Snippet\nType : ${analysis.answerBox.type}\n${analysis.answerBox.answer}`
    );
  }

  // PAA
  if (analysis.peopleAlsoAsk.length > 0) {
    const paaText = analysis.peopleAlsoAsk
      .map((p) => `- ${p.question}`)
      .join("\n");
    sections.push(
      `## Questions fréquentes (People Also Ask)\n${paaText}`
    );
  }

  // Top concurrents
  if (analysis.organicResults.length > 0) {
    const competitorsText = analysis.organicResults
      .slice(0, 5)
      .map(
        (r) =>
          `${r.position}. ${r.title}\n   ${r.snippet}\n   Source : ${r.link}`
      )
      .join("\n\n");
    sections.push(`## Top concurrents SERP\n${competitorsText}`);
  }

  // Formats dominants
  if (analysis.dominantFormats.length > 0) {
    sections.push(
      `## Formats dominants\n${analysis.dominantFormats.join(", ")}`
    );
  }

  // Recherches associées
  if (analysis.relatedSearches.length > 0) {
    sections.push(
      `## Recherches associées\n${analysis.relatedSearches.join(", ")}`
    );
  }

  return sections.join("\n\n");
}
