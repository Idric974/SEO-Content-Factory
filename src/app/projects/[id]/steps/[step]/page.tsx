"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Globe, AlertTriangle, Search, Scale, CheckCircle, Target } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WORKFLOW_STEPS } from "@/config/steps";
import { useGenerate } from "@/hooks/useGenerate";
import { useProjectWorkflow } from "@/contexts/ProjectWorkflowContext";
import {
  GenerateButton,
  GeneratingIndicator,
} from "@/components/workflow/GenerateButton";
import { OutputEditor } from "@/components/workflow/OutputEditor";
import { ApiMonitorPanel } from "@/components/workflow/ApiMonitorPanel";
import {
  ChoiceSelector,
  parseNumberedList,
} from "@/components/workflow/ChoiceSelector";
import { StepContext } from "@/components/workflow/StepContext";
import {
  MetaSelector,
  parseMetaOutput,
} from "@/components/workflow/MetaSelector";
import { StepImages } from "@/components/workflow/StepImages";
import { StepExport } from "@/components/workflow/StepExport";
import PlanAnalyzer from "@/components/workflow/PlanAnalyzer";
import SectionEditor, { type SectionData } from "@/components/workflow/SectionEditor";
import TldrGenerator from "@/components/workflow/TldrGenerator";
import { SerpAnalysisPanel } from "@/components/strategy/SerpAnalysisPanel";
import { FormatRecommendation } from "@/components/strategy/FormatRecommendation";
import { parsePlanIntoSections } from "@/lib/plan/sections";
import { extractQBSTForSections } from "@/lib/plan/qbst";
import { useGenerateSection } from "@/hooks/useGenerateSection";
import MediaRecommendation from "@/components/workflow/MediaRecommendation";
import type { MediaRecommendationItem } from "@/components/workflow/MediaRecommendation";
import AuthorBlockGenerator from "@/components/workflow/AuthorBlockGenerator";
import QualityScorePanel from "@/components/workflow/QualityScorePanel";
import FactCheckPanel from "@/components/workflow/FactCheckPanel";
import type { FactCheckResult } from "@/components/workflow/FactCheckPanel";
import AICritiquePanel from "@/components/workflow/AICritiquePanel";
import type { CritiqueResult } from "@/components/workflow/AICritiquePanel";
import type { QualityMetrics } from "@/lib/nlp/qualityMetrics";
import TitleAnalysisPanel from "@/components/workflow/TitleAnalysisPanel";
import InternalLinkAssistant from "@/components/workflow/InternalLinkAssistant";
import WysiwygEditor from "@/components/workflow/WysiwygEditor";
import type { InternalLinkSuggestion } from "@/components/workflow/InternalLinkAssistant";
import type { SERPAnalysis } from "@/lib/serpapi/client";

interface StepData {
  id: string;
  stepNumber: number;
  stepName: string;
  outputText: string | null;
  outputData: Record<string, unknown> | null;
  isValidated: boolean;
  tokensUsed: number | null;
  costUsd: string | null;
}

