import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { TLDR_PROMPT, interpolate } from "@/lib/claude/prompts";

/**
 * POST /api/generate/tldr — Génère un TL;DR pour l'article optimisé
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

  // Charger le projet
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workflowSteps: {
        where: { stepNumber: { in: [1, 7] } },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Récupérer l'article optimisé (step 7)
  const step7 = project.workflowSteps.find((s) => s.stepNumber === 7);
  if (!step7?.outputText) {
    return NextResponse.json(
      { error: "Article optimisé non trouvé (étape 7)" },
      { status: 400 }
    );
  }

  // Titre sélectionné
  const step1 = project.workflowSteps.find((s) => s.stepNumber === 1);
  const step1Data = step1?.outputData as { selectedTitle?: string } | null;
  const title = step1Data?.selectedTitle ?? project.title;

  // Construire les prompts
  const variables = {
    title,
    keyword: project.keyword,
    article: step7.outputText,
  };

  const systemPrompt = interpolate(TLDR_PROMPT.system, variables);
  const userPrompt = interpolate(TLDR_PROMPT.user, variables);

  try {
    const result = await generate({
      systemPrompt,
      userPrompt,
      maxTokens: 512,
      temperature: 0.5,
    });

    // Sauvegarder le TL;DR dans outputData du step 7
    const existingData = (step7.outputData as Record<string, unknown>) ?? {};
    await prisma.workflowStep.update({
      where: {
        projectId_stepNumber: { projectId, stepNumber: 7 },
      },
      data: {
        outputData: JSON.parse(
          JSON.stringify({ ...existingData, tldr: result.text })
        ),
      },
    });

    // Logger l'usage API
    const costUsd = calculateCost(result.model, result.inputTokens, result.outputTokens);
    await prisma.apiUsageLog.create({
      data: {
        projectId,
        provider: "anthropic",
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd,
      },
    });

    return NextResponse.json({
      tldr: result.text,
      stats: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: costUsd.toFixed(6),
        model: result.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("TL;DR generation failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
