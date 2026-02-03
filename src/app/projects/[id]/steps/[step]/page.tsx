"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { WORKFLOW_STEPS } from "@/config/steps";
import { useGenerate } from "@/hooks/useGenerate";
import {
  GenerateButton,
  GeneratingIndicator,
} from "@/components/workflow/GenerateButton";
import { OutputEditor } from "@/components/workflow/OutputEditor";
import { ValidationPanel } from "@/components/workflow/ValidationPanel";
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

interface ProjectInfo {
  id: string;
  title: string;
  keyword: string;
  searchIntents: string[];
  currentStep: number;
  client: { name: string; persona: unknown };
  workflowSteps: StepData[];
}

export default function StepPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;
  const stepNumber = parseInt(params.step as string, 10);

  const stepDef = WORKFLOW_STEPS.find((s) => s.number === stepNumber);
  const nextStep = WORKFLOW_STEPS.find((s) => s.number === stepNumber + 1);
  const prevStep = WORKFLOW_STEPS.find((s) => s.number === stepNumber - 1);

  const [stepData, setStepData] = useState<StepData | null>(null);
  const [projectInfo, setProjectInfo] = useState<ProjectInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [selectedTitleIndex, setSelectedTitleIndex] = useState<number | null>(null);
  const [selectedDescIndex, setSelectedDescIndex] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);

  const { isGenerating, output, error, stats, generate, cancel, setOutput } =
    useGenerate();

  const fetchData = useCallback(async () => {
    const [stepRes, projectRes] = await Promise.all([
      fetch(`/api/projects/${projectId}/steps/${stepNumber}`),
      fetch(`/api/projects/${projectId}`),
    ]);

    if (stepRes.ok) {
      const data = await stepRes.json();
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

    if (projectRes.ok) {
      setProjectInfo(await projectRes.json());
    }

    setLoading(false);
  }, [projectId, stepNumber, setOutput]);

  useEffect(() => {
    setLoading(true);
    setSelectedIndex(null);
    setSelectedTitleIndex(null);
    setSelectedDescIndex(null);
    fetchData();
  }, [fetchData]);

  function handleGenerate() {
    generate(projectId, stepNumber);
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

  // Étape 0 : Configuration
  if (stepNumber === 0) {
    return (
      <>
        <Header title="Configuration" />
        <div className="p-6">
          <div className="mb-6">
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/projects/${projectId}`}>
                <ArrowLeft className="mr-1 h-4 w-4" />
                Retour au projet
              </Link>
            </Button>
          </div>
          <Card className="mx-auto max-w-3xl">
            <CardHeader>
              <CardTitle>Configuration du projet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {projectInfo && (
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Client</span>
                    <span className="font-medium">{projectInfo.client.name}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mot-clé principal</span>
                    <span className="font-medium">{projectInfo.keyword}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Titre initial</span>
                    <span className="font-medium">{projectInfo.title}</span>
                  </div>
                  {projectInfo.searchIntents.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <span className="text-muted-foreground">
                          Intentions de recherche
                        </span>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {projectInfo.searchIntents.map((intent, i) => (
                            <Badge key={i} variant="outline">
                              {intent}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                  <Separator />
                  <div>
                    <span className="text-muted-foreground">Persona</span>
                    <p className="mt-1 text-sm">
                      {projectInfo.client.persona
                        ? "Configuré"
                        : "Non défini — configurez-le dans la fiche client"}
                    </p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                {!stepData?.isValidated ? (
                  <Button
                    className="w-full"
                    onClick={async () => {
                      await fetch(`/api/projects/${projectId}/steps/0`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          outputText: "Configuration validée",
                          outputData: { configured: true },
                          isValidated: true,
                        }),
                      });
                      router.push(`/projects/${projectId}/steps/1`);
                    }}
                  >
                    Valider la configuration et commencer
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
            </CardContent>
          </Card>
        </div>
      </>
    );
  }

  // Étape 11 : Génération d'images DALL-E
  if (stepNumber === 11) {
    return (
      <>
        <Header title={stepDef?.name ?? "Illustrations"} />
        <div className="p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/projects/${projectId}/steps/10`}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Prompts illustrations
                </Link>
              </Button>
            </div>
            <Badge variant="outline">
              Étape 11 / {WORKFLOW_STEPS.length - 1}
            </Badge>
          </div>

          <StepImages projectId={projectId} />

          {/* Navigation vers étape suivante si validée */}
          {stepData?.isValidated && nextStep && (
            <div className="mt-6 flex justify-end">
              <Button asChild>
                <Link href={`/projects/${projectId}/steps/${nextStep.number}`}>
                  {nextStep.name}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
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
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/projects/${projectId}/steps/14`}>
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Données structurées
                </Link>
              </Button>
            </div>
            <Badge variant="outline">
              Étape 15 / {WORKFLOW_STEPS.length - 1}
            </Badge>
          </div>

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
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link
                href={
                  prevStep
                    ? `/projects/${projectId}/steps/${prevStep.number}`
                    : `/projects/${projectId}`
                }
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {prevStep ? prevStep.name : "Projet"}
              </Link>
            </Button>
          </div>
          <Badge variant="outline">
            Étape {stepNumber} / {WORKFLOW_STEPS.length - 1}
          </Badge>
        </div>

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
                  <GenerateButton
                    isGenerating={isGenerating}
                    hasOutput={output.length > 0}
                    onGenerate={handleGenerate}
                    onCancel={cancel}
                  />
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
                      ? "Choisissez une introduction"
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

            {/* Éditeur de texte */}
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

            {/* Sauvegarder */}
            {output && !isGenerating && !stepData?.isValidated && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleSaveEdit}>
                  Sauvegarder les modifications
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar : validation */}
          <div className="space-y-4">
            <ValidationPanel
              isValidated={stepData?.isValidated ?? false}
              hasOutput={canValidate}
              isGenerating={isGenerating || validating}
              onValidate={handleValidate}
              stats={
                stats ??
                (stepData?.tokensUsed
                  ? {
                      inputTokens: 0,
                      outputTokens: stepData.tokensUsed,
                      costUsd: stepData.costUsd ?? "0",
                      model: "Précédente génération",
                    }
                  : null)
              }
            />
          </div>
        </div>
      </div>
    </>
  );
}
