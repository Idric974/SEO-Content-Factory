export interface StepDefinition {
  number: number;
  name: string;
  slug: string;
  description: string;
  requiresValidation: boolean;
  validationType: "approve" | "choose" | "choose-dual" | "edit";
  /** Tokens max pour la génération Claude */
  maxTokens: number;
  /** Température pour la génération (0-1) */
  temperature: number;
  /** Étapes dont les résultats sont nécessaires avant génération */
  dependsOn: number[];
  /** Instructions affichées à l'utilisateur dans l'interface */
  userInstructions: string;
}

export const WORKFLOW_STEPS: StepDefinition[] = [
  {
    number: 0,
    name: "Configuration",
    slug: "configuration",
    description: "Définir le mot-clé, le client et les intentions de recherche",
    requiresValidation: true,
    validationType: "approve",
    maxTokens: 0,
    temperature: 0,
    dependsOn: [],
    userInstructions: "Vérifiez les paramètres du projet puis validez pour commencer.",
  },
  {
    number: 1,
    name: "Génération de titres",
    slug: "titles",
    description: "Générer 10 titres SEO optimisés",
    requiresValidation: true,
    validationType: "choose",
    maxTokens: 2048,
    temperature: 0.8,
    dependsOn: [0],
    userInstructions: "Cliquez sur « Générer » puis sélectionnez le titre qui vous convient le mieux. Ce titre sera utilisé pour tout le reste du workflow.",
  },
  {
    number: 2,
    name: "Recherche approfondie",
    slug: "research",
    description: "Créer une synthèse/wiki du sujet",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 4096,
    temperature: 0.5,
    dependsOn: [1],
    userInstructions: "Vérifiez la recherche générée. Vous pouvez modifier, ajouter ou supprimer des informations avant de valider.",
  },
  {
    number: 3,
    name: "Questions persona",
    slug: "questions",
    description: "Générer les questions que se pose le persona",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 3072,
    temperature: 0.7,
    dependsOn: [1],
    userInstructions: "Vérifiez que les questions correspondent bien au persona. Ajoutez ou supprimez des questions selon votre connaissance du public cible.",
  },
  {
    number: 4,
    name: "Intentions vs Questions",
    slug: "intents-questions",
    description: "Croiser les intentions SERP avec les questions persona",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 4096,
    temperature: 0.6,
    dependsOn: [3],
    userInstructions: "Vérifiez le croisement entre les intentions de recherche et les questions. Ajustez les priorités SEO si nécessaire.",
  },
  {
    number: 5,
    name: "Plan MECE",
    slug: "plan",
    description: "Structurer le plan H1-H4 selon le principe MECE",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 4096,
    temperature: 0.6,
    dependsOn: [2, 4],
    userInstructions: "C'est le squelette de votre article. Réorganisez les sections, ajoutez ou supprimez des parties. Un bon plan = un bon article.",
  },
  {
    number: 6,
    name: "Rédaction de l'article",
    slug: "article",
    description: "Rédiger l'article complet à partir du plan",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 8192,
    temperature: 0.7,
    dependsOn: [5, 2],
    userInstructions: "L'article est généré sans introduction (elle viendra à l'étape 8). Relisez et modifiez le contenu à votre convenance.",
  },
  {
    number: 7,
    name: "Optimisation SEO",
    slug: "optimize",
    description: "Optimiser l'article pour le référencement",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 8192,
    temperature: 0.4,
    dependsOn: [6],
    userInstructions: "Comparez l'article optimisé avec l'original. Vérifiez que l'optimisation n'a pas dénaturé le contenu.",
  },
  {
    number: 8,
    name: "Introduction copywriting",
    slug: "introduction",
    description: "Générer 2 introductions optimisées",
    requiresValidation: true,
    validationType: "choose",
    maxTokens: 2048,
    temperature: 0.8,
    dependsOn: [7],
    userInstructions: "Choisissez l'introduction qui accroche le mieux. Elle sera ajoutée en début d'article.",
  },
  {
    number: 9,
    name: "Titres images",
    slug: "image-titles",
    description: "Créer les noms de fichiers SEO pour les images",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 2048,
    temperature: 0.5,
    dependsOn: [7],
    userInstructions: "Vérifiez les noms de fichiers. Ils doivent contenir le mot-clé et décrire l'image attendue.",
  },
  {
    number: 10,
    name: "Prompts illustrations",
    slug: "image-prompts",
    description: "Générer les prompts pour la création d'images",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 3072,
    temperature: 0.7,
    dependsOn: [9],
    userInstructions: "Ajustez les prompts DALL-E si le style ou le contenu visuel ne correspond pas à vos attentes.",
  },
  {
    number: 11,
    name: "Génération images",
    slug: "images",
    description: "Générer les illustrations via DALL-E",
    requiresValidation: true,
    validationType: "approve",
    maxTokens: 0,
    temperature: 0,
    dependsOn: [10],
    userInstructions: "Les images seront générées via DALL-E. Vous pourrez régénérer individuellement celles qui ne conviennent pas.",
  },
  {
    number: 12,
    name: "Textes alternatifs",
    slug: "alt-texts",
    description: "Créer les balises alt pour les images",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 2048,
    temperature: 0.5,
    dependsOn: [9],
    userInstructions: "Les textes alt doivent décrire l'image tout en intégrant le mot-clé naturellement. Max 125 caractères chacun.",
  },
  {
    number: 13,
    name: "Méta-données",
    slug: "meta",
    description: "Générer 5 titres et 5 méta-descriptions",
    requiresValidation: true,
    validationType: "choose-dual",
    maxTokens: 2048,
    temperature: 0.7,
    dependsOn: [7],
    userInstructions: "Choisissez un meta title (50-60 car.) et une meta description (150-160 car.) parmi les propositions.",
  },
  {
    number: 14,
    name: "Données structurées",
    slug: "structured-data",
    description: "Générer le Schema.org JSON-LD",
    requiresValidation: true,
    validationType: "edit",
    maxTokens: 3072,
    temperature: 0.3,
    dependsOn: [13],
    userInstructions: "Vérifiez le JSON-LD généré. Il sera intégré dans le HTML de l'article pour les rich snippets Google.",
  },
  {
    number: 15,
    name: "Export",
    slug: "export",
    description: "Exporter l'article (WordPress, DOCX, Markdown)",
    requiresValidation: true,
    validationType: "approve",
    maxTokens: 0,
    temperature: 0,
    dependsOn: [7, 8, 13, 14],
    userInstructions: "Choisissez le format d'export et téléchargez votre article finalisé.",
  },
];

export function getStepByNumber(stepNumber: number): StepDefinition | undefined {
  return WORKFLOW_STEPS.find((s) => s.number === stepNumber);
}

export function getStepBySlug(slug: string): StepDefinition | undefined {
  return WORKFLOW_STEPS.find((s) => s.slug === slug);
}
