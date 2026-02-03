import type { PromptVariables } from "./prompts";

interface ProjectData {
  keyword: string;
  title: string;
  searchIntents: string[];
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
