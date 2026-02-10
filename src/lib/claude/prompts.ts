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
  webResearch?: string;
  businessObjective?: string;
  editorialFormat?: string;
  serpPAA?: string;
  serpFeatures?: string;
  serpCompetitors?: string;
  relatedSearches?: string;
  serpSummary?: string;
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

Génère exactement {{titleCount}} titres d'articles de blog SEO pour ce mot-clé.

Règles :
- Chaque titre doit contenir le mot-clé principal ou une variante proche
- Varier les formats : guide, liste, question, comparatif, tutoriel
- Titres entre 50 et 65 caractères pour le SEO
- Titres accrocheurs qui donnent envie de cliquer
- Adaptés au persona cible

Réponds uniquement avec la liste numérotée des {{titleCount}} titres, sans explication.`,
  },

  // Étape 2 : Recherche approfondie (enrichie par recherche web Tavily)
  2: {
    system: `Tu es un chercheur expert. Tu rédiges des synthèses exhaustives et factuelles en t'appuyant sur des sources web réelles. Tu cites tes sources avec les URLs fournies. Tu ne fabriques jamais de données.`,
    user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

--- SOURCES WEB (recherche automatique) ---
{{webResearch}}
--- FIN DES SOURCES WEB ---

--- ANALYSE SERP ---
Top concurrents Google :
{{serpCompetitors}}

Questions fréquentes (People Also Ask) :
{{serpPAA}}

Recherches associées : {{relatedSearches}}
--- FIN ANALYSE SERP ---

En t'appuyant prioritairement sur les sources web ci-dessus, rédige une recherche approfondie / wiki sur ce sujet. Couvre :
1. Définition et contexte
2. Historique et évolution
3. Concepts clés et terminologie
4. Statistiques et données récentes (cite les chiffres trouvés dans les sources)
5. Tendances actuelles
6. Experts et sources de référence
7. Questions fréquentes du public (intègre les PAA Google ci-dessus)
8. Controverses ou débats
9. Ce que couvrent les concurrents SERP (identifie les angles manquants)

