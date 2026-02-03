export interface StepDefinition {
  number: number;
  name: string;
  slug: string;
  description: string;
  requiresValidation: boolean;
  validationType: "approve" | "choose" | "edit";
}

export const WORKFLOW_STEPS: StepDefinition[] = [
  {
    number: 0,
    name: "Configuration",
    slug: "configuration",
    description: "Définir le mot-clé, le client et les intentions de recherche",
    requiresValidation: true,
    validationType: "approve",
  },
  {
    number: 1,
    name: "Génération de titres",
    slug: "titles",
    description: "Générer 10 titres SEO optimisés",
    requiresValidation: true,
    validationType: "choose",
  },
  {
    number: 2,
    name: "Recherche approfondie",
    slug: "research",
    description: "Créer une synthèse/wiki du sujet",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 3,
    name: "Questions persona",
    slug: "questions",
    description: "Générer les questions que se pose le persona",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 4,
    name: "Intentions vs Questions",
    slug: "intents-questions",
    description: "Croiser les intentions SERP avec les questions persona",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 5,
    name: "Plan MECE",
    slug: "plan",
    description: "Structurer le plan H1-H4 selon le principe MECE",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 6,
    name: "Rédaction de l'article",
    slug: "article",
    description: "Rédiger l'article complet à partir du plan",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 7,
    name: "Optimisation SEO",
    slug: "optimize",
    description: "Optimiser l'article pour le référencement",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 8,
    name: "Introduction copywriting",
    slug: "introduction",
    description: "Générer 2 introductions optimisées",
    requiresValidation: true,
    validationType: "choose",
  },
  {
    number: 9,
    name: "Titres images",
    slug: "image-titles",
    description: "Créer les noms de fichiers SEO pour les images",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 10,
    name: "Prompts illustrations",
    slug: "image-prompts",
    description: "Générer les prompts pour la création d'images",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 11,
    name: "Génération images",
    slug: "images",
    description: "Générer les illustrations via DALL-E",
    requiresValidation: true,
    validationType: "approve",
  },
  {
    number: 12,
    name: "Textes alternatifs",
    slug: "alt-texts",
    description: "Créer les balises alt pour les images",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 13,
    name: "Méta-données",
    slug: "meta",
    description: "Générer 5 titres et 5 méta-descriptions",
    requiresValidation: true,
    validationType: "choose",
  },
  {
    number: 14,
    name: "Données structurées",
    slug: "structured-data",
    description: "Générer le Schema.org JSON-LD",
    requiresValidation: true,
    validationType: "edit",
  },
  {
    number: 15,
    name: "Export",
    slug: "export",
    description: "Exporter l'article (WordPress, DOCX, Markdown)",
    requiresValidation: true,
    validationType: "approve",
  },
];

export function getStepByNumber(stepNumber: number): StepDefinition | undefined {
  return WORKFLOW_STEPS.find((s) => s.number === stepNumber);
}

export function getStepBySlug(slug: string): StepDefinition | undefined {
  return WORKFLOW_STEPS.find((s) => s.slug === slug);
}
