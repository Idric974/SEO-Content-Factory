/**
 * Analyse NLP de qualité pour le contenu français.
 * Implémentation purement JavaScript — pas de dépendances externes.
 */

export interface QualityMetrics {
  /** Pourcentage de mots uniques (cible 60-80%) */
  lexicalDiversity: number;
  totalWords: number;
  uniqueWords: number;
  /** Nombre moyen de mots par phrase */
  avgSentenceLength: number;
  /** Nombre de phrases de plus de 25 mots */
  longSentences: number;
  totalSentences: number;
  /** Nombre d'occurrences de verbes modaux */
  modalVerbCount: number;
  /** Exemples de verbes modaux trouvés (max 5) */
  modalVerbExamples: string[];
  /** Nombre d'occurrences de voix passive */
  passiveVoiceCount: number;
  /** Exemples de voix passive trouvés (max 5) */
  passiveVoiceExamples: string[];
  /** Score de lisibilité Flesch adapté FR (0-100, plus haut = plus lisible) */
  readabilityScore: number;
  /** Score global de qualité (0-100) */
  overallScore: number;
}

/**
 * Nettoie le texte Markdown en supprimant les balises/formatage
 */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "") // headings
    .replace(/\*\*(.+?)\*\*/g, "$1") // bold
    .replace(/\*(.+?)\*/g, "$1") // italic
    .replace(/`(.+?)`/g, "$1") // inline code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/^[-*]\s+/gm, "") // list items
    .replace(/^\d+\.\s+/gm, "") // numbered list items
    .replace(/^>\s+/gm, "") // blockquotes
    .replace(/---+/g, "") // horizontal rules
    .replace(/```[\s\S]*?```/g, "") // code blocks
    .trim();
}

/**
 * Tokenize en mots (français)
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/['']/g, "'")
    .split(/[\s,.;:!?()[\]{}"«»\-—–…/\\]+/)
    .filter((w) => w.length > 1);
}

/**
 * Découpe le texte en phrases
 */
function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);
}

/**
 * Compte approximatif des syllabes pour le français
 */
function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-zàâäéèêëïîôùûüÿçœæ]/g, "");
  if (w.length <= 2) return 1;

  // Compter les groupes de voyelles
  const vowels = w.match(/[aeiouyàâäéèêëïîôùûüÿœæ]+/gi);
  let count = vowels ? vowels.length : 1;

  // E muet en fin de mot
  if (w.endsWith("e") && !w.endsWith("le") && !w.endsWith("re") && !w.endsWith("ne")) {
    count = Math.max(1, count - 1);
  }
  // -es, -ent en fin (verbes)
  if (w.endsWith("es") || w.endsWith("ent")) {
    count = Math.max(1, count - 1);
  }

  return Math.max(1, count);
}

// Conjugaisons courantes des verbes modaux français
const MODAL_PATTERNS = [
  // devoir
  /\b(dois|doit|devons|devez|doivent|devait|devaient|devra|devront|devrait|devraient|dû|due)\b/gi,
  // pouvoir
  /\b(peux|peut|pouvons|pouvez|peuvent|pouvait|pouvaient|pourra|pourront|pourrait|pourraient|pu)\b/gi,
  // vouloir
  /\b(veux|veut|voulons|voulez|veulent|voulait|voulaient|voudra|voudront|voudrait|voudraient|voulu)\b/gi,
  // falloir
  /\b(faut|fallait|faudra|faudrait|fallu)\b/gi,
  // savoir (modal use)
  /\b(saurait|sauraient)\b/gi,
];

// Pattern pour la voix passive française
const PASSIVE_PATTERN =
  /\b(est|sont|a\s+été|ont\s+été|sera|seront|était|étaient|fut|furent|serait|seraient)\s+(\w+(?:é|ée|és|ées|i|ie|is|ise|it|ite|u|ue|us|ues|t|te|ts|tes))\b/gi;

/**
 * Analyse complète de la qualité du texte
 */
