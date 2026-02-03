# SEO Content Factory - Cahier des Charges Technique

## 1. Vue d'ensemble

**Objectif** : Application web locale permettant de produire des articles de blog SEO de A à Z, en suivant un workflow structuré avec validation humaine à chaque étape.

**Stack technique** :
- **Frontend** : Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend** : Next.js API Routes
- **Base de données** : Supabase (PostgreSQL + Auth + Storage)
- **LLM** : Claude API (Anthropic)
- **Images** : OpenAI DALL-E 3 API (ou Replicate pour Stable Diffusion)
- **Hébergement** : Local (npm run dev)

---

## 2. Architecture technique

```
┌─────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│  /app                                                               │
│    ├─ /dashboard          → Liste des projets                       │
│    ├─ /projects/[id]      → Vue détaillée d'un projet               │
│    │    └─ /steps/[step]  → Étape du workflow                       │
│    ├─ /clients            → Gestion des clients                     │
│    └─ /settings           → Configuration (API keys, prompts)       │
├─────────────────────────────────────────────────────────────────────┤
│  /components                                                        │
│    ├─ workflow/           → Composants du pipeline                  │
│    ├─ editor/             → Éditeur de texte riche                  │
│    └─ ui/                 → shadcn/ui components                    │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      API ROUTES (Next.js)                           │
├─────────────────────────────────────────────────────────────────────┤
│  /api                                                               │
│    ├─ /projects           → CRUD projets                            │
│    ├─ /clients            → CRUD clients                            │
│    ├─ /generate           → Appels Claude API                       │
│    │    ├─ /titles        → Génération titres                       │
│    │    ├─ /research      → Recherche approfondie                   │
│    │    ├─ /questions     → Questions persona                       │
│    │    ├─ /plan          → Plan MECE                               │
│    │    ├─ /article       → Rédaction article                       │
│    │    ├─ /optimize      → Optimisation SEO                        │
│    │    ├─ /meta          → Méta-données                            │
│    │    └─ /image-prompt  → Prompts pour images                     │
│    ├─ /images             → Génération images (DALL-E)              │
│    └─ /export             → Export (WordPress, DOCX, MD)            │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          SUPABASE                                   │
├─────────────────────────────────────────────────────────────────────┤
│  PostgreSQL                          │  Storage                     │
│    ├─ clients                        │    └─ project-assets/        │
│    ├─ projects                       │         ├─ images/           │
│    ├─ workflow_steps                 │         └─ exports/          │
│    ├─ prompts_templates              │                              │
│    └─ api_usage_logs                 │                              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Schéma de base de données

```sql
-- Clients (Les Broderies de Paris, Scalefast, etc.)
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  persona JSONB, -- Données du persona (Sophie Dubois, etc.)
  brand_guidelines JSONB, -- Charte graphique, ton, mots interdits
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projets (un article = un projet)
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  keyword TEXT NOT NULL, -- Mot-clé principal
  search_intents TEXT[], -- Intentions de recherche
  status TEXT DEFAULT 'draft', -- draft, in_progress, completed, published
  current_step INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Étapes du workflow (output de chaque étape)
CREATE TABLE workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_number INTEGER NOT NULL, -- 0 à 15
  step_name TEXT NOT NULL,
  input_data JSONB, -- Données d'entrée (prompt variables)
  output_data JSONB, -- Résultat généré
  output_text TEXT, -- Texte brut (pour recherche)
  is_validated BOOLEAN DEFAULT FALSE,
  validated_at TIMESTAMPTZ,
  tokens_used INTEGER,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, step_number)
);

-- Templates de prompts (personnalisables)
CREATE TABLE prompt_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  step_number INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  user_prompt_template TEXT NOT NULL, -- Avec variables {{keyword}}, {{persona}}, etc.
  is_active BOOLEAN DEFAULT TRUE,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Images générées
CREATE TABLE generated_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  step_id UUID REFERENCES workflow_steps(id),
  prompt TEXT NOT NULL,
  image_url TEXT, -- URL Supabase Storage
  alt_text TEXT,
  filename TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs d'utilisation API (pour suivi des coûts)
CREATE TABLE api_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES projects(id),
  provider TEXT NOT NULL, -- 'anthropic', 'openai'
  model TEXT NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vue pour le dashboard des coûts
CREATE VIEW api_costs_summary AS
SELECT 
  DATE_TRUNC('month', created_at) AS month,
  provider,
  SUM(cost_usd) AS total_cost,
  SUM(input_tokens) AS total_input_tokens,
  SUM(output_tokens) AS total_output_tokens
