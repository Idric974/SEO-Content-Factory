import type { PromptVariables } from "./prompts";
import type { SERPAnalysis } from "@/lib/serpapi/client";
import { formatSERPForPrompt } from "@/lib/serpapi/client";

interface ProjectData {
  keyword: string;
  title: string;
  searchIntents: string[];
  businessObjective: string | null;
  serpAnalysis: unknown;
  editorialFormat: string | null;
  client: {
    persona: unknown;
    brandGuidelines: unknown;
  };
  workflowSteps: {
    stepNumber: number;
    outputText: string | null;
    outputData: unknown;
    isValidated: boolean;
  }[];
}

/**
 * Extrait les variables de prompt à partir des données du projet
 * et des résultats des étapes précédentes.
 */
export function extractVariables(project: ProjectData): PromptVariables {
  const vars: PromptVariables = {
    keyword: project.keyword,
    title: project.title,
    intents: project.searchIntents.join(", ") || "Non spécifiées",
  };

  // Persona
  if (project.client.persona && typeof project.client.persona === "object") {
    const p = project.client.persona as Record<string, string>;
    const parts: string[] = [];
    if (p.name) parts.push(`Prénom : ${p.name}`);
    if (p.age) parts.push(`Âge : ${p.age}`);
    if (p.profession) parts.push(`Profession : ${p.profession}`);
    if (p.problems) parts.push(`Problèmes : ${p.problems}`);
    if (p.goals) parts.push(`Objectifs : ${p.goals}`);
    if (p.tone) parts.push(`Ton préféré : ${p.tone}`);
    if (p.description) parts.push(`Description : ${p.description}`);
    vars.persona = parts.length > 0 ? parts.join("\n") : "Non défini";
  } else {
    vars.persona = "Non défini";
  }

  // Brand guidelines
  if (project.client.brandGuidelines && typeof project.client.brandGuidelines === "object") {
    const b = project.client.brandGuidelines as Record<string, string>;
    const parts: string[] = [];
    if (b.tone) parts.push(`Ton de marque : ${b.tone}`);
    if (b.preferredStyle) parts.push(`Style : ${b.preferredStyle}`);
    if (b.forbiddenWords) parts.push(`Mots interdits : ${b.forbiddenWords}`);
    if (b.additionalNotes) parts.push(`Notes : ${b.additionalNotes}`);
    vars.brand = parts.length > 0 ? parts.join("\n") : "";
  } else {
    vars.brand = "";
  }

  // Objectif business
  if (project.businessObjective) {
    const labels: Record<string, string> = {
      explorer: "Explorateur — Le lecteur découvre le sujet",
      evaluator: "Évaluateur — Le lecteur compare des options",
      convinced: "Convaincu en attente — Le lecteur est prêt mais hésite",
      decision_maker: "Décisionnaire — Le lecteur veut agir maintenant",
    };
    vars.businessObjective = labels[project.businessObjective] ?? project.businessObjective;
  }

  // Format éditorial recommandé
  if (project.editorialFormat) {
    const formatLabels: Record<string, string> = {
      pas: "PAS (Problème-Agitation-Solution)",
      aida: "AIDA (Attention-Intérêt-Désir-Action)",
      mece: "MECE (Mutuellement Exclusif, Collectivement Exhaustif)",
      inverted_pyramid: "Pyramide inversée (informationnel)",
    };
    vars.editorialFormat = formatLabels[project.editorialFormat] ?? project.editorialFormat;
  }

  // Données SERP
  if (project.serpAnalysis && typeof project.serpAnalysis === "object") {
    const serp = project.serpAnalysis as SERPAnalysis;

    // PAA formatées
    if (serp.peopleAlsoAsk?.length > 0) {
      vars.serpPAA = serp.peopleAlsoAsk
        .map((p) => `- ${p.question}`)
        .join("\n");
    }

    // Features SERP détectées
    if (serp.serpFeatures?.length > 0) {
      vars.serpFeatures = serp.serpFeatures.join(", ");
    }

    // Top 5 concurrents
    if (serp.organicResults?.length > 0) {
      vars.serpCompetitors = serp.organicResults
        .slice(0, 5)
        .map(
          (r) =>
            `${r.position}. ${r.title}\n   ${r.snippet}\n   Source : ${r.link}`
        )
        .join("\n\n");
    }

    // Recherches associées
    if (serp.relatedSearches?.length > 0) {
      vars.relatedSearches = serp.relatedSearches.join(", ");
    }

    // Résumé SERP complet pour injection
    vars.serpSummary = formatSERPForPrompt(serp);
  }

  // Résultats des étapes précédentes validées
  for (const step of project.workflowSteps) {
    if (!step.outputText) continue;

    switch (step.stepNumber) {
      case 2:
        vars.research = step.outputText;
        break;
      case 3:
        vars.questions = step.outputText;
        break;
      case 4:
        vars.enrichedQuestions = step.outputText;
        break;
      case 5:
        vars.plan = step.outputText;
        break;
      case 6:
        vars.article = step.outputText;
        break;
      case 7:
        // L'article optimisé remplace l'article brut
        vars.article = step.outputText;
        break;
      case 9:
        vars.imagePrompts = step.outputText;
        break;
      case 13:
        vars.metaData = step.outputText;
        break;
    }
  }

  return vars;
}
