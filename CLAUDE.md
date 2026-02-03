# SEO Content Factory - Journal de développement

## Description du projet
Application web locale pour produire des articles de blog SEO de A à Z, avec un workflow de 16 étapes et validation humaine à chaque étape.

## Stack technique
- **Frontend** : Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui
- **Backend** : Next.js API Routes
- **BDD** : PostgreSQL local (Prisma 7 + @prisma/adapter-pg)
- **LLM** : Claude API (Anthropic SDK)
- **Images** : OpenAI DALL-E 3 (prévu)
- **ORM** : Prisma 7 avec Driver Adapter (pg Pool)

## Connexion BDD
- PostgreSQL 18 sur localhost:5432
- Base : `seo_content_factory`
- User : `postgres`
- Le mot de passe est dans `.env` (DATABASE_URL)

## Avancement

### Phase 1 - Fondations ✅
- Setup Next.js 16 + TypeScript + Tailwind CSS + ESLint
- shadcn/ui initialisé (19 composants)
- Prisma 7 + PostgreSQL local avec adapter-pg
- Schéma BDD (6 tables : clients, projects, workflow_steps, prompt_templates, generated_images, api_usage_logs)
- Migration initiale appliquée
- Layout avec sidebar de navigation (AppSidebar)
- Page dashboard avec liste des projets
- Configuration des 16 étapes du workflow (src/config/steps.ts)
- Types TypeScript (src/types/workflow.ts)

### Phase 2 - CRUD de base ✅
- API Routes clients : GET/POST /api/clients, GET/PUT/DELETE /api/clients/[id]
- API Routes projets : GET/POST /api/projects, GET/PUT/DELETE /api/projects/[id]
- Page liste clients avec création/suppression via dialog
- Page édition client avec 3 onglets (Général, Persona, Charte éditoriale)
- Page création projet (sélection client, mot-clé, intentions)
- Page vue projet avec timeline des étapes + stats coût
- Composant StepTimeline (validated/current/locked)

### Phase 3 - Moteur de workflow ✅
- Wrapper Claude API (generate + generateStream) : src/lib/claude/client.ts
- Calcul des coûts par modèle : src/lib/claude/costs.ts
- 12 prompts templates avec variables {{keyword}}, {{persona}}, etc. : src/lib/claude/prompts.ts
- Extraction automatique des variables depuis le projet : src/lib/claude/variables.ts
- API streaming SSE /api/generate/[step] avec sauvegarde BDD + log coûts
- API GET/PUT /api/projects/[id]/steps/[step] pour validation
- Hook useGenerate (streaming SSE côté client)
- Composants : GenerateButton, OutputEditor, ValidationPanel, ChoiceSelector

### Phase 4 - Les 15 étapes ✅
- Config par étape (maxTokens, temperature, dependsOn, userInstructions)
- Étape 0 : récapitulatif projet (client, mot-clé, intentions, persona)
- Étape 1 : choix du titre → mise à jour automatique du titre projet
- Étape 8 : sélection entre 2 introductions
- Étape 13 : MetaSelector avec double sélection (title + description) + compteur caractères
- Composant StepContext : instructions + données des étapes dépendantes
- API generate utilise maxTokens/temperature du config par étape
- Étapes 11 (DALL-E) et 15 (export) : placeholder "prochaine phase"

### Phase 5 - Images ✅
- Wrapper DALL-E 3 (src/lib/openai/dalle.ts) : generateImage + parseImagePrompts
- API /api/images : POST génération unitaire, PUT parsing batch des prompts étape 10
- Composant ImageGallery : grille d'images avec génération individuelle/batch
- Composant StepImages : orchestration complète de l'étape 11
- Stockage local dans public/uploads/images/{projectId}/
- Logging des coûts DALL-E dans api_usage_logs
- Étape 11 intégrée dans la page étape (plus de placeholder)

### Phase 6 - Export & Polish ✅
- Dashboard coûts API (/settings/costs) : résumé, graphique 7 jours, détail par modèle/projet, logs récents
- Éditeur de prompts (/settings/prompts) : modification des templates par étape avec sauvegarde en BDD, retour au défaut
- API /api/prompts : CRUD templates, intégré dans le moteur de génération
- API /api/costs : agrégations par provider, modèle, projet, période
- Bibliothèque export (src/lib/export/) : assemblage article, Markdown, DOCX, WordPress HTML/REST API
- API /api/export : endpoint unifié pour tous les formats (markdown, docx, html, wordpress, preview)
- Composant StepExport : prévisualisation, téléchargement MD/DOCX/HTML, copier HTML, publication WordPress REST API
- Étape 15 intégrée (plus de placeholder), marque le projet comme "completed"

## Structure des fichiers clés
```
src/
  app/
    dashboard/page.tsx          # Liste projets
    clients/page.tsx            # Liste clients
    clients/[id]/page.tsx       # Édition client + persona
    projects/new/page.tsx       # Création projet
    projects/[id]/page.tsx      # Vue projet + timeline
    projects/[id]/steps/[step]/page.tsx  # Page étape complète
    api/clients/route.ts        # CRUD clients
    api/projects/route.ts       # CRUD projets
    api/projects/[id]/route.ts  # Projet par ID
    api/projects/[id]/steps/[step]/route.ts  # Validation étapes
    api/generate/[step]/route.ts  # Génération Claude SSE
    api/images/route.ts         # Génération images DALL-E
    api/costs/route.ts          # Dashboard coûts API
    api/prompts/route.ts        # CRUD templates prompts
    api/export/route.ts         # Export article (MD, DOCX, HTML, WP)
    settings/costs/page.tsx     # Page dashboard coûts
    settings/prompts/page.tsx   # Page éditeur prompts
  components/
    layout/AppSidebar.tsx, Header.tsx
    workflow/StepTimeline.tsx, GenerateButton.tsx, OutputEditor.tsx,
             ValidationPanel.tsx, ChoiceSelector.tsx, StepContext.tsx,
             MetaSelector.tsx, ImageGallery.tsx, StepImages.tsx,
             StepExport.tsx
  lib/
    prisma/client.ts            # Singleton Prisma (adapter-pg)
    claude/client.ts            # Wrapper Claude API
    claude/costs.ts             # Calcul coûts
    claude/prompts.ts           # Templates prompts (défauts + BDD)
    claude/variables.ts         # Extraction variables
    openai/dalle.ts             # Wrapper DALL-E 3 + parser prompts
    export/assemble.ts          # Assemblage article final
    export/markdown.ts          # Export Markdown
    export/docx.ts              # Export DOCX (lib docx)
    export/wordpress.ts         # Export WordPress (REST API + HTML)
  config/steps.ts               # 16 étapes avec config détaillée
  hooks/useGenerate.ts          # Hook streaming SSE
```

## Notes techniques
- Prisma 7 nécessite un Driver Adapter (@prisma/adapter-pg + pg Pool) — pas de datasourceUrl
- Le Prisma client est généré dans src/generated/prisma/ — import depuis "@/generated/prisma/client"
- turbopack.root configuré avec path.resolve(__dirname) dans next.config.ts
- Toutes les pages sont des client components ("use client") sauf le layout racine
