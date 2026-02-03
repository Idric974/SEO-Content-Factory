import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generateImage, parseImagePrompts } from "@/lib/openai/dalle";
import { DALLE_COSTS } from "@/lib/claude/costs";

// POST /api/images - Génère une image via DALL-E 3
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, prompt, filename, quality = "standard" } = body;

  if (!projectId || !prompt || !filename) {
    return NextResponse.json(
      { error: "projectId, prompt et filename sont requis" },
      { status: 400 }
    );
  }

  try {
    const result = await generateImage({
      prompt,
      filename,
      projectId,
      quality,
    });

    // Récupérer le workflow step 11
    const step = await prisma.workflowStep.findUnique({
      where: { projectId_stepNumber: { projectId, stepNumber: 11 } },
    });

    // Sauvegarder dans generated_images
    const image = await prisma.generatedImage.create({
      data: {
        projectId,
        stepId: step?.id ?? null,
        prompt: result.revisedPrompt,
        imageUrl: result.publicUrl,
        filename: result.filename,
      },
    });

    // Logger le coût
    const cost = quality === "hd" ? DALLE_COSTS.hd : DALLE_COSTS.standard;
    await prisma.apiUsageLog.create({
      data: {
        projectId,
        provider: "openai",
        model: "dall-e-3",
        inputTokens: 0,
        outputTokens: 0,
        costUsd: cost,
      },
    });

    return NextResponse.json({
      image,
      publicUrl: result.publicUrl,
      cost: cost.toFixed(4),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de génération";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/images/batch - Génère toutes les images d'un projet depuis l'étape 10
export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId requis" },
      { status: 400 }
    );
  }

  // Récupérer les prompts de l'étape 10
  const step10 = await prisma.workflowStep.findUnique({
    where: { projectId_stepNumber: { projectId, stepNumber: 10 } },
  });

  if (!step10?.outputText) {
    return NextResponse.json(
      { error: "L'étape 10 (prompts illustrations) doit être complétée" },
      { status: 400 }
    );
  }

  const imagePrompts = parseImagePrompts(step10.outputText);

  if (imagePrompts.length === 0) {
    return NextResponse.json(
      { error: "Aucun prompt d'image trouvé dans l'étape 10" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    prompts: imagePrompts,
    count: imagePrompts.length,
  });
}
