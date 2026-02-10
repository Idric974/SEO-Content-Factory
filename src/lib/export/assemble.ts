/**
 * Assemble l'article final à partir des données des différentes étapes du workflow.
 */

interface WorkflowStepData {
  stepNumber: number;
  outputText: string | null;
  outputData: Record<string, unknown> | null;
}

interface ProjectData {
  title: string;
  keyword: string;
  workflowSteps: WorkflowStepData[];
  images: { filename: string | null; imageUrl: string | null; altText: string | null }[];
}

export interface InternalLinkRecommendation {
  anchor: string;
  targetUrl: string;
  targetTitle: string;
  relevanceScore: number;
  articleContext: string;
  freshnessNote: string | null;
}

export interface AssembledArticle {
  title: string;
  metaTitle: string;
  metaDescription: string;
  tldr: string;
  introduction: string;
  body: string;
  authorBlock: string;
  interactiveModules: string[];
  internalLinks: InternalLinkRecommendation[];
  structuredData: string;
  images: { filename: string; url: string; alt: string }[];
  fullMarkdown: string;
}

/**
 * Récupère le texte d'une étape par son numéro
 */
function getStepOutput(steps: WorkflowStepData[], num: number): string {
  return steps.find((s) => s.stepNumber === num)?.outputText ?? "";
}

/**
 * Récupère les données structurées d'une étape
 */
function getStepData(steps: WorkflowStepData[], num: number): Record<string, unknown> | null {
  return steps.find((s) => s.stepNumber === num)?.outputData ?? null;
}

/**
 * Assemble toutes les pièces de l'article final
 */
export function assembleArticle(project: ProjectData): AssembledArticle {
  const steps = project.workflowSteps;

  // Titre (étape 1 sélection)
  const step1Data = getStepData(steps, 1);
  const title = (step1Data?.selectedTitle as string) ?? project.title;

  // Introduction (étape 8 sélection)
  const step8Data = getStepData(steps, 8);
  const introText = getStepOutput(steps, 8);
  let introduction = "";
  if (step8Data?.selectedIndex !== undefined) {
    // Parser les deux introductions et prendre celle sélectionnée
    const parts = introText.split(/##\s*Introduction\s*\d/i).filter(Boolean);
    introduction = parts[step8Data.selectedIndex as number]?.trim() ?? introText;
  } else {
    introduction = introText;
  }

  // TL;DR (étape 7 outputData)
  const step7Data = getStepData(steps, 7);
  const tldr = (step7Data?.tldr as string) ?? "";

  // Corps de l'article optimisé (étape 7)
  const body = getStepOutput(steps, 7);

  // Méta-données (étape 13 sélection)
  const step13Data = getStepData(steps, 13);
  const metaTitle = (step13Data?.selectedMetaTitle as string) ?? title;
  const metaDescription = (step13Data?.selectedMetaDescription as string) ?? "";

  // Bloc auteur E-E-A-T (step 7 outputData)
  const authorBlock = (step7Data?.authorBlock as string) ?? "";

  // Modules interactifs (step 15 outputData)
  const step15Data = getStepData(steps, 15);
  const interactiveModules = (step15Data?.interactiveModules as string[]) ?? [];

  // Liens internes (step 14 outputData)
  const step14Data = getStepData(steps, 14);
  const internalLinks = (step14Data?.internalLinks as InternalLinkRecommendation[]) ?? [];

  // Données structurées (étape 14)
  const structuredData = getStepOutput(steps, 14);

  // Images + alt texts (étape 12)
  const altTextsRaw = getStepOutput(steps, 12);
  const altMap = parseAltTexts(altTextsRaw);

  const images = project.images
    .filter((img) => img.imageUrl && img.filename)
    .map((img) => ({
      filename: img.filename!,
      url: img.imageUrl!,
      alt: altMap[img.filename!] ?? img.altText ?? img.filename!,
    }));

  // Assemblage Markdown complet
  const fullMarkdown = buildFullMarkdown({
    title,
    tldr,
    introduction,
    body,
    authorBlock,
    interactiveModules,
    internalLinks,
    images,
    structuredData,
    metaTitle,
    metaDescription,
  });

  return {
    title,
    metaTitle,
    metaDescription,
    tldr,
    introduction,
    body,
    authorBlock,
    interactiveModules,
    internalLinks,
    structuredData,
    images,
    fullMarkdown,
  };
}

/**
 * Parse les textes alternatifs depuis la sortie de l'étape 12
 */
function parseAltTexts(text: string): Record<string, string> {
  const result: Record<string, string> = {};
  const lines = text.split("\n");

  let currentFile = "";
  for (const line of lines) {
    const trimmed = line.trim();

    const fileMatch = trimmed.match(/^[-*•]?\s*(?:Fichier|File)\s*:\s*(.+)/i);
    if (fileMatch) {
      currentFile = fileMatch[1].trim();
      continue;
    }

    const altMatch = trimmed.match(/^[-*•]?\s*Alt\s*:\s*(.+)/i);
    if (altMatch && currentFile) {
      result[currentFile] = altMatch[1].trim();
      currentFile = "";
    }
  }

  return result;
}

/**
 * Construit le document Markdown complet
 */
function buildFullMarkdown(parts: {
  title: string;
  tldr: string;
  introduction: string;
  body: string;
  authorBlock: string;
  interactiveModules: string[];
  internalLinks: InternalLinkRecommendation[];
  images: { filename: string; url: string; alt: string }[];
  structuredData: string;
  metaTitle: string;
  metaDescription: string;
}): string {
  const sections: string[] = [];

  // Front matter
  sections.push(`---
title: "${parts.metaTitle}"
description: "${parts.metaDescription}"
---`);

  // Titre
  sections.push(`# ${parts.title}`);

  // TL;DR (above the fold)
  if (parts.tldr) {
    sections.push(`> **TL;DR** — ${parts.tldr}`);
  }

  // Introduction
  if (parts.introduction) {
    sections.push(parts.introduction);
  }

  // Corps (déjà en Markdown avec ## et ###)
  if (parts.body) {
    sections.push(parts.body);
  }

  // Bloc auteur E-E-A-T
  if (parts.authorBlock) {
    sections.push(`---\n\n## À propos de l'auteur\n\n${parts.authorBlock}`);
  }

  // Recommandations de liens internes en commentaire
  if (parts.internalLinks.length > 0) {
    const linksLines = parts.internalLinks.map(
      (link) =>
        `- Ancre : "${link.anchor}" → ${link.targetUrl} (pertinence: ${link.relevanceScore}%)${link.freshnessNote ? ` | Freshness: ${link.freshnessNote}` : ""}`
    );
    sections.push(`<!-- Recommandations de maillage interne\n${linksLines.join("\n")}\n-->`);
  }

  // Données structurées en commentaire
  if (parts.structuredData) {
    sections.push(`<!-- Schema.org JSON-LD
${parts.structuredData}
-->`);
  }

  // Modules interactifs en commentaire HTML (pour export HTML/WordPress)
  if (parts.interactiveModules.length > 0) {
    for (let i = 0; i < parts.interactiveModules.length; i++) {
      sections.push(`<!-- Module Interactif ${i + 1}\n${parts.interactiveModules[i]}\n-->`);
    }
  }

  return sections.join("\n\n");
}
