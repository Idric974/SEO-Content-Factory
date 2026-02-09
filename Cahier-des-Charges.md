# Cahier des Charges : Application "Content Architect AI"

## 1. Vision et Objectifs
L'application doit guider le rédacteur à travers un processus en 7 étapes, allant de la définition de l'objectif à la mesure du ROI. Elle ne doit pas être un simple générateur de texte "en un clic", mais un assistant piloté par l'IA qui force l'ajout de valeur ajoutée (Information Gain) pour éviter le contenu générique,.

---

## 2. Module 1 : Définition du Scope et de la Stratégie
**Objectif :** Cadrer le contenu pour qu'il réponde à une intention précise et un objectif business.

### Fonctionnalités Clés :
*   **Sélecteur d'Objectif Business :** L'utilisateur doit pouvoir sélectionner l'objectif du contenu selon 4 types de lecteurs (Explorateur, Évaluateur, Convaincu en attente, Décisionnaire). Cela influencera les suggestions de *Call to Action* (CTA).
*   **Analyseur de SERP (Google & Glue) :**
    *   Scraper la SERP pour identifier les formats dominants (Vidéos, Tableaux, Listes, Guides),.
    *   Détecter les éléments enrichis (Featured Snippets, PAA) pour recommander le format technique de la page (ex: intégration obligatoire d'une vidéo si présente dans la SERP).
*   **Recommandation de Format Éditorial :**
    *   Suggérer le framework de rédaction adapté (PAS, AIDA, MECE, Pyramide inversée) en analysant les concurrents,.
    *   *Exemple :* Si la requête est un problème douloureux, suggérer le format PAS (Problème - Agiter - Solution).

---

## 3. Module 2 : Structuration (Le Plan)
**Objectif :** Créer une structure logique qui séduit les algorithmes et les LLMs par sa clarté.

### Fonctionnalités Clés :
*   **Générateur de Plan "Information Gain" :**
    *   Proposer des plans qui couvrent 100% du sujet (MECE) tout en exigeant **30% d'angle unique** par rapport à la concurrence.
    *   Intégrer automatiquement des idées de valeur ajoutée : Données propriétaires, Études de cas, Interviews d'experts, Outils interactifs.
*   **Intégration des PAA (People Also Ask) :**
    *   Récupérer les PAA et les insérer logiquement dans le plan, car elles servent à entraîner les LLMs,.
*   **Optimisation des Titres (Hn) pour LLMs :**
    *   Assistant de réécriture des titres pour qu'ils soient **descriptifs et désambiguïsés**.
    *   *Règle :* Bannir les titres vagues comme "Introduction" ou "Étape 1". Remplacer par "Étape 1 : Préparer votre matériel de randonnée" pour faciliter l'extraction par les LLMs,.
*   **Analyseur de Trous Sémantiques (Hn) :**
    *   Comparer les termes utilisés dans les Hn du plan versus ceux des concurrents (Code couleur : Rouge = Manquant, Jaune = Unique/Gagnant).

---

## 4. Module 3 : Rédaction Assistée (Co-pilote)
**Objectif :** Rédiger un contenu expert, section par section, en injectant la marque et en évitant le "fluff" (remplissage).

### Fonctionnalités Clés :
*   **Gestionnaire de Contexte (Brand & Persona) :**
    *   L'utilisateur doit pouvoir uploader son "Tone of Voice" (ex: exemples d'anciens articles) et définir son Persona. Ces données sont injectées dans chaque prompt,.
*   **Rédaction Itérative (Section par Section) :**
    *   Interdiction de générer l'article en une fois. L'application doit générer section par section pour garantir la profondeur et permettre la relecture.
    *   Intégration des termes saillants (QBST - Query-Based Salient Terms) dans chaque section.
*   **Optimisation "TL;DR" (Too Long; Didn't Read) :**
    *   Générateur automatique d'un résumé TL;DR à placer au-dessus de la ligne de flottaison (optimisation pour le biais de primauté des LLMs et l'UX mobile),.
