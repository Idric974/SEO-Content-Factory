/**
 * Parser de plan en sections H2 pour la rédaction section par section.
 */

import { extractHeadings, type PlanHeading } from "./parser";

export interface PlanSection {
  index: number;
  h2: PlanHeading;
  subsections: PlanHeading[]; // H3/H4 enfants
  rawMarkdown: string; // Tranche du plan pour cette section
}

/**
 * Découpe un plan Markdown en sections logiques basées sur les H2.
 * Chaque H2 démarre une nouvelle section avec ses H3/H4 enfants.
 */
export function parsePlanIntoSections(planMarkdown: string): PlanSection[] {
  const headings = extractHeadings(planMarkdown);
  const lines = planMarkdown.split("\n");
  const sections: PlanSection[] = [];

  // Trouver les indices des H2
  const h2Headings = headings.filter((h) => h.level === 2);

  for (let i = 0; i < h2Headings.length; i++) {
    const h2 = h2Headings[i];
    const nextH2 = h2Headings[i + 1];

    // Sous-sections = tous les headings H3/H4 entre ce H2 et le prochain H2
    const subsections = headings.filter((h) => {
      if (h.level < 3) return false;
      if (h.line <= h2.line) return false;
      if (nextH2 && h.line >= nextH2.line) return false;
      return true;
    });

    // Extraire le markdown brut pour cette section
    const startLine = h2.line - 1; // 0-indexed
    const endLine = nextH2 ? nextH2.line - 1 : lines.length;
    const rawMarkdown = lines.slice(startLine, endLine).join("\n").trim();

    sections.push({
      index: i,
      h2,
      subsections,
      rawMarkdown,
    });
  }

  return sections;
}