export function analyzeQuality(text: string): QualityMetrics {
  const cleanText = stripMarkdown(text);
  const words = tokenize(cleanText);
  const totalWords = words.length;

  if (totalWords === 0) {
    return {
      lexicalDiversity: 0,
      totalWords: 0,
      uniqueWords: 0,
      avgSentenceLength: 0,
      longSentences: 0,
      totalSentences: 0,
      modalVerbCount: 0,
      modalVerbExamples: [],
      passiveVoiceCount: 0,
      passiveVoiceExamples: [],
      readabilityScore: 0,
      overallScore: 0,
    };
  }

  // 1. Diversité lexicale
  const uniqueWordsSet = new Set(words);
  const uniqueWords = uniqueWordsSet.size;
  const lexicalDiversity = Math.round((uniqueWords / totalWords) * 100);

  // 2. Phrases
  const sentences = splitSentences(cleanText);
  const totalSentences = sentences.length || 1;
  const sentenceWordCounts = sentences.map(
    (s) => tokenize(s).length
  );
  const avgSentenceLength = Math.round(
    sentenceWordCounts.reduce((a, b) => a + b, 0) / totalSentences
  );
  const longSentences = sentenceWordCounts.filter((c) => c > 25).length;

  // 3. Verbes modaux
  const modalVerbExamples: string[] = [];
  let modalVerbCount = 0;
  for (const pattern of MODAL_PATTERNS) {
    const matches = cleanText.match(pattern);
    if (matches) {
      modalVerbCount += matches.length;
      for (const match of matches) {
        if (modalVerbExamples.length < 5) {
          // Extraire le contexte (phrase contenant le modal)
          const idx = cleanText.toLowerCase().indexOf(match.toLowerCase());
          const start = Math.max(0, cleanText.lastIndexOf(".", idx) + 1);
          const end = cleanText.indexOf(".", idx);
          const context = cleanText
            .slice(start, end > idx ? end : idx + 50)
            .trim();
          if (context && !modalVerbExamples.includes(context)) {
            modalVerbExamples.push(
              context.length > 80 ? context.slice(0, 80) + "..." : context
            );
          }
        }
      }
    }
  }

  // 4. Voix passive
  const passiveVoiceExamples: string[] = [];
  let passiveVoiceCount = 0;
  const passiveMatches = cleanText.matchAll(PASSIVE_PATTERN);
  for (const match of passiveMatches) {
    passiveVoiceCount++;
    if (passiveVoiceExamples.length < 5) {
      const fullMatch = match[0];
      const idx = match.index ?? 0;
      const start = Math.max(0, cleanText.lastIndexOf(".", idx) + 1);
      const end = cleanText.indexOf(".", idx);
      const context = cleanText
        .slice(start, end > idx ? end : idx + fullMatch.length + 30)
        .trim();
      if (context && !passiveVoiceExamples.includes(context)) {
        passiveVoiceExamples.push(
          context.length > 80 ? context.slice(0, 80) + "..." : context
        );
      }
    }
  }

  // 5. Lisibilité Flesch adapté FR
  const totalSyllables = words.reduce((acc, w) => acc + countSyllables(w), 0);
  const avgSyllablesPerWord = totalSyllables / totalWords;
  const avgWordsPerSentence = totalWords / totalSentences;
  // Formule Flesch adaptée au français (Kandel & Moles)
  const readabilityScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        207 - 1.015 * avgWordsPerSentence - 73.6 * avgSyllablesPerWord
      )
    )
  );

  // 6. Score global (moyenne pondérée)
  // Diversité lexicale : 60-80% = parfait → score 0-100
  const diversityScore =
    lexicalDiversity >= 60 && lexicalDiversity <= 80
      ? 100
      : lexicalDiversity < 60
        ? (lexicalDiversity / 60) * 100
        : Math.max(0, 100 - (lexicalDiversity - 80) * 5);

  // Modaux : moins = mieux (0 = 100, 20+ = 0)
  const modalRatio = (modalVerbCount / totalWords) * 100;
  const modalScore = Math.max(0, 100 - modalRatio * 50);

  // Passif : moins = mieux
  const passiveRatio = (passiveVoiceCount / totalSentences) * 100;
  const passiveScore = Math.max(0, 100 - passiveRatio * 3);

  // Score global pondéré
  const overallScore = Math.round(
    diversityScore * 0.25 +
      readabilityScore * 0.30 +
      modalScore * 0.20 +
      passiveScore * 0.25
  );

  return {
    lexicalDiversity,
    totalWords,
    uniqueWords,
    avgSentenceLength,
    longSentences,
    totalSentences,
    modalVerbCount,
    modalVerbExamples,
    passiveVoiceCount,
    passiveVoiceExamples,
    readabilityScore,
    overallScore,
  };
}