FROM api_usage_logs
GROUP BY DATE_TRUNC('month', created_at), provider;
```

---

## 4. Workflow des étapes

| # | Étape | Input | Output | Validation requise |
|---|-------|-------|--------|-------------------|
| 0 | **Configuration** | Mot-clé, client | Projet initialisé | ✅ |
| 1 | **Génération titres** | Mot-clé, intentions | 10 titres SEO | ✅ Choix du titre |
| 2 | **Recherche approfondie** | Titre choisi | Wiki/synthèse du sujet | ✅ |
| 3 | **Questions persona** | Persona, titre | Liste de questions | ✅ |
| 4 | **Intentions vs Questions** | SERP + questions | Questions enrichies | ✅ |
| 5 | **Plan MECE** | Questions, références | Structure H1-H4 | ✅ |
| 6 | **Rédaction article** | Plan, champ sémantique | Article complet | ✅ |
| 7 | **Optimisation SEO** | Article, mots-clés | Article optimisé | ✅ |
| 8 | **Introduction copywriting** | Article | 2 intros optimisées | ✅ Choix intro |
| 9 | **Titres images** | Article | Noms fichiers SEO | ✅ |
| 10 | **Prompts illustrations** | Article, sections | Prompts Midjourney | ✅ |
| 11 | **Génération images** | Prompts | Images générées | ✅ |
| 12 | **Textes alternatifs** | Images | Balises alt | ✅ |
| 13 | **Méta-données** | Article, mot-clé | 5 titres + 5 descriptions | ✅ |
| 14 | **Données structurées** | Métadonnées | Schema.org JSON-LD | ✅ |
| 15 | **Export** | Tout | WordPress/DOCX/MD | ✅ |

> **Note** : Les fonctionnalités "Message WhatsApp" et "Net linking" ont été exclues du scope.

---

## 5. Structure des fichiers

```
seo-content-factory/
├── .env.local                    # Variables d'environnement
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
│
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx              # Redirect vers /dashboard
│   │   │
│   │   ├── dashboard/
│   │   │   └── page.tsx          # Liste des projets
│   │   │
│   │   ├── projects/
│   │   │   ├── new/
│   │   │   │   └── page.tsx      # Créer un projet
│   │   │   └── [id]/
│   │   │       ├── page.tsx      # Vue projet (timeline)
│   │   │       └── steps/
│   │   │           └── [step]/
│   │   │               └── page.tsx  # Étape du workflow
│   │   │
│   │   ├── clients/
│   │   │   ├── page.tsx          # Liste clients
│   │   │   └── [id]/
│   │   │       └── page.tsx      # Édition client/persona
│   │   │
│   │   ├── settings/
│   │   │   ├── page.tsx          # Config générale
│   │   │   ├── prompts/
│   │   │   │   └── page.tsx      # Édition des prompts
│   │   │   └── costs/
│   │   │       └── page.tsx      # Suivi des coûts API
│   │   │
│   │   └── api/
│   │       ├── projects/
│   │       │   └── route.ts
│   │       ├── clients/
│   │       │   └── route.ts
│   │       ├── generate/
│   │       │   ├── route.ts      # Handler générique
│   │       │   └── [step]/
│   │       │       └── route.ts
│   │       ├── images/
│   │       │   └── route.ts      # DALL-E generation
│   │       └── export/
│   │           └── route.ts
│   │
│   ├── components/
│   │   ├── ui/                   # shadcn/ui
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── MainLayout.tsx
│   │   ├── workflow/
│   │   │   ├── StepTimeline.tsx
│   │   │   ├── StepCard.tsx
│   │   │   ├── GenerateButton.tsx
│   │   │   ├── ValidationPanel.tsx
│   │   │   └── OutputEditor.tsx
│   │   ├── projects/
│   │   │   ├── ProjectCard.tsx
│   │   │   └── ProjectForm.tsx
│   │   └── clients/
│   │       ├── ClientCard.tsx
│   │       └── PersonaEditor.tsx
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts         # Client navigateur
│   │   │   ├── server.ts         # Client serveur
│   │   │   └── types.ts          # Types générés
│   │   ├── claude/
│   │   │   ├── client.ts         # Wrapper Claude API
│   │   │   ├── prompts.ts        # Builders de prompts
│   │   │   └── costs.ts          # Calcul des coûts
│   │   ├── openai/
│   │   │   └── dalle.ts          # Génération images
│   │   └── utils/
│   │       ├── export.ts         # Export DOCX/MD
│   │       └── seo.ts            # Helpers SEO
│   │
│   ├── hooks/
│   │   ├── useProject.ts
│   │   ├── useWorkflowStep.ts
│   │   └── useApiCosts.ts
│   │
│   ├── types/
│   │   ├── project.ts
│   │   ├── workflow.ts
│   │   └── client.ts
│   │
│   └── config/
│       ├── steps.ts              # Définition des 15 étapes
│       └── prompts/              # Prompts par défaut
│           ├── step-01-titles.ts
│           ├── step-02-research.ts
│           └── ...
│
└── supabase/
    ├── migrations/
    │   └── 001_initial_schema.sql
    └── seed.sql                  # Données initiales (prompts)
