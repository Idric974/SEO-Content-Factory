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

### Phase 5 - Images (à faire)
- Intégration DALL-E API
- Upload images localement (public/uploads/)
- Génération des alt texts

### Phase 6 - Export & Polish (à faire)
- Export WordPress (REST API ou XML)
- Export DOCX / Markdown
- Dashboard des coûts API
- Page settings/prompts pour éditer les templates

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
  components/
    layout/AppSidebar.tsx, Header.tsx
    workflow/StepTimeline.tsx, GenerateButton.tsx, OutputEditor.tsx,
             ValidationPanel.tsx, ChoiceSelector.tsx, StepContext.tsx,
             MetaSelector.tsx
  lib/
    prisma/client.ts            # Singleton Prisma (adapter-pg)
    claude/client.ts            # Wrapper Claude API
    claude/costs.ts             # Calcul coûts
    claude/prompts.ts           # Templates prompts
    claude/variables.ts         # Extraction variables
  config/steps.ts               # 16 étapes avec config détaillée
  hooks/useGenerate.ts          # Hook streaming SSE
```

## Notes techniques
- Prisma 7 nécessite un Driver Adapter (@prisma/adapter-pg + pg Pool) — pas de datasourceUrl
- Le Prisma client est généré dans src/generated/prisma/ — import depuis "@/generated/prisma/client"
- turbopack.root configuré avec path.resolve(__dirname) dans next.config.ts
- Toutes les pages sont des client components ("use client") sauf le layout racine
