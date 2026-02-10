/**
 * Analyse sémantique : extraction de termes et comparaison plan vs concurrents.
 */

import type { PlanHeading } from "./parser";

export interface SemanticTerm {
  term: string;
  source: "plan" | "competitor" | "both";
  competitorCount: number;
  planHeading?: string; // H2 du plan qui contient ce terme
}

// Stop words français courants à ignorer
const STOP_WORDS = new Set([
  "le", "la", "les", "de", "du", "des", "un", "une", "et", "ou", "en",
  "à", "au", "aux", "ce", "ces", "cet", "cette", "son", "sa", "ses",
  "mon", "ma", "mes", "ton", "ta", "tes", "sur", "dans", "par", "pour",
  "avec", "sans", "qui", "que", "quoi", "dont", "où", "est", "sont",
  "être", "avoir", "faire", "plus", "moins", "très", "bien", "mal",
  "tout", "tous", "toute", "toutes", "autre", "autres", "même", "aussi",
  "pas", "ne", "non", "oui", "si", "car", "mais", "donc", "ni",
  "il", "elle", "ils", "elles", "nous", "vous", "on", "se",
  "the", "a", "an", "and", "or", "in", "on", "at", "to", "for", "of",
  "is", "are", "was", "were", "be", "been", "has", "have", "had",
  "not", "no", "yes", "with", "from", "by", "this", "that", "these",
  "h1", "h2", "h3", "h4", "faq",
]);

/**
 * Normalise un texte : minuscule, supprime ponctuation, éclate en mots.
 */
export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Supprimer les accents pour normaliser
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

/**
 * Extrait les N-grams (1 à maxN mots) significatifs d'un texte.
 */
function extractNgrams(text: string, maxN: number = 2): string[] {
  const words = tokenize(text);
  const ngrams: string[] = [];

  for (let n = 1; n <= maxN; n++) {
    for (let i = 0; i <= words.length - n; i++) {
      const gram = words.slice(i, i + n).join(" ");
      ngrams.push(gram);
    }
  }

  return ngrams;
}

/**
 * Extrait les termes sémantiques du plan et les compare aux concurrents.
 */
export function extractSemanticTerms(
  planHeadings: PlanHeading[],
  competitorData: { title: string; snippet: string }[]
): SemanticTerm[] {
  // Extraire les termes du plan (H2+ seulement)
  const planTerms = new Map<string, string>(); // term → heading text
  for (const h of planHeadings) {
    if (h.level < 2) continue;
    const ngrams = extractNgrams(h.text, 2);
    for (const gram of ngrams) {
      if (!planTerms.has(gram)) {
        planTerms.set(gram, h.text);
      }
    }
  }

  // Extraire les termes des concurrents
  const competitorTerms = new Map<string, number>(); // term → count
  for (const comp of competitorData) {
    const text = `${comp.title} ${comp.snippet}`;
    const ngrams = extractNgrams(text, 2);
    const seen = new Set<string>();
    for (const gram of ngrams) {
      if (!seen.has(gram)) {
        seen.add(gram);
        competitorTerms.set(gram, (competitorTerms.get(gram) || 0) + 1);
      }
    }
  }

  // Fusionner et classifier
  const allTerms = new Set([...planTerms.keys(), ...competitorTerms.keys()]);
  const results: SemanticTerm[] = [];

  for (const term of allTerms) {
    const inPlan = planTerms.has(term);
    const compCount = competitorTerms.get(term) || 0;
    const inCompetitor = compCount > 0;

    // Filtrer : ne garder que les termes présents chez >= 2 concurrents OU dans le plan
    if (!inPlan && compCount < 2) continue;

    let source: SemanticTerm["source"];
    if (inPlan && inCompetitor) source = "both";
    else if (inPlan) source = "plan";
    else source = "competitor";

    results.push({
      term,
      source,
      competitorCount: compCount,
      planHeading: planTerms.get(term),
    });
  }

  // Trier : manquants d'abord (les plus présents chez concurrents), puis couverts, puis uniques
  results.sort((a, b) => {
    const order = { competitor: 0, both: 1, plan: 2 };
    if (order[a.source] !== order[b.source]) return order[a.source] - order[b.source];
    return b.competitorCount - a.competitorCount;
  });

  return results;
}

/**
 * Calcule le score d'unicité du plan (% de termes uniques vs total).
 */
export function computeUniquenessScore(terms: SemanticTerm[]): number {
  if (terms.length === 0) return 0;
  const planTerms = terms.filter((t) => t.source === "plan" || t.source === "both");
  if (planTerms.length === 0) return 0;
  const unique = planTerms.filter((t) => t.source === "plan").length;
  return Math.round((unique / planTerms.length) * 100);
}
