"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepContext } from "@/components/workflow/StepContext";
import { ImageGallery, type ImageItem } from "@/components/workflow/ImageGallery";
import { WORKFLOW_STEPS } from "@/config/steps";

interface StepImagesProps {
  projectId: string;
}

interface StepData {
  isValidated: boolean;
  outputText: string | null;
  outputData: Record<string, unknown> | null;
}

export function StepImages({ projectId }: StepImagesProps) {
  const router = useRouter();
  const stepDef = WORKFLOW_STEPS.find((s) => s.number === 11)!;
  const nextStep = WORKFLOW_STEPS.find((s) => s.number === 12);

  const [stepData, setStepData] = useState<StepData | null>(null);
  const [images, setImages] = useState<ImageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGeneratingAll, setIsGeneratingAll] = useState(false);

  // Charger les prompts depuis l'étape 10 et les images existantes
  const fetchData = useCallback(async () => {
    // Récupérer l'état de l'étape 11
    const stepRes = await fetch(`/api/projects/${projectId}/steps/11`);
    if (stepRes.ok) {
      setStepData(await stepRes.json());
    }

    // Parser les prompts depuis l'étape 10 via le batch endpoint
    const batchRes = await fetch("/api/images", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    });

    if (batchRes.ok) {
      const { prompts } = await batchRes.json();

      // Vérifier quelles images existent déjà
      const projectRes = await fetch(`/api/projects/${projectId}`);
      const project = projectRes.ok ? await projectRes.json() : null;
      const existingImages = project?.images ?? [];

      const imageItems: ImageItem[] = prompts.map(
        (p: { filename: string; prompt: string }) => {
          const existing = existingImages.find(
            (img: { filename: string; imageUrl: string }) =>
              img.filename === p.filename.replace(/[^a-z0-9\-\.]/gi, "-").toLowerCase()
          );
          return {
            filename: p.filename,
            prompt: p.prompt,
            publicUrl: existing?.imageUrl ?? undefined,
            status: existing ? ("done" as const) : ("pending" as const),
          };
        }
      );

      setImages(imageItems);
    }

    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function generateSingle(index: number) {
    const img = images[index];
    if (!img) return;

    setImages((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, status: "generating" as const } : item
      )
    );

    try {
      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          prompt: img.prompt,
          filename: img.filename,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur");
      }

      const data = await res.json();

      setImages((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                status: "done" as const,
                publicUrl: data.publicUrl,
                cost: data.cost,
              }
            : item
        )
      );
    } catch (err) {
      setImages((prev) =>
        prev.map((item, i) =>
          i === index
            ? {
                ...item,
                status: "error" as const,
                error: err instanceof Error ? err.message : "Erreur",
              }
            : item
        )
      );
    }
  }

  async function generateAll() {
    setIsGeneratingAll(true);

    for (let i = 0; i < images.length; i++) {
      if (images[i].status !== "done") {
        await generateSingle(i);
      }
    }

    setIsGeneratingAll(false);
  }

  async function handleValidate() {
    const generatedImages = images.filter((img) => img.status === "done");
    const summary = generatedImages
      .map((img) => `- ${img.filename}: ${img.publicUrl}`)
      .join("\n");

    await fetch(`/api/projects/${projectId}/steps/11`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputText: summary,
        outputData: {
          images: generatedImages.map((img) => ({
            filename: img.filename,
            publicUrl: img.publicUrl,
          })),
        },
        isValidated: true,
      }),
    });

    if (nextStep) {
      router.push(`/projects/${projectId}/steps/${nextStep.number}`);
    } else {
      router.push(`/projects/${projectId}`);
    }
  }

  if (loading) {
    return (
      <p className="text-muted-foreground">Chargement des images...</p>
    );
  }

  const allDone = images.length > 0 && images.every((img) => img.status === "done");

  // Contexte
  const contextItems = stepDef.dependsOn
    .map((depNum) => {
      const depDef = WORKFLOW_STEPS.find((s) => s.number === depNum);
      return depDef
        ? {
            stepNumber: depNum,
            stepName: depDef.name,
            summary: `Les prompts DALL-E sont issus de l'étape ${depNum}.`,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <StepContext
        items={contextItems}
        userInstructions={stepDef.userInstructions}
      />

      {/* Contenu */}
      {images.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">
              Aucun prompt d&apos;image trouvé. Complétez l&apos;étape 10 d&apos;abord.
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/projects/${projectId}/steps/10`}>
                Aller à l&apos;étape 10
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <ImageGallery
            images={images}
            onGenerate={generateSingle}
            onGenerateAll={generateAll}
            isGeneratingAll={isGeneratingAll}
          />

          {/* Validation */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Validation
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stepData?.isValidated ? (
                <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                  <Check className="h-4 w-4" />
                  <span>Étape validée</span>
                </div>
              ) : (
                <Button
                  onClick={handleValidate}
                  disabled={!allDone || isGeneratingAll}
                  className="w-full"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Valider les images et continuer
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
