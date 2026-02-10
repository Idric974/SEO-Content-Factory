/**
 * Parser de plan Markdown : extraction des headings et détection de titres vagues.
 */

export interface PlanHeading {
  level: number; // 1, 2, 3, 4
  text: string;
  line: number;
}

export interface HnIssue {
  heading: PlanHeading;
  issue: "vague" | "numbered_only" | "generic";
  suggestion?: string; // Rempli par Claude dans l'API
}

/**
 * Extrait tous les headings Markdown (H1-H4) d'un texte.
 */
export function extractHeadings(markdown: string): PlanHeading[] {
  const headings: PlanHeading[] = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,4})\s+(.+)$/);
    if (match) {
      headings.push({
        level: match[1].length,
        text: match[2].trim(),
        line: i + 1,
      });
    }
  }

  return headings;
}

// Patterns de titres vagues (sans contexte descriptif)
const VAGUE_STANDALONE = /^(introduction|conclusion|résumé|summary|overview|préambule|avant-propos|annexe|appendice)$/i;
const NUMBERED_ONLY = /^(étape|step|partie|part|section|chapitre|chapter|phase|module)\s+\d+\s*$/i;
const GENERIC_SHORT = /^(détails|more|additional|information|contexte|généralités|présentation|description|analyse|résultats|discussion|méthode|méthodologie|FAQ)$/i;

/**
 * Détecte les titres H2+ vagues qui devraient être plus descriptifs.
 * Ne flag que les H2+ (pas le H1 qui est le titre de l'article).
 */
export function detectVagueHeadings(headings: PlanHeading[]): HnIssue[] {
  const issues: HnIssue[] = [];

  for (const h of headings) {
    // Ne vérifier que H2+
    if (h.level < 2) continue;

    const text = h.text.replace(/\*\*/g, "").trim();

    if (VAGUE_STANDALONE.test(text)) {
      issues.push({ heading: h, issue: "vague" });
    } else if (NUMBERED_ONLY.test(text)) {
      issues.push({ heading: h, issue: "numbered_only" });
    } else if (GENERIC_SHORT.test(text)) {
      issues.push({ heading: h, issue: "generic" });
    }
  }

  return issues;
}

/**
 * Labels français pour les types de problèmes.
 */
export function issueLabel(issue: HnIssue["issue"]): string {
  switch (issue) {
    case "vague":
      return "Titre vague";
    case "numbered_only":
      return "Numéroté sans description";
    case "generic":
      return "Terme générique";
  }
}
