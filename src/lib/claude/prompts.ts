/**
 * Système de templates de prompts avec injection de variables.
 * Variables supportées : {{keyword}}, {{title}}, {{persona}}, {{brand}},
 * {{research}}, {{questions}}, {{plan}}, {{article}}, {{intents}}, etc.
 */

export interface PromptVariables {
  keyword?: string;
  title?: string;
  persona?: string;
  brand?: string;
  research?: string;
  questions?: string;
  enrichedQuestions?: string;
  plan?: string;
  article?: string;
  intents?: string;
  imagePrompts?: string;
  metaData?: string;
  [key: string]: string | undefined;
}

/**
 * Remplace les variables {{var}} dans un template
 */
export function interpolate(template: string, variables: PromptVariables): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    return variables[key] ?? match;
  });
}

/**
 * Prompts par défaut pour chaque étape du workflow.
 * step_number → { system, user }
 */
export const DEFAULT_PROMPTS: Record<number, { system: string; user: string }> = {
  // Étape 1 : Génération de titres
  1: {
    system: `Tu es un expert SEO et rédacteur web senior. Tu génères des titres d'articles de blog optimisés pour le référencement naturel.`,
    user: `Mot-clé principal : "{{keyword}}"
Intentions de recherche : {{intents}}

{{persona}}

Génère exactement 10 titres d'articles de blog SEO pour ce mot-clé.

Règles :
- Chaque titre doit contenir le mot-clé principal ou une variante proche
- Varier les formats : guide, liste, question, comparatif, tutoriel
- Titres entre 50 et 65 caractères pour le SEO
- Titres accrocheurs qui donnent envie de cliquer
- Adaptés au persona cible

Réponds uniquement avec la liste numérotée des 10 titres, sans explication.`,
  },

  // Étape 2 : Recherche approfondie
  2: {
    system: `Tu es un chercheur expert. Tu rédiges des synthèses exhaustives et factuelles sur n'importe quel sujet, en structurant l'information de manière claire.`,
    user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Rédige une recherche approfondie / wiki sur ce sujet. Couvre :
1. Définition et contexte
2. Historique et évolution
3. Concepts clés et terminologie
4. Statistiques et données récentes
5. Tendances actuelles
6. Experts et sources de référence
7. Questions fréquentes du public
8. Controverses ou débats

La synthèse doit être factuelle, sourcée quand possible, et servir de base documentaire pour rédiger un article de blog complet.`,
  },

  // Étape 3 : Questions persona
  3: {
    system: `Tu es un expert en marketing de contenu et en compréhension des audiences. Tu identifies les questions que se pose un persona spécifique sur un sujet donné.`,
    user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Persona cible :
{{persona}}

Génère une liste exhaustive de questions que ce persona se poserait sur le sujet "{{keyword}}".

Catégorise les questions par type :
- Questions de base (découverte)
- Questions pratiques (comment faire)
- Questions de comparaison (quel est le meilleur)
- Questions d'achat/décision
- Questions avancées (pour les connaisseurs)

Génère au moins 20 questions pertinentes.`,
  },

  // Étape 4 : Intentions vs Questions
  4: {
    system: `Tu es un expert SEO spécialisé dans l'analyse des intentions de recherche et l'optimisation du contenu pour les moteurs de recherche.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"
Intentions de recherche : {{intents}}

Questions du persona :
{{questions}}

Croise les intentions de recherche SERP avec les questions du persona.
Pour chaque question :
1. Associe-la à une ou plusieurs intentions de recherche
2. Évalue sa priorité SEO (haute, moyenne, basse)
3. Suggère des mots-clés secondaires associés

Enrichis la liste avec des questions manquantes identifiées via les intentions SERP.
Ordonne les questions par priorité SEO décroissante.`,
  },

  // Étape 5 : Plan MECE
  5: {
    system: `Tu es un architecte de contenu expert. Tu crées des plans d'articles structurés selon le principe MECE (Mutuellement Exclusif, Collectivement Exhaustif).`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Questions enrichies :
{{enrichedQuestions}}

Recherche documentaire :
{{research}}

Crée un plan MECE détaillé pour cet article avec :
- H1 (titre principal)
- H2 (sections principales, 5-8)
- H3 (sous-sections, 2-4 par H2)
- H4 si nécessaire (points spécifiques)

Règles :
- Chaque section doit répondre à une ou plusieurs questions du persona
- Pas de redondance entre les sections (Mutuellement Exclusif)
- L'ensemble couvre tout le sujet (Collectivement Exhaustif)
- Intègre naturellement le mot-clé et ses variantes
- Inclus une section FAQ en fin d'article

Présente le plan avec la hiérarchie Hn claire.`,
  },

  // Étape 6 : Rédaction article
  6: {
    system: `Tu es un rédacteur web expert, spécialisé dans la rédaction d'articles de blog longs et engageants, optimisés pour le SEO.

{{brand}}`,
    user: `Titre : "{{title}}"
Mot-clé principal : "{{keyword}}"

Plan de l'article :
{{plan}}

Recherche documentaire :
{{research}}

Persona cible :
{{persona}}

Rédige l'article complet en suivant strictement le plan fourni.

Règles de rédaction :
- Minimum 2000 mots
- Paragraphes courts (3-4 phrases max)
- Phrases simples et directes
- Voix active privilégiée
- Intégrer le mot-clé naturellement (densité ~1-2%)
- Utiliser des variantes et synonymes du mot-clé
- Ajouter des listes à puces quand pertinent
- Transitions fluides entre les sections
- Ton adapté au persona
- Ne PAS écrire l'introduction (elle sera générée séparément)
- Commencer directement au premier H2

Utilise le format Markdown pour la mise en forme (## pour H2, ### pour H3, etc.).`,
  },

  // Étape 7 : Optimisation SEO
  7: {
    system: `Tu es un consultant SEO senior spécialisé dans l'optimisation on-page. Tu optimises les articles pour maximiser leur classement dans les résultats de recherche.`,
    user: `Mot-clé principal : "{{keyword}}"

Article à optimiser :
{{article}}

Optimise cet article pour le SEO :
1. Vérifie et ajuste la densité du mot-clé (1-2%)
2. Ajoute des variantes sémantiques et mots-clés LSI
3. Optimise les titres Hn (mot-clé en H1, variantes en H2/H3)
4. Ajoute des liens internes suggérés (placeholders [lien interne : sujet])
5. Vérifie la lisibilité (phrases courtes, paragraphes aérés)
6. Ajoute des éléments d'engagement (questions rhétoriques, CTA)
7. Optimise pour les featured snippets (listes, définitions, tableaux)

Renvoie l'article complet optimisé en Markdown, avec un résumé des modifications en fin de document.`,
  },

  // Étape 8 : Introduction copywriting
  8: {
    system: `Tu es un copywriter expert spécialisé dans la rédaction d'introductions d'articles de blog qui captent l'attention et incitent à la lecture.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Persona cible :
{{persona}}

Article (premières sections) :
{{article}}

Rédige 2 introductions différentes pour cet article (150-200 mots chacune).

Introduction 1 - Style "Problème / Agitation / Solution" (PAS) :
- Identifie le problème du persona
- Agite la douleur
- Présente l'article comme solution

Introduction 2 - Style "Accroche statistique / fait surprenant" :
- Commence par une stat ou un fait marquant
- Crée la curiosité
- Annonce la valeur de l'article

Chaque introduction doit :
- Contenir le mot-clé dans les 100 premiers mots
- Donner envie de lire la suite
- Être adaptée au ton du persona

Sépare clairement les deux introductions avec un titre "## Introduction 1" et "## Introduction 2".`,
  },

  // Étape 9 : Titres images
  9: {
    system: `Tu es un expert SEO spécialisé dans l'optimisation des images pour le référencement naturel.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Article :
{{article}}

Pour chaque section principale (H2) de l'article, génère un nom de fichier SEO pour l'image d'illustration.

Règles pour les noms de fichiers :
- Format : mot-cle-description-courte.jpg
- Tout en minuscules
- Tirets entre les mots (pas d'underscores ni espaces)
- Inclure le mot-clé ou une variante
- Maximum 5 mots
- Descriptif du contenu visuel attendu

Format de réponse pour chaque image :
- Section : [titre H2]
- Fichier : [nom-du-fichier.jpg]
- Description : [courte description du visuel attendu]`,
  },

  // Étape 10 : Prompts illustrations
  10: {
    system: `Tu es un expert en génération d'images par IA. Tu rédiges des prompts détaillés et efficaces pour créer des illustrations professionnelles.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Titres et descriptions des images :
{{imagePrompts}}

Pour chaque image listée, génère un prompt détaillé pour DALL-E 3.

Chaque prompt doit :
- Décrire précisément la scène ou le concept
- Spécifier le style visuel (photo réaliste, illustration flat, infographie...)
- Indiquer les couleurs dominantes
- Préciser l'ambiance et l'éclairage
- Être en anglais (meilleur résultat avec DALL-E)
- Faire 2-3 phrases

Format :
- Image : [nom-du-fichier.jpg]
- Prompt : [prompt détaillé en anglais]`,
  },

  // Étape 12 : Textes alternatifs
  12: {
    system: `Tu es un expert en accessibilité web et SEO. Tu rédiges des textes alternatifs (attribut alt) optimisés pour l'accessibilité et le référencement.`,
    user: `Mot-clé : "{{keyword}}"

Images de l'article :
{{imagePrompts}}

Pour chaque image, rédige un texte alternatif (attribut alt) qui :
- Décrit le contenu de l'image de manière concise (125 caractères max)
- Intègre le mot-clé ou une variante quand c'est naturel
- Est utile pour les personnes malvoyantes
- Ne commence pas par "Image de" ou "Photo de"

Format :
- Fichier : [nom-du-fichier.jpg]
- Alt : [texte alternatif]`,
  },

  // Étape 13 : Méta-données
  13: {
    system: `Tu es un expert SEO spécialisé dans l'optimisation des balises méta pour maximiser le taux de clic (CTR) dans les résultats de recherche.`,
    user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Article (résumé) :
{{article}}

Génère :

**5 meta titles** (balise title) :
- Entre 50 et 60 caractères
- Contenant le mot-clé principal
- Accrocheurs et incitant au clic
- Variés dans leur approche

**5 meta descriptions** :
- Entre 150 et 160 caractères
- Contenant le mot-clé
- Avec un call-to-action implicite
- Résumant la valeur de l'article

Format clair avec numérotation.`,
  },

  // Étape 14 : Données structurées
  14: {
    system: `Tu es un expert en données structurées et Schema.org. Tu génères du JSON-LD valide et optimisé pour les rich snippets Google.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Méta-données choisies :
{{metaData}}

Article :
{{article}}

Génère le code JSON-LD Schema.org pour cet article de blog.

Inclus :
1. @type: "Article" (ou "BlogPosting")
2. headline, description, author
3. datePublished, dateModified
4. image (placeholder)
5. FAQ Schema si l'article contient une section FAQ (extrais les questions/réponses)

Le JSON doit être valide et prêt à être intégré dans une balise <script type="application/ld+json">.`,
  },
};

/**
 * Construit les prompts système et utilisateur pour une étape donnée.
 */
export function buildPrompts(
  stepNumber: number,
  variables: PromptVariables,
  customSystem?: string,
  customUser?: string
): { systemPrompt: string; userPrompt: string } {
  const defaults = DEFAULT_PROMPTS[stepNumber];

  const systemTemplate = customSystem ?? defaults?.system ?? "";
  const userTemplate = customUser ?? defaults?.user ?? "";

  return {
    systemPrompt: interpolate(systemTemplate, variables),
    userPrompt: interpolate(userTemplate, variables),
  };
}