*   **Générateur d'Introduction PATT :**
    *   Module spécifique pour rédiger l'intro selon le modèle Problème – Aperçu – Teasing – Transition.
    *   Optimisation sémantique forte des 200 premiers mots.

---

## 5. Module 4 : Mise en Page et UX (Navboost)
**Objectif :** Maximiser les signaux utilisateurs (temps passé, scroll, clics) analysés par l'algorithme Navboost.

### Fonctionnalités Clés :
*   **Recommandation de Média :**
    *   Suggérer l'ajout d'images ou de vidéos là où la SERP l'exige.
    *   Intégration d'API (type Gemini/DALL-E) pour générer des schémas ou infographies explicatives.
*   **Générateur de Modules Interactifs (No-Code) :**
    *   Bibliothèque de prompts pour créer des widgets simples (Calculateurs, Quiz, Sélecteurs) à intégrer en HTML/JS. Cela augmente l'interaction utilisateur.
*   **Bloc Auteur (E-E-A-T) :**
    *   Générateur automatique d'un encart "Auteur" justifiant l'expertise et la légitimité (critère "Trust" de Google).

---

## 6. Module 5 : Relecture et Qualité (Quality Score)
**Objectif :** Assurer la facticité et la qualité linguistique ("Knowledge Density").

### Fonctionnalités Clés :
*   **Agent de Fact-Checking :**
    *   IA dédiée (ex: via DeepSearch ou Perplexity API) pour vérifier les allégations, chiffres et concepts du texte généré.
*   **Score de Qualité Objective (NLP) :**
    *   Analyse de la diversité lexicale (cible : 60-80% de mots uniques).
    *   Détection et réduction des verbes modaux (pouvoir, devoir) et de la voix passive pour améliorer la clarté et l'interprétation par les machines,.
    *   Alerte sur les phrases trop longues ou complexes (Lisibilité Flesch-Kincaid adaptée).
*   **Critique Subjective par IA :**
    *   Un agent "Critique" qui analyse le brouillon et pose des questions difficiles : "Qu'est-ce qui est ennuyeux ?", "Qu'est-ce que tu n'as pas cru ?".

---

## 7. Module 6 : Optimisation Technique & Maillage
**Objectif :** Peaufiner les métadonnées et la structure des liens.

### Fonctionnalités Clés :
*   **Générateur de Title Tag :**
    *   Proposer 5 variantes de balises Titre en analysant les mots-clés, la casse et les déclencheurs psychologiques des concurrents (ex: retirer "Compare", ajouter des parenthèses),.
    *   *Note :* Désactiver ou rendre optionnelle la génération de Méta-description (faible ROI, souvent réécrite par Google).
*   **Assistant de Maillage Interne Sémantique :**
    *   Ne pas utiliser la méthode `site:`. L'app doit scanner le site de l'utilisateur et proposer des liens basés sur la **proximité sémantique** réelle.
    *   Suggérer la mise à jour du contenu de la page source (l'ancien article) pour valider la pertinence du nouveau lien (Freshness update).

---

## 8. Module 7 : Analytics & ROI (Post-publication)
**Objectif :** Mesurer la rentabilité réelle du contenu, au-delà des clics.

### Fonctionnalités Clés :
*   **Tableau de Bord de Rentabilité :**
    *   Calculateur intégré : Coût de production (TJM x Temps) vs Valeur des conversions.
    *   Suivi des métriques d'engagement "réelles" : Trafic issu des messageries (Dark social), Temps passé, Conversions.

---

## Contraintes Techniques & IA
*   **Modèles d'IA :** Utiliser des modèles de "Réflexion" (type o1 ou Claude Thinking) pour la phase de structuration/plan, et des modèles plus créatifs/rapides pour la rédaction section par section.
*   **Nettoyage de Code :** L'export HTML doit être propre, sans balises parasites d'IA (ex: `data-start`, `data-end`) qui pourraient signaler un contenu généré artificiellement,.

Ce cahier des charges assure la création d'une application qui ne se contente pas de produire du texte, mais qui bâtit des **actifs numériques durables** en suivant la méthodologie "Pertinence + Longévité + Rentabilité".