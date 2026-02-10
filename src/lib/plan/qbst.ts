/**
 * QBST (Query-Based Salient Terms) — extraction de termes saillants par section.
 */

import { tokenize } from "./semantic";
import type { PlanSection } from "./sections";

export interface SectionQBST {
  sectionIndex: number;
  terms: string[];
}

/**
 * Extrait les termes saillants pour chaque section du plan.
 * Les termes sont issus du croisement SERP + recherche + PAA,
 * puis matchés à chaque section par pertinence sémantique.
 */
export function extractQBSTForSections(
  sections: PlanSection[],
  competitorData: { title: string; snippet: string }[],
  researchText: string,
  paaQuestions: string[]
): SectionQBST[] {
  // 1. Construire le corpus de termes saillants avec scores
  const termScores = new Map<string, number>();

  // Termes des concurrents (poids fort)
  for (const comp of competitorData) {
    const tokens = tokenize(`${comp.title} ${comp.snippet}`);
    for (const t of tokens) {
      termScores.set(t, (termScores.get(t) || 0) + 2);
    }
  }

  // Termes PAA (poids fort)
  for (const q of paaQuestions) {
    const tokens = tokenize(q);
    for (const t of tokens) {
      termScores.set(t, (termScores.get(t) || 0) + 3);
    }
  }

  // Termes de la recherche (poids moyen)
  const researchTokens = tokenize(researchText);
  const seen = new Set<string>();
  for (const t of researchTokens) {
    if (!seen.has(t)) {
      seen.add(t);
      termScores.set(t, (termScores.get(t) || 0) + 1);
    }
  }

  // Filtrer les termes trop rares (score < 2) ou trop courants
  const salientTerms = [...termScores.entries()]
    .filter(([, score]) => score >= 2)
    .sort((a, b) => b[1] - a[1]);

  // 2. Pour chaque section, matcher les termes pertinents
  return sections.map((section) => {
    // Tokens de la section (H2 + H3/H4)
    const sectionText = [
      section.h2.text,
      ...section.subsections.map((s) => s.text),
    ].join(" ");
    const sectionTokens = new Set(tokenize(sectionText));

    // Scorer chaque terme saillant par rapport à cette section
    const scored = salientTerms.map(([term, globalScore]) => {
      // Bonus si le terme apparaît dans les headings de cette section
      const inSection = sectionTokens.has(term) ? 5 : 0;
      // Bonus si le terme partage des mots avec les headings
      const partialMatch = [...sectionTokens].some(
        (st) => term.includes(st) || st.includes(term)
      )
        ? 2
        : 0;
      return { term, score: globalScore + inSection + partialMatch };
    });

    // Top 12 termes pour cette section, en excluant ceux déjà dans les headings
    const terms = scored
      .filter((s) => s.score > 2 && !sectionTokens.has(s.term))
      .sort((a, b) => b.score - a.score)
      .slice(0, 12)
      .map((s) => s.term);

    return { sectionIndex: section.index, terms };
  });
}