Règles :
- Cite les sources avec leurs URLs entre parenthèses quand tu utilises une information
- Privilégie les données des sources web plutôt que tes connaissances internes
- Couvre ce que les concurrents SERP abordent ET identifie des angles différenciants
- Ajoute une section "Sources" à la fin avec la liste des URLs utilisées
- La synthèse doit servir de base documentaire pour rédiger un article de blog complet`,
  },

  // Étape 3 : Questions persona
  3: {
    system: `Tu es un expert en marketing de contenu et en compréhension des audiences. Tu identifies les questions que se pose un persona spécifique sur un sujet donné.`,
    user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Persona cible :
{{persona}}

--- Questions réelles Google (People Also Ask) ---
{{serpPAA}}
--- Fin PAA ---

Génère une liste exhaustive de questions que ce persona se poserait sur le sujet "{{keyword}}".

Intègre et enrichis les questions PAA Google ci-dessus, puis ajoute tes propres questions.

Catégorise les questions par type :
- Questions de base (découverte)
- Questions pratiques (comment faire)
- Questions de comparaison (quel est le meilleur)
- Questions d'achat/décision
- Questions avancées (pour les connaisseurs)

Génère au moins 20 questions pertinentes. Marque d'un [PAA] les questions issues de Google.`,
  },

  // Étape 4 : Intentions vs Questions
  4: {
    system: `Tu es un expert SEO spécialisé dans l'analyse des intentions de recherche et l'optimisation du contenu pour les moteurs de recherche.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"
Intentions de recherche : {{intents}}

Questions du persona :
{{questions}}

Features SERP détectées : {{serpFeatures}}
Recherches associées : {{relatedSearches}}

Croise les intentions de recherche SERP avec les questions du persona.
Pour chaque question :
1. Associe-la à une ou plusieurs intentions de recherche
2. Évalue sa priorité SEO (haute, moyenne, basse)
3. Suggère des mots-clés secondaires associés
4. Indique si elle peut cibler une feature SERP (featured snippet, PAA, etc.)

Enrichis la liste avec des questions manquantes identifiées via les intentions SERP et les recherches associées.
Priorise les questions qui peuvent déclencher des features SERP (featured snippets, PAA).
Ordonne les questions par priorité SEO décroissante.`,
  },

  // Étape 5 : Plan MECE + Information Gain
  5: {
    system: `Tu es un architecte de contenu expert. Tu crées des plans d'articles structurés selon le principe MECE (Mutuellement Exclusif, Collectivement Exhaustif). Tu vises l'Information Gain : chaque plan doit apporter de la valeur ajoutée par rapport aux concurrents.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"
Framework éditorial : {{editorialFormat}}

Questions enrichies :
{{enrichedQuestions}}

Recherche documentaire :
{{research}}

--- Questions Google (PAA) à intégrer ---
{{serpPAA}}
--- Fin PAA ---

--- Top concurrents SERP (ce qu'ils couvrent déjà) ---
{{serpCompetitors}}
--- Fin concurrents ---

Crée un plan détaillé pour cet article en suivant le framework "{{editorialFormat}}".

Structure :
- H1 (titre principal)
- H2 (sections principales, 5-8)
- H3 (sous-sections, 2-4 par H2)
- H4 si nécessaire (points spécifiques)

Règles MECE :
- Suivre la logique du framework éditorial choisi pour ordonner les sections
- Chaque section doit répondre à une ou plusieurs questions du persona
- Pas de redondance entre les sections (Mutuellement Exclusif)
- L'ensemble couvre tout le sujet (Collectivement Exhaustif)

Règles Information Gain (CRITIQUE) :
- Au moins 30% des H2 doivent proposer un angle UNIQUE absent des concurrents ci-dessus
- Pour chaque H2 unique, ajoute une annotation [IG] (Information Gain) en fin de titre
- Idées d'angles uniques à intégrer : données propriétaires, études de cas réelles, avis d'experts, outils interactifs, infographies, comparatifs originaux, retours d'expérience terrain

Règles Hn pour les LLMs :
- Chaque titre H2/H3/H4 DOIT être descriptif et autonome (compréhensible sans contexte)
- BANNIR les titres vagues : "Introduction", "Conclusion", "Étape 1", "Partie 2", "Contexte"
- UTILISER des titres comme : "Étape 1 : Préparer votre matériel de randonnée", "Pourquoi le coût varie selon la saison"
- Intègre naturellement le mot-clé ou ses variantes dans les titres

Règles PAA :
- Intègre les questions PAA Google comme sous-sections ou dans la FAQ
- Inclus une section FAQ en fin d'article avec les PAA restantes

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

  // Étape 8 : Introduction copywriting (PAS + PATT)
  8: {
    system: `Tu es un copywriter expert spécialisé dans la rédaction d'introductions d'articles de blog. Tu maîtrises les frameworks PAS et PATT pour créer des introductions qui captent l'attention et incitent à la lecture.`,
    user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Persona cible :
{{persona}}

Article (premières sections) :
{{article}}

Rédige 2 introductions différentes pour cet article (150-200 mots chacune).

Introduction 1 - Méthode PAS (Problème / Agitation / Solution) :
- Identifie le problème du persona
- Agite la douleur / les conséquences
- Présente l'article comme solution

Introduction 2 - Méthode PATT (Problème / Aperçu / Teasing / Transition) :
- Problème : identifie le problème ou besoin du persona (1-2 phrases)
- Aperçu : donne un avant-goût de la solution sans tout révéler (1-2 phrases)
- Teasing : crée de la curiosité avec une promesse concrète ou un chiffre (1 phrase)
- Transition : amène naturellement vers le premier H2 de l'article (1 phrase)

Règles CRITIQUES pour les 200 premiers mots :
- Le mot-clé principal "{{keyword}}" DOIT apparaître dans les 100 premiers mots
- Densité sémantique maximale : utiliser des variantes et co-occurrences du mot-clé
- Chaque phrase doit apporter de la valeur informationnelle
- Éviter les phrases vides ou génériques ("Dans cet article, nous allons...")
- Ton adapté au persona

Sépare clairement les deux introductions avec "## Introduction 1 - PAS" et "## Introduction 2 - PATT".`,
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

  // Étape 13 : Méta-données (enrichi Module 6)
  13: {
    system: `Tu es un expert SEO spécialisé dans l'optimisation des balises méta pour maximiser le taux de clic (CTR) dans les résultats de recherche. Tu analyses les patterns des concurrents (power words, déclencheurs psychologiques, casse, position du mot-clé) pour créer des titres supérieurs.`,
    user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Article (résumé) :
{{article}}

--- Titres des concurrents SERP ---
{{serpCompetitors}}
--- Fin concurrents ---

Analyse les titres concurrents ci-dessus et identifie les patterns gagnants (power words, chiffres, parenthèses, questions, position du mot-clé, déclencheurs psychologiques).

Génère :

**5 meta titles** (balise title) :
- Entre 50 et 60 caractères
- Contenant le mot-clé principal, idéalement en début
- Chaque titre doit utiliser un angle différent :
  1. Un titre avec chiffre/liste (ex: "7 astuces...")
  2. Un titre avec power word émotionnel (ex: "Guide ultime...")
  3. Un titre format question (ex: "Comment...?")
  4. Un titre avec parenthèses/crochets (ex: "... [Guide 2025]")
  5. Un titre direct et concis, optimisé CTR
- Inspirés des patterns gagnants des concurrents SERP mais différenciés

**5 meta descriptions** :
- Entre 150 et 160 caractères
- Contenant le mot-clé
- Avec un call-to-action implicite
- Résumant la valeur unique de l'article
- Note : la meta-description est souvent réécrite par Google — elle reste utile pour le CTR mais n'est pas critique

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
 * Prompt dédié à la rédaction section par section (step 6).
 * Génère une seule section H2 avec ses sous-sections.
 */
export const SECTION_PROMPT = {
  system: `Tu es un rédacteur web expert, spécialisé dans la rédaction d'articles de blog longs et engageants, optimisés pour le SEO. Tu rédiges une section à la fois avec profondeur et précision.

{{brand}}`,
  user: `Tu rédiges la section "{{sectionHeading}}" d'un article intitulé "{{title}}" sur le mot-clé "{{keyword}}".

Plan complet de l'article (pour contexte) :
{{plan}}

Sous-sections à couvrir dans cette partie :
- {{subsections}}

Recherche documentaire :
{{research}}

Persona cible :
{{persona}}

{{previousSectionContext}}

{{qbstContext}}

Règles de rédaction :
- Rédige UNIQUEMENT cette section (du H2 aux sous-sections H3/H4 incluses)
- Commence par "## {{sectionHeading}}"
- Couvre TOUS les H3/H4 prévus dans les sous-sections ci-dessus
- Paragraphes courts (3-4 phrases max)
- Phrases simples et directes, voix active privilégiée
- Intègre le mot-clé "{{keyword}}" naturellement (1-2 occurrences)
- Utilise des variantes et synonymes du mot-clé
- Ajoute des listes à puces quand pertinent
- Assure une transition fluide avec la section précédente
- Ton adapté au persona
- Minimum 300 mots pour cette section

Utilise le format Markdown (## pour H2, ### pour H3, etc.).`,
};

/**
 * Prompt pour la génération du TL;DR (résumé above the fold).
 */
export const TLDR_PROMPT = {
  system: `Tu es un expert en synthèse de contenu web. Tu crées des résumés concis et percutants pour le "above the fold" des articles de blog. Ton objectif est de maximiser la rétention du lecteur dès les premières secondes.`,
  user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Article :
{{article}}

Génère un TL;DR (Too Long; Didn't Read) pour cet article.

Règles :
- 2-4 phrases maximum (50-100 mots)
- Résume la valeur principale de l'article
- Inclus le mot-clé principal "{{keyword}}"
- Style direct et informatif, pas de fluff
- Doit donner envie de lire l'article complet
- Commence directement par le contenu (pas de préfixe "TL;DR :")

Ce résumé sera placé en haut de l'article, avant l'introduction, pour l'optimisation "above the fold" et le biais de primauté des LLMs.`,
};

/**
 * Prompt pour l'analyse de recommandation de médias (Module 4 — Navboost).
 * Analyse l'article + SERP pour suggérer l'ajout de médias par section.
 */
export const MEDIA_ANALYSIS_PROMPT = {
  system: `Tu es un expert en UX éditoriale et SEO visuel. Tu analyses des articles de blog pour recommander l'ajout stratégique de médias (images, infographies, schémas, vidéos) afin de maximiser l'engagement utilisateur et les signaux Navboost (temps passé, scroll, clics).`,
  user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Article optimisé :
{{article}}

--- Features SERP détectées ---
{{serpFeatures}}
--- Fin Features SERP ---

--- Concurrents SERP ---
{{serpCompetitors}}
--- Fin Concurrents ---

Analyse chaque section H2 de l'article et recommande les médias à ajouter.

Pour chaque recommandation, fournis :
- **Section** : le titre H2 exact concerné
- **Type** : un parmi [photo, infographie, schéma, vidéo, tableau]
- **Justification** : pourquoi ce média est pertinent (SERP, engagement, compréhension)
- **Description** : description courte du visuel à créer

Règles :
- Recommande 3 à 8 médias au total
- Priorise les sections complexes ou techniques (schéma/infographie)
- Si la SERP contient des vidéos ou images, recommande-les en priorité
- Si une section contient des données chiffrées, recommande un tableau ou infographie
- Format de réponse STRICT en JSON :

\`\`\`json
[
  {
    "section": "Titre H2 exact",
    "mediaType": "infographie",
    "rationale": "Cette section présente des données comparatives...",
    "suggestedDescription": "Infographie comparative des 5 solutions..."
  }
]
\`\`\`

Retourne UNIQUEMENT le bloc JSON, sans texte avant ou après.`,
};

/**
 * Prompt pour la génération du bloc auteur E-E-A-T (Module 4).
 * Génère un encart auteur justifiant l'expertise et la légitimité.
 */
export const AUTHOR_BLOCK_PROMPT = {
  system: `Tu es un expert en E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) et en personal branding. Tu crées des encarts auteur crédibles et persuasifs pour des articles de blog, optimisés pour renforcer la confiance Google et des lecteurs.`,
  user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Informations sur l'auteur/entreprise :
{{persona}}

{{brand}}

Génère un bloc "À propos de l'auteur" pour cet article. Le bloc doit :

1. Présenter l'auteur/entreprise avec son expertise sur le sujet "{{keyword}}"
2. Mentionner l'expérience concrète (années, projets, clients)
3. Inclure des éléments de crédibilité (certifications, publications, réalisations)
4. Établir le lien entre l'expertise de l'auteur et le sujet de l'article
5. Ajouter un call-to-action discret (contact, newsletter, consultation)

Règles :
- 80 à 150 mots
- Ton professionnel mais accessible
- À la 3ème personne
- Ne pas inventer de données non fournies dans le persona
- Format Markdown avec **gras** pour le nom et les éléments clés

Commence directement par le bloc, sans titre ni préfixe.`,
};

/**
 * Prompt pour la génération de modules interactifs no-code (Module 4).
 * Génère des widgets HTML/CSS/JS autonomes.
 */
export const INTERACTIVE_MODULE_PROMPT = {
  system: `Tu es un développeur front-end expert en création de widgets interactifs légers. Tu génères du code HTML/CSS/JS autonome, propre et accessible, conçu pour être intégré dans des articles de blog WordPress. Le code doit fonctionner sans dépendance externe.`,
  user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Article (résumé pour contexte) :
{{article}}

Type de module demandé : **{{moduleType}}**

Génère un widget interactif de type "{{moduleType}}" en rapport avec le sujet "{{keyword}}".

Spécifications selon le type :
- **calculator** : Formulaire avec 2-4 champs de saisie, calcul en temps réel, affichage du résultat avec explication
- **quiz** : 5 questions à choix multiples, score final avec interprétation, bouton recommencer
- **selector** : Arbre de décision à 3-4 étapes, sélection progressive, recommandation finale personnalisée

Règles techniques :
- Code HTML/CSS/JS dans un seul bloc \`<div>\` autonome
- Styles en \`<style>\` inline (scoped avec une classe unique)
- JavaScript en \`<script>\` inline
- Design responsive (fonctionne sur mobile)
- Couleurs neutres et professionnelles
- Pas de dépendance externe (pas de CDN, jQuery, etc.)
- Le widget doit être interactif et fonctionnel
- Taille max : ~200 lignes

Format de réponse : retourne UNIQUEMENT le code HTML complet du widget, sans backticks ni commentaire avant/après.`,
};

/**
 * Prompt pour le fact-checking des affirmations (Module 5 — Qualité).
 * Étape 1 : extraction des affirmations. Étape 2 : évaluation avec sources web.
 */
export const FACT_CHECK_EXTRACT_PROMPT = {
  system: `Tu es un expert en vérification de faits (fact-checker) spécialisé dans le contenu web. Tu identifies les affirmations factuellement vérifiables dans un texte : chiffres, statistiques, dates, noms propres, comparaisons, tendances, et toute assertion pouvant être vraie ou fausse.`,
  user: `Article à vérifier :
{{article}}

Extrais toutes les affirmations factuellement vérifiables de cet article.

Pour chaque affirmation, génère une requête de recherche web concise permettant de la vérifier.

Format JSON strict :

\`\`\`json
[
  {
    "claim": "L'affirmation exacte extraite de l'article",
    "searchQuery": "requête de recherche web pour vérifier cette affirmation"
  }
]
\`\`\`

Règles :
- Maximum 10 affirmations (priorise chiffres, stats, dates)
- Ignore les opinions, conseils généraux et évidences
- Retourne UNIQUEMENT le bloc JSON`,
};

export const FACT_CHECK_EVALUATE_PROMPT = {
  system: `Tu es un expert en vérification de faits. Tu évalues des affirmations en te basant sur des sources web. Tu es rigoureux et honnête : si tu ne peux pas confirmer, tu le dis clairement.`,
  user: `Évalue chaque affirmation ci-dessous en te basant sur les résultats de recherche web fournis.

Affirmations et sources :
{{claimsWithSources}}

Pour chaque affirmation, donne :
- **verdict** : "confirmé", "douteux" ou "non_vérifié"
- **confidence** : pourcentage de confiance (0-100)
- **justification** : explication courte
- **source** : URL de la source la plus pertinente (si trouvée)
- **suggestion** : correction suggérée si l'affirmation est douteuse

Format JSON strict :

\`\`\`json
[
  {
    "claim": "L'affirmation",
    "verdict": "confirmé",
    "confidence": 85,
    "justification": "Confirmé par...",
    "source": "https://...",
    "suggestion": null
  }
]
\`\`\`

Retourne UNIQUEMENT le bloc JSON.`,
};

/**
 * Prompt pour la critique subjective par IA (Module 5 — Qualité).
 */
export const AI_CRITIQUE_PROMPT = {
  system: `Tu es un éditeur en chef exigeant et constructif. Tu analyses des articles de blog avec un regard critique mais bienveillant. Tu ne fais pas de compliments gratuits — chaque remarque doit être actionnable et spécifique. Tu évalues selon 5 axes : originalité, profondeur, engagement, crédibilité, et structure.`,
  user: `Titre : "{{title}}"
Mot-clé : "{{keyword}}"

Persona cible :
{{persona}}

Article à critiquer :
{{article}}

Analyse cet article en profondeur selon 5 axes. Pour chaque axe, donne :
- Une note sur 10
- Ce qui fonctionne bien (1-2 points)
- Ce qui doit être amélioré (1-2 points concrets et actionnables)

Les 5 axes :

1. **Originalité** — L'article apporte-t-il de la valeur ajoutée par rapport aux contenus existants ? Y a-t-il des angles uniques, des données originales ?

2. **Profondeur** — Les sujets sont-ils traités en profondeur ? Y a-t-il des sections superficielles ou du "fluff" (remplissage) ?

3. **Engagement** — Le lecteur a-t-il envie de continuer ? Les accroches, transitions et CTA sont-ils efficaces pour le persona ?

4. **Crédibilité** — Les sources sont-elles citées ? Les affirmations sont-elles étayées ? Le ton inspire-t-il confiance ?

5. **Structure** — La hiérarchie Hn est-elle logique ? La progression est-elle fluide ? Les paragraphes sont-ils digestes ?

Termine par :
- Un **score global** sur 100
- Les **3 actions prioritaires** pour améliorer cet article

Format de réponse STRICT en JSON :

\`\`\`json
{
  "axes": [
    {
      "name": "Originalité",
      "score": 7,
      "strengths": ["Point fort 1", "Point fort 2"],
      "improvements": ["Amélioration 1", "Amélioration 2"]
    }
  ],
  "overallScore": 72,
  "priorityActions": ["Action 1", "Action 2", "Action 3"]
}
\`\`\`

Retourne UNIQUEMENT le bloc JSON.`,
};

/**
 * Prompt pour l'analyse de maillage interne sémantique (Module 6).
 * Analyse l'article + pages du site client pour proposer des liens internes.
 */
export const INTERNAL_LINKS_PROMPT = {
  system: `Tu es un expert SEO spécialisé dans le maillage interne. Tu analyses un article et les pages existantes d'un site web pour identifier les opportunités de liens internes basés sur la proximité sémantique réelle, pas sur la correspondance exacte de mots-clés. Tu considères aussi la fraîcheur des contenus et la pertinence du contexte.`,
  user: `Titre de l'article : "{{title}}"
Mot-clé : "{{keyword}}"

Article à mailler :
{{article}}

--- Pages existantes du site client ---
{{sitePages}}
--- Fin pages du site ---

Analyse l'article et les pages existantes du site pour proposer des liens internes pertinents.

Pour chaque suggestion de lien, fournis :
- **anchor** : le texte d'ancre naturel à utiliser (pas de correspondance exacte systématique, varier les formulations)
- **targetUrl** : l'URL de la page cible
- **targetTitle** : le titre de la page cible
- **relevanceScore** : score de pertinence sémantique (0-100)
- **articleContext** : la phrase de l'article où insérer le lien (citation exacte)
- **freshnessNote** : suggestion de mise à jour de la page source si pertinent (null sinon)

Règles :
- Maximum 5-8 liens internes (environ 1 pour 300 mots)
- Les liens doivent être sémantiquement pertinents (proximité thématique réelle)
- Varier les textes d'ancre (pas que des mots-clés exacts)
- Prioriser les pages piliers et les contenus complémentaires
- Placer les liens naturellement dans le flux de lecture
- Si une page source mériterait une mise à jour pour accueillir ce nouveau lien, le signaler

Format JSON strict :

\`\`\`json
[
  {
    "anchor": "texte d'ancre naturel",
    "targetUrl": "https://...",
    "targetTitle": "Titre de la page cible",
    "relevanceScore": 85,
    "articleContext": "Phrase exacte de l'article où placer le lien",
    "freshnessNote": "Suggérer d'ajouter un paragraphe sur X dans cette page pour renforcer le lien"
  }
]
\`\`\`

Retourne UNIQUEMENT le bloc JSON.`,
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
