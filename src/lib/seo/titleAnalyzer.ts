/**
 * Analyse des patterns de titres concurrents SERP.
 * Implémentation purement JavaScript — pas de dépendances externes.
 */

export interface TitlePattern {
  title: string;
  position: number;
  powerWords: string[];
  hasNumber: boolean;
  hasYear: boolean;
  hasParentheses: boolean;
  hasQuestion: boolean;
  keywordPosition: "start" | "middle" | "end" | "absent";
  charCount: number;
}

export interface TitleAnalysis {
  patterns: TitlePattern[];
  dominantPowerWords: string[];
  avgLength: number;
  recommendations: string[];
}

// Power words courants en SEO français et anglais
const POWER_WORDS_FR = [
  "guide", "complet", "meilleur", "gratuit", "comment", "astuce",
  "conseil", "top", "ultime", "secret", "facile", "rapide",
  "simple", "efficace", "essentiel", "définitif", "pratique",
  "comparatif", "avis", "test", "étape", "erreur", "solution",
  "méthode", "stratégie", "outil", "liste", "exemple",
  "nouveau", "exclusif", "prouvé", "expert",
];

const POWER_WORDS_EN = [
  "guide", "best", "free", "how", "tips", "top", "ultimate",
  "easy", "fast", "simple", "complete", "review", "vs",
  "step", "ways", "mistakes", "proven", "expert", "new",
];

const ALL_POWER_WORDS = [...new Set([...POWER_WORDS_FR, ...POWER_WORDS_EN])];

/**
 * Détecte la position du mot-clé dans un titre
 */
function detectKeywordPosition(
  title: string,
  keyword: string
): TitlePattern["keywordPosition"] {
  const lower = title.toLowerCase();
  const kw = keyword.toLowerCase();

  if (!lower.includes(kw)) {
    // Vérifier les mots individuels du mot-clé
    const kwWords = kw.split(/\s+/);
    const matchCount = kwWords.filter((w) => lower.includes(w)).length;
    if (matchCount < kwWords.length / 2) return "absent";
  }

  const idx = lower.indexOf(kw);
  if (idx === -1) {
    // Mot-clé partiel — position basée sur le premier mot du keyword trouvé
    const firstKwWord = kw.split(/\s+/)[0];
    const firstIdx = lower.indexOf(firstKwWord);
    if (firstIdx === -1) return "absent";
    const ratio = firstIdx / lower.length;
    return ratio < 0.33 ? "start" : ratio < 0.66 ? "middle" : "end";
  }

  const ratio = idx / lower.length;
  if (ratio < 0.25) return "start";
  if (ratio < 0.65) return "middle";
  return "end";
}

/**
 * Détecte les power words dans un titre
 */
function detectPowerWords(title: string): string[] {
  const lower = title.toLowerCase();
  return ALL_POWER_WORDS.filter((pw) => {
    const regex = new RegExp(`\\b${pw}\\b`, "i");
    return regex.test(lower);
  });
}

/**
 * Analyse un titre individuel
 */
function analyzeTitle(
  title: string,
  position: number,
  keyword: string
): TitlePattern {
  const currentYear = new Date().getFullYear();
  const recentYears = [
    currentYear.toString(),
    (currentYear - 1).toString(),
    (currentYear + 1).toString(),
  ];

  return {
    title,
    position,
    powerWords: detectPowerWords(title),
    hasNumber: /\d+/.test(title),
    hasYear: recentYears.some((y) => title.includes(y)),
    hasParentheses: /[(\[]/.test(title),
    hasQuestion: /[?]/.test(title) || /^(comment|pourquoi|quand|quel|how|what|why|when)/i.test(title),
    keywordPosition: detectKeywordPosition(title, keyword),
    charCount: title.length,
  };
}

/**
 * Analyse un ensemble de titres concurrents SERP
 */
export function analyzeTitles(
  titles: { title: string; position: number }[],
  keyword: string
): TitleAnalysis {
  const patterns = titles.map((t) =>
    analyzeTitle(t.title, t.position, keyword)
  );

  // Power words les plus fréquents
  const pwFrequency: Record<string, number> = {};
  for (const p of patterns) {
    for (const pw of p.powerWords) {
      pwFrequency[pw] = (pwFrequency[pw] ?? 0) + 1;
    }
  }
  const dominantPowerWords = Object.entries(pwFrequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([word]) => word);

  // Longueur moyenne
  const avgLength = Math.round(
    patterns.reduce((acc, p) => acc + p.charCount, 0) / (patterns.length || 1)
  );

  // Recommandations
  const recommendations: string[] = [];

  const startCount = patterns.filter(
    (p) => p.keywordPosition === "start"
  ).length;
  if (startCount >= patterns.length / 2) {
    recommendations.push(
      "La majorité des concurrents placent le mot-clé en début de titre. Privilégiez cette position."
    );
  }

  const numberCount = patterns.filter((p) => p.hasNumber).length;
  if (numberCount >= 3) {
    recommendations.push(
      "Les chiffres sont fréquents dans les titres top. Ajoutez un nombre (ex: \"7 astuces\", \"en 5 étapes\")."
    );
  }

  const yearCount = patterns.filter((p) => p.hasYear).length;
  if (yearCount >= 2) {
    recommendations.push(
      `L'année est souvent mentionnée. Ajoutez \"(${new Date().getFullYear()})\" pour signaler la fraîcheur.`
    );
  }

  const parenCount = patterns.filter((p) => p.hasParentheses).length;
  if (parenCount >= 2) {
    recommendations.push(
      "Les parenthèses/crochets sont utilisés par les concurrents (ex: \"[Guide Complet]\"). Testez ce format."
    );
  }

  if (dominantPowerWords.length > 0) {
    recommendations.push(
      `Power words dominants chez les concurrents : ${dominantPowerWords.join(", ")}. Inspirez-vous-en.`
    );
  }

  if (avgLength > 55) {
    recommendations.push(
      `Longueur moyenne des titres concurrents : ${avgLength} caractères. Visez 50-60 caractères.`
    );
  }

  const questionCount = patterns.filter((p) => p.hasQuestion).length;
  if (questionCount >= 2) {
    recommendations.push(
      "Plusieurs concurrents utilisent le format question. Testez une variante interrogative."
    );
  }

  return {
    patterns,
    dominantPowerWords,
    avgLength,
    recommendations,
  };
}