```

---

## 6. Variables d'environnement

```env
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# OpenAI (pour DALL-E)
OPENAI_API_KEY=sk-...

# Coûts API (en USD)
CLAUDE_SONNET_INPUT_COST=0.003    # par 1K tokens
CLAUDE_SONNET_OUTPUT_COST=0.015   # par 1K tokens
DALLE3_COST_STANDARD=0.040        # par image 1024x1024
DALLE3_COST_HD=0.080              # par image HD
```

---

## 7. Estimation des coûts par article

| Étape | Tokens estimés | Coût Claude |
|-------|----------------|-------------|
| Titres | ~2K in / ~1K out | ~$0.02 |
| Recherche | ~3K in / ~4K out | ~$0.07 |
| Questions | ~4K in / ~2K out | ~$0.04 |
| Plan MECE | ~5K in / ~3K out | ~$0.06 |
| Rédaction | ~8K in / ~10K out | ~$0.17 |
| Optimisation | ~12K in / ~10K out | ~$0.19 |
| Intros | ~6K in / ~2K out | ~$0.05 |
| Méta | ~4K in / ~1K out | ~$0.02 |
| **Sous-total Claude** | | **~$0.62** |

| Images | Quantité | Coût DALL-E |
|--------|----------|-------------|
| Illustrations | 5-8 images | ~$0.32 |
| **Sous-total images** | | **~$0.32** |

| **TOTAL par article** | | **~$0.94** |

---

## 8. Fonctionnalités clés de l'interface

### Dashboard
- Carte par projet avec progression (barre de complétion)
- Filtres par client, statut
- Coût total du mois affiché

### Vue projet (Timeline)
- Stepper vertical avec toutes les étapes
- Indicateurs : ⬜ À faire, 🔄 En cours, ✅ Validé
- Accès rapide à chaque étape

### Étape du workflow
- **Zone de configuration** : Variables du prompt (mot-clé, etc.)
- **Bouton "Générer"** : Appel Claude avec spinner + streaming
- **Zone de résultat** : Éditeur rich text pour modifier l'output
- **Boutons d'action** : Régénérer / Valider et continuer
- **Sidebar** : Coût de la génération, tokens utilisés

### Suivi des coûts
- Graphique mensuel par provider
- Détail par projet
- Alertes si seuil dépassé

---

## 9. Plan de développement suggéré

### Phase 1 - Fondations (2-3 jours)
- [ ] Setup Next.js + Tailwind + shadcn/ui
- [ ] Setup Supabase local (Docker)
- [ ] Schéma BDD + migrations
- [ ] Layout principal (sidebar, header)

### Phase 2 - CRUD de base (2 jours)
- [ ] Gestion des clients
- [ ] Création/liste des projets
- [ ] Éditeur de persona

### Phase 3 - Moteur de workflow (3-4 jours)
- [ ] Intégration Claude API avec streaming
- [ ] Système de prompts templates
- [ ] Calcul et logging des coûts
- [ ] Composant StepCard générique

### Phase 4 - Les 15 étapes (4-5 jours)
- [ ] Implémenter chaque étape
- [ ] Validation et passage à l'étape suivante
- [ ] Éditeur de texte pour modifications

### Phase 5 - Images (2 jours)
- [ ] Intégration DALL-E API
- [ ] Upload vers Supabase Storage
- [ ] Génération des alt texts

### Phase 6 - Export & Polish (2 jours)
- [ ] Export WordPress (REST API ou XML)
- [ ] Export DOCX / Markdown
- [ ] Dashboard des coûts
- [ ] Tests et optimisations

**Durée totale estimée : 15-18 jours de développement**

---

## 10. Pour démarrer

```bash
# 1. Créer le projet
npx create-next-app@latest seo-content-factory --typescript --tailwind --eslint --app --src-dir

# 2. Installer les dépendances
cd seo-content-factory
npm install @supabase/supabase-js @anthropic-ai/sdk openai
npm install @radix-ui/react-icons lucide-react
npx shadcn-ui@latest init

# 3. Supabase local
npx supabase init
npx supabase start

# 4. Lancer le dev
npm run dev
```

---

## Prochaine étape ?

Je peux commencer à coder :
1. **Le setup initial** (structure + config + BDD)
2. **Un prototype d'une étape** (ex: génération des titres)
3. **Le système de prompts** (extraction depuis ton Excel)

Qu'est-ce que tu veux qu'on attaque en premier ?