export default function StepPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const stepNumber = parseInt(params.step as string, 10);

  const { project: projectInfo, refreshProject } = useProjectWorkflow();

  const stepDef = WORKFLOW_STEPS.find((s) => s.number === stepNumber);
  const nextStep = WORKFLOW_STEPS.find((s) => s.number === stepNumber + 1);

  const [stepData, setStepData] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [selectedDescIndex, setSelectedDescIndex] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [titleCount, setTitleCount] = useState("10");

  const { isGenerating, output, error, stats, searchStatus, generate, cancel, setOutput } =
    useGenerate();

  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const prevGenerating = useRef(false);

  useEffect(() => {
    if (prevGenerating.current && !isGenerating) {
      setRefreshTrigger((prev) => prev + 1);
    }
    prevGenerating.current = isGenerating;
  }, [isGenerating]);

  const fetchStepData = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}/steps/${stepNumber}`);

    if (res.ok) {
      const data = await res.json();
      setStepData(data);
      if (data.outputText) {
        setOutput(data.outputText);
      }
      if (data.outputData?.selectedIndex !== undefined) {
        setSelectedIndex(data.outputData.selectedIndex as number);
      }
      if (data.outputData?.selectedTitleIndex !== undefined) {
        setSelectedTitleIndex(data.outputData.selectedTitleIndex as number);
      }
      if (data.outputData?.selectedDescriptionIndex !== undefined) {
        setSelectedDescIndex(data.outputData.selectedDescriptionIndex as number);
      }
    }

    setLoading(false);
  }, [projectId, stepNumber, setOutput]);

  useEffect(() => {
    setLoading(true);
    setSelectedIndex(null);
    setSelectedTitleIndex(null);
    setSelectedDescIndex(null);
    fetchStepData();
  }, [fetchStepData]);

  function handleGenerate() {
    const extras: Record<string, string> = {};
    if (stepNumber === 1) {
      extras.titleCount = titleCount;
    }
    generate(projectId, stepNumber, extras);
  }

  async function handleValidate() {
    setValidating(true);

    let outputData: Record<string, unknown> = { text: output };

    if (stepDef?.validationType === "choose" && selectedIndex !== null) {
      const items = parseNumberedList(output);
      const selected = items[selectedIndex] ?? "";
      outputData = { text: output, selectedIndex, selectedTitle: selected };

      // Étape 1 : mettre à jour le titre du projet
      if (stepNumber === 1) {
        await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: selected }),
        });
      }
    }

    if (stepDef?.validationType === "choose-dual") {
      const { titles, descriptions } = parseMetaOutput(output);
      outputData = {
        text: output,
        selectedTitleIndex,
        selectedDescriptionIndex: selectedDescIndex,
        selectedMetaTitle: titles[selectedTitleIndex ?? 0] ?? "",
        selectedMetaDescription: descriptions[selectedDescIndex ?? 0] ?? "",
      };
    }

    await fetch(`/api/projects/${projectId}/steps/${stepNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputText: output, outputData, isValidated: true }),
    });

    // Rafraîchir le contexte pour mettre à jour la timeline
    await refreshProject();

    setValidating(false);

    if (nextStep) {
      router.push(`/projects/${projectId}/steps/${nextStep.number}`);
    } else {
      router.push(`/projects/${projectId}`);
    }
  }

  async function handleSaveEdit() {
    await fetch(`/api/projects/${projectId}/steps/${stepNumber}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outputText: output, outputData: { text: output } }),
    });
  }

  // --- Contexte des étapes précédentes ---
  function buildContextItems() {
    if (!projectInfo || !stepDef) return [];
    return stepDef.dependsOn
      .map((depNum) => {
        const dep = projectInfo.workflowSteps.find((s) => s.stepNumber === depNum);
        const depDef = WORKFLOW_STEPS.find((s) => s.number === depNum);
        if (!dep?.outputText || !depDef) return null;
        const summary =
          dep.outputText.length > 500
            ? dep.outputText.slice(0, 500) + "..."
            : dep.outputText;
        return { stepNumber: depNum, stepName: depDef.name, summary };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  // --- Rendu ---

  if (loading) {
    return (
      <>
        <Header title="Chargement..." />
        <div className="p-6">
          <p className="text-muted-foreground">Chargement de l&apos;étape...</p>
        </div>
      </>
    );
  }

  // Étape 0 : Stratégie & Analyse SERP
  if (stepNumber === 0) {
    return <Step0Strategy
      projectInfo={projectInfo}
      stepData={stepData}
      projectId={projectId}
      refreshProject={refreshProject}
      router={router}
    />;
  }

  // Étape 6 : Rédaction section par section
  if (stepNumber === 6) {
    return (
      <Step6Article
        projectId={projectId}
        projectInfo={projectInfo}
        stepData={stepData}
        refreshProject={refreshProject}
        router={router}
      />
    );
  }

  // Étape 11 : Génération d'images DALL-E
  if (stepNumber === 11) {
    return (
      <>
        <Header title={stepDef?.name ?? "Illustrations"} />
        <div className="p-6">
          <StepImages projectId={projectId} />
        </div>
      </>
    );
  }

  // Étape 15 : Export
  if (stepNumber === 15) {
    return (
      <>
        <Header title={stepDef?.name ?? "Export"} />
        <div className="p-6">
          <StepExport projectId={projectId} />
        </div>
      </>
    );
  }

  // --- Étape standard (génération Claude) ---

  const isChoiceStep = stepDef?.validationType === "choose";
  const isDualChoice = stepDef?.validationType === "choose-dual";
  const parsedItems = isChoiceStep && output ? parseNumberedList(output) : [];
  const metaParsed = isDualChoice && output ? parseMetaOutput(output) : null;

  let canValidate = false;
  if (isChoiceStep) {
    canValidate = selectedIndex !== null && !isGenerating;
  } else if (isDualChoice) {
    canValidate =
      selectedTitleIndex !== null &&
      selectedDescIndex !== null &&
      !isGenerating;
  } else {
    canValidate = output.length > 0 && !isGenerating;
  }

  const contextItems = buildContextItems();

  return (
    <>
      <Header title={stepDef?.name ?? `Étape ${stepNumber}`} />
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Zone principale */}
          <div className="space-y-6">
            {/* Instructions + contexte */}
            <StepContext
              items={contextItems}
              userInstructions={stepDef?.userInstructions}
            />

            {/* En-tête de l'étape + bouton générer */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{stepDef?.name}</CardTitle>
                  <div className="flex items-center gap-3">
                    {stepNumber === 1 && (
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground whitespace-nowrap">
                          Nb titres
                        </label>
                        <select
                          value={titleCount}
                          onChange={(e) => setTitleCount(e.target.value)}
                          disabled={isGenerating}
                          className="h-9 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          {[5, 10, 15, 20].map((n) => (
                            <option key={n} value={String(n)}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                    <GenerateButton
                      isGenerating={isGenerating}
                      hasOutput={output.length > 0}
                      onGenerate={handleGenerate}
                      onCancel={cancel}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {stepDef?.description}
                </p>
              </CardHeader>
              {isGenerating && (
                <CardContent>
                  <GeneratingIndicator />
                </CardContent>
              )}
            </Card>

            {/* Statut recherche web (étape 2) */}
            {searchStatus && (
              <Card className={searchStatus.success ? "border-green-300 dark:border-green-800" : "border-amber-300 dark:border-amber-800"}>
                <CardContent className="flex items-center gap-3 pt-6">
                  {searchStatus.success ? (
                    <>
                      <Globe className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Recherche web terminée — {searchStatus.resultCount} sources trouvées et injectées dans le prompt.
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-300">
                          Recherche web échouée — génération basée sur les connaissances de Claude uniquement.
                        </p>
                        {searchStatus.error && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            {searchStatus.error}
                          </p>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Erreur */}
            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {/* Sélecteur choix simple (étapes 1, 8) */}
            {isChoiceStep && parsedItems.length > 0 && (
              <ChoiceSelector
                items={parsedItems}
                selectedIndex={selectedIndex}
                onSelect={setSelectedIndex}
                label={
                  stepNumber === 1
                    ? "Choisissez un titre"
                    : stepNumber === 8
                      ? "Choisissez une introduction (PAS ou PATT)"
                      : "Sélectionnez une option"
                }
              />
            )}

            {/* Sélecteur double choix méta (étape 13) */}
            {isDualChoice && metaParsed && (
              <MetaSelector
                titles={metaParsed.titles}
                descriptions={metaParsed.descriptions}
                selectedTitleIndex={selectedTitleIndex}
                selectedDescriptionIndex={selectedDescIndex}
                onSelectTitle={setSelectedTitleIndex}
                onSelectDescription={setSelectedDescIndex}
              />
            )}

            {/* Analyse titres concurrents (étape 13) */}
            {stepNumber === 13 && !isGenerating && projectInfo?.serpAnalysis && (
              <TitleAnalysisPanel
                keyword={projectInfo.keyword}
                serpCompetitors={
                  ((projectInfo.serpAnalysis as unknown as SERPAnalysis)?.organicResults ?? [])
                    .slice(0, 10)
                    .map((r) => ({ title: r.title, position: r.position, link: r.link }))
                }
              />
            )}

            {/* Recommandation médias (étape 9) */}
            {stepNumber === 9 && !isGenerating && (
              <MediaRecommendation
                projectId={projectId}
                existingRecommendations={
                  (stepData?.outputData as Record<string, unknown>)?.mediaRecommendations as MediaRecommendationItem[] | undefined
                }
              />
            )}

            {/* Éditeur de texte — WYSIWYG au step 7, textarea ailleurs */}
            {stepNumber === 7 ? (
              <WysiwygEditor
                value={output}
                onChange={setOutput}
                readOnly={isGenerating}
                label={
                  stepData?.isValidated
                    ? "Résultat (validé)"
                    : isGenerating
                      ? "Génération en cours..."
                      : "Article optimisé (WYSIWYG)"
                }
              />
            ) : (
              <OutputEditor
                value={output}
                onChange={setOutput}
                readOnly={isGenerating}
                label={
                  stepData?.isValidated
                    ? "Résultat (validé)"
                    : isGenerating
                      ? "Génération en cours..."
                      : "Résultat (modifiable)"
                }
              />
            )}

            {/* Analyseur de plan (étape 5) */}
            {stepNumber === 5 && output && !isGenerating && (
              <PlanAnalyzer
                planText={output}
                projectId={projectId}
                onApplySuggestions={(updated) => setOutput(updated)}
              />
            )}

            {/* TL;DR (étape 7) */}
            {stepNumber === 7 && output && !isGenerating && (
              <TldrGenerator
                projectId={projectId}
                existingTldr={(stepData?.outputData as Record<string, unknown>)?.tldr as string | undefined}
                onTldrGenerated={async (tldr) => {
                  // Sauvegarde le TL;DR dans outputData du step 7
                  const currentData = (stepData?.outputData as Record<string, unknown>) ?? {};
                  await fetch(`/api/projects/${projectId}/steps/7`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      outputText: output,
                      outputData: { ...currentData, text: output, tldr },
                    }),
                  });
                }}
              />
            )}

            {/* Bloc Auteur E-E-A-T (étape 7) */}
            {stepNumber === 7 && output && !isGenerating && (
              <AuthorBlockGenerator
                projectId={projectId}
                existingAuthorBlock={(stepData?.outputData as Record<string, unknown>)?.authorBlock as string | undefined}
                onAuthorBlockGenerated={async (authorBlock) => {
                  const currentData = (stepData?.outputData as Record<string, unknown>) ?? {};
                  await fetch(`/api/projects/${projectId}/steps/7`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      outputText: output,
                      outputData: { ...currentData, text: output, authorBlock },
                    }),
                  });
                }}
              />
            )}

            {/* Score de Qualité NLP (étape 7) */}
            {stepNumber === 7 && output && !isGenerating && (
              <QualityScorePanel
                projectId={projectId}
                existingMetrics={(stepData?.outputData as Record<string, unknown>)?.qualityScore as QualityMetrics | undefined}
              />
            )}

            {/* Fact-Checking (étape 7) */}
            {stepNumber === 7 && output && !isGenerating && (
              <FactCheckPanel
                projectId={projectId}
                existingResults={(stepData?.outputData as Record<string, unknown>)?.factCheck as FactCheckResult[] | undefined}
              />
            )}

            {/* Critique IA (étape 7) */}
            {stepNumber === 7 && output && !isGenerating && (
              <AICritiquePanel
                projectId={projectId}
                existingCritique={(stepData?.outputData as Record<string, unknown>)?.aiCritique as CritiqueResult | undefined}
              />
            )}

            {/* Maillage interne sémantique (étape 14) */}
            {stepNumber === 14 && output && !isGenerating && (
              <InternalLinkAssistant
                projectId={projectId}
                existingSuggestions={
                  (stepData?.outputData as Record<string, unknown>)?.internalLinks as InternalLinkSuggestion[] | undefined
                }
                existingSitePages={
                  (stepData?.outputData as Record<string, unknown>)?.sitePages as { url: string; title: string; snippet: string; relevance: number }[] | undefined
                }
                existingSiteUrl={
                  (stepData?.outputData as Record<string, unknown>)?.siteUrl as string | undefined
                }
              />
            )}

            {/* Sauvegarder */}
            {output && !isGenerating && !stepData?.isValidated && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                  Sauvegarder les modifications
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar : monitoring API */}
          <ApiMonitorPanel
            projectId={projectId}
            isValidated={stepData?.isValidated ?? false}
            hasOutput={canValidate}
            isGenerating={isGenerating || validating}
            onValidate={handleValidate}
            refreshTrigger={refreshTrigger}
          />
        </div>
      </div>
    </>
  );
}

// --- Composant Step 0 : Stratégie & Analyse SERP ---

const OBJECTIVE_LABELS: Record<string, { label: string; icon: React.ElementType }> = {
  explorer: { label: "Explorateur", icon: Search },
  evaluator: { label: "Évaluateur", icon: Scale },
  convinced: { label: "Convaincu en attente", icon: CheckCircle },
  decision_maker: { label: "Décisionnaire", icon: Target },
};

function Step0Strategy({
  projectInfo,
  stepData,
  projectId,
  refreshProject,
  router,
}: {
  projectInfo: import("@/contexts/ProjectWorkflowContext").ProjectData | null;
  stepData: StepData | null;
  projectId: string;
  refreshProject: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const [serpAnalysis, setSerpAnalysis] = useState<SERPAnalysis | null>(
    (projectInfo?.serpAnalysis as SERPAnalysis | null) ?? null
  );
  const [selectedFormat, setSelectedFormat] = useState<string | null>(
    projectInfo?.editorialFormat ?? null
  );

  function handleAnalysisComplete(analysis: SERPAnalysis) {
    setSerpAnalysis(analysis);
  }

  async function handleValidateStrategy() {
    // Sauvegarder le format éditorial si sélectionné
    if (selectedFormat) {
      await fetch(`/api/projects/${projectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ editorialFormat: selectedFormat }),
      });
    }

    // Valider l'étape 0
    await fetch(`/api/projects/${projectId}/steps/0`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputText: `Stratégie validée. Format: ${selectedFormat ?? "non défini"}. SERP analysée: ${serpAnalysis ? "oui" : "non"}.`,
        outputData: {
          configured: true,
          serpAnalyzed: !!serpAnalysis,
          editorialFormat: selectedFormat,
        },
        isValidated: true,
      }),
    });
    await refreshProject();
    router.push(`/projects/${projectId}/steps/1`);
  }

  const objectiveKey = projectInfo?.businessObjective;
  const objectiveInfo = objectiveKey ? OBJECTIVE_LABELS[objectiveKey] : null;

  return (
    <>
      <Header title="Stratégie & Analyse SERP" />
      <div className="p-6 space-y-6">
        {/* Section 1 : Récapitulatif */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Récapitulatif du projet</CardTitle>
          </CardHeader>
          <CardContent>
            {projectInfo && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <span className="text-sm text-muted-foreground">Client</span>
                  <p className="font-medium">{projectInfo.client.name}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Mot-clé principal</span>
                  <p className="font-medium">{projectInfo.keyword}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Titre initial</span>
                  <p className="font-medium">{projectInfo.title}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Objectif business</span>
                  {objectiveInfo ? (
                    <div className="flex items-center gap-2">
                      <objectiveInfo.icon className="h-4 w-4 text-muted-foreground" />
                      <p className="font-medium">{objectiveInfo.label}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Non défini</p>
                  )}
                </div>
                {projectInfo.searchIntents.length > 0 && (
                  <div className="sm:col-span-2">
                    <span className="text-sm text-muted-foreground">Intentions de recherche</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {projectInfo.searchIntents.map((intent, i) => (
                        <Badge key={i} variant="outline">{intent}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="text-sm text-muted-foreground">Persona</span>
                  <p className="text-sm">
                    {projectInfo.client.persona ? "Configuré" : "Non défini — configurez-le dans la fiche client"}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2 : Analyse SERP */}
        {projectInfo && (
          <SerpAnalysisPanel
            keyword={projectInfo.keyword}
            projectId={projectId}
            initialAnalysis={serpAnalysis}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {/* Section 3 : Recommandation format éditorial */}
        {serpAnalysis && projectInfo && (
          <FormatRecommendation
            serpAnalysis={serpAnalysis}
            businessObjective={projectInfo.businessObjective}
            selectedFormat={selectedFormat}
            onSelectFormat={setSelectedFormat}
            projectId={projectId}
          />
        )}

        {/* Bouton validation */}
        <div className="pt-2">
          {!stepData?.isValidated ? (
            <Button className="w-full" onClick={handleValidateStrategy}>
              Valider la stratégie et commencer
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button asChild className="w-full">
              <Link href={`/projects/${projectId}/steps/1`}>
                Aller à l&apos;étape 1
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
      </div>
    </>
  );
}

// --- Composant Step 6 : Rédaction section par section ---

function Step6Article({
  projectId,
  projectInfo,
  stepData,
  refreshProject,
  router,
}: {
  projectId: string;
  projectInfo: import("@/contexts/ProjectWorkflowContext").ProjectData | null;
  stepData: StepData | null;
  refreshProject: () => Promise<void>;
  router: ReturnType<typeof useRouter>;
}) {
  const [sectionOutputs, setSectionOutputs] = useState<SectionData[]>([]);
  const [isAssembled, setIsAssembled] = useState(false);
  const [assembledText, setAssembledText] = useState("");
  const [validating, setValidating] = useState(false);

  const { generatingIndex, streamingText, error, generateSection, cancel } =
    useGenerateSection();

  const [refreshTrigger6, setRefreshTrigger6] = useState(0);
  const prevGeneratingIndex = useRef<number | null>(null);

  useEffect(() => {
    if (prevGeneratingIndex.current !== null && generatingIndex === null) {
      setRefreshTrigger6((prev) => prev + 1);
    }
    prevGeneratingIndex.current = generatingIndex;
  }, [generatingIndex]);

  // Récupérer le plan validé (step 5)
  const planText =
    projectInfo?.workflowSteps.find((s) => s.stepNumber === 5)?.outputText ?? "";
  const sections = planText ? parsePlanIntoSections(planText) : [];

  // Extraire les termes QBST
  const serpAnalysis = projectInfo?.serpAnalysis as Record<string, unknown> | null;
  const competitorData = serpAnalysis?.organicResults
    ? (serpAnalysis.organicResults as Array<{ title: string; snippet: string }>).slice(0, 10)
    : [];
  const researchText =
    projectInfo?.workflowSteps.find((s) => s.stepNumber === 2)?.outputText ?? "";
  const paaQuestions = serpAnalysis?.peopleAlsoAsk
    ? (serpAnalysis.peopleAlsoAsk as Array<{ question: string }>).map((p) => p.question)
    : [];

  const qbstData = sections.length > 0
    ? extractQBSTForSections(sections, competitorData, researchText, paaQuestions)
    : [];

  // Restaurer la progression depuis outputData
  useEffect(() => {
    if (stepData?.outputData) {
      const data = stepData.outputData as Record<string, unknown>;
      if (data.sections && Array.isArray(data.sections)) {
        setSectionOutputs(data.sections as SectionData[]);
      }
      if (data.assembled) {
        setIsAssembled(true);
        if (stepData.outputText) {
          setAssembledText(stepData.outputText);
        }
      }
    }

    // Initialiser les sections manquantes
    if (sections.length > 0) {
      setSectionOutputs((prev) => {
        const updated = [...prev];
        for (const section of sections) {
          const exists = updated.find((s) => s.index === section.index);
          if (!exists) {
            updated.push({
              index: section.index,
              heading: section.h2.text,
              content: null,
              status: "pending",
              wordCount: 0,
            });
          }
        }
        return updated.sort((a, b) => a.index - b.index);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepData]);

  function handleGenerateSection(index: number) {
    const section = sections[index];
    if (!section) return;

    const previousSection = sectionOutputs.find((s) => s.index === index - 1);
    const qbst = qbstData.find((q) => q.sectionIndex === index);

    generateSection(
      projectId,
      index,
      section.h2.text,
      section.subsections.map((s) => s.text),
      previousSection?.content ?? "",
      qbst?.terms ?? [],
      (sectionIndex, text) => {
        setSectionOutputs((prev) => {
          const updated = prev.map((s) =>
            s.index === sectionIndex
              ? {
                  ...s,
                  content: text,
                  status: "done" as const,
                  wordCount: text.split(/\s+/).filter(Boolean).length,
                }
              : s
          );
          return updated;
        });
        setIsAssembled(false);
      }
    );
  }

  async function handleGenerateAll() {
    // Tableau local pour suivre le contenu généré pendant la boucle
    // (évite le bug de closure stale sur sectionOutputs)
    const completedTexts: Record<number, string> = {};

    // Pré-remplir avec les sections déjà rédigées
    for (const s of sectionOutputs) {
      if ((s.status === "done" || s.status === "edited") && s.content) {
        completedTexts[s.index] = s.content;
      }
    }

    for (let i = 0; i < sections.length; i++) {
      const sectionData = sectionOutputs.find((s) => s.index === i);
      if (sectionData?.status === "done" || sectionData?.status === "edited") {
        continue; // Skip already done sections
      }

      await new Promise<void>((resolve) => {
        const section = sections[i];
        const previousText = completedTexts[i - 1] ?? "";
        const qbst = qbstData.find((q) => q.sectionIndex === i);

        generateSection(
          projectId,
          i,
          section.h2.text,
          section.subsections.map((s) => s.text),
          previousText,
          qbst?.terms ?? [],
          (sectionIndex, text) => {
            completedTexts[sectionIndex] = text;
            setSectionOutputs((prev) =>
              prev.map((s) =>
                s.index === sectionIndex
                  ? {
                      ...s,
                      content: text,
                      status: "done" as const,
                      wordCount: text.split(/\s+/).filter(Boolean).length,
                    }
                  : s
              )
            );
            setIsAssembled(false);
            resolve();
          }
        );
      });
    }
  }

  function handleEditSection(index: number, text: string) {
    setSectionOutputs((prev) =>
      prev.map((s) =>
        s.index === index
          ? {
              ...s,
              content: text,
              status: "edited" as const,
              wordCount: text.split(/\s+/).filter(Boolean).length,
            }
          : s
      )
    );
    setIsAssembled(false);
  }

  async function handleAssemble() {
    const assembled = sectionOutputs
      .sort((a, b) => a.index - b.index)
      .map((s) => s.content ?? "")
      .join("\n\n");

    setAssembledText(assembled);
    setIsAssembled(true);

    // Sauvegarder l'article assemblé
    await fetch(`/api/projects/${projectId}/steps/6`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputText: assembled,
        outputData: JSON.parse(
          JSON.stringify({ sections: sectionOutputs, assembled: true })
        ),
      }),
    });
  }

  async function handleValidate() {
    setValidating(true);

    await fetch(`/api/projects/${projectId}/steps/6`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputText: assembledText,
        outputData: JSON.parse(
          JSON.stringify({ sections: sectionOutputs, assembled: true, text: assembledText })
        ),
        isValidated: true,
      }),
    });

    await refreshProject();
    setValidating(false);
    router.push(`/projects/${projectId}/steps/7`);
  }

  const isGenerating = generatingIndex !== null;
  const totalWords = sectionOutputs.reduce((acc, s) => acc + s.wordCount, 0);

  return (
    <>
      <Header title="Rédaction de l&apos;article" />
      <div className="p-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          {/* Zone principale */}
          <div className="space-y-6">
            {/* Instructions */}
            <Card>
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground">
                  L&apos;article est rédigé section par section pour garantir la profondeur
                  et permettre la relecture. Générez chaque section individuellement ou
                  utilisez &quot;Générer toutes les sections&quot;. Les termes QBST (en bleu) sont
                  des mots-clés à intégrer naturellement.
                </p>
              </CardContent>
            </Card>

            {error && (
              <Card className="border-destructive">
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">{error}</p>
                </CardContent>
              </Card>
            )}

            {sections.length > 0 ? (
              <SectionEditor
                sections={sections}
                sectionOutputs={sectionOutputs}
                qbstData={qbstData}
                generatingIndex={generatingIndex}
                streamingText={streamingText}
                onGenerateSection={handleGenerateSection}
                onGenerateAll={handleGenerateAll}
                onEditSection={handleEditSection}
                onAssemble={handleAssemble}
                isAssembled={isAssembled}
              />
            ) : (
              <Card className="border-dashed">
                <CardContent className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Aucun plan trouvé. Validez d&apos;abord l&apos;étape 5 (Plan) pour commencer la rédaction.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar : monitoring API */}
          <div className="space-y-4">
            <ApiMonitorPanel
              projectId={projectId}
              isValidated={stepData?.isValidated ?? false}
              hasOutput={isAssembled && !isGenerating}
              isGenerating={isGenerating || validating}
              onValidate={handleValidate}
              refreshTrigger={refreshTrigger6}
            />

            {/* Statistiques */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Statistiques</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Sections</span>
                  <span>
                    {sectionOutputs.filter((s) => s.status === "done" || s.status === "edited").length}
                    /{sections.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Mots total</span>
                  <span>{totalWords}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Assemblé</span>
                  <span>{isAssembled ? "Oui" : "Non"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
