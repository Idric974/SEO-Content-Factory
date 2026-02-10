import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { MEDIA_ANALYSIS_PROMPT, interpolate } from "@/lib/claude/prompts";
import type { SERPAnalysis } from "@/lib/serpapi/client";

export interface MediaRecommendationItem {
  section: string;
  mediaType: "photo" | "infographie" | "schéma" | "vidéo" | "tableau";
  rationale: string;
  suggestedDescription: string;
}

/**
 * POST /api/analyze/media — Analyse l'article pour recommander des médias
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

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

  // Article optimisé (step 7)
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

  // SERP data
  const serp = project.serpAnalysis as SERPAnalysis | null;
  const serpFeatures = serp?.serpFeatures?.join(", ") ?? "Non disponible";
  const serpCompetitors = serp?.organicResults
    ?.slice(0, 5)
    .map((r) => `${r.position}. ${r.title}\n   ${r.snippet}`)
    .join("\n\n") ?? "Non disponible";

  const variables = {
    title,
    keyword: project.keyword,
    article: step7.outputText,
    serpFeatures,
    serpCompetitors,
  };

  const systemPrompt = interpolate(MEDIA_ANALYSIS_PROMPT.system, variables);
  const userPrompt = interpolate(MEDIA_ANALYSIS_PROMPT.user, variables);

  try {
    const result = await generate({
      systemPrompt,
      userPrompt,
      maxTokens: 2048,
      temperature: 0.4,
    });

    // Parser le JSON depuis la réponse
    let recommendations: MediaRecommendationItem[] = [];
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      }
    } catch {
      // Si le parsing échoue, retourner le texte brut
      return NextResponse.json(
        { error: "Format de réponse inattendu", raw: result.text },
        { status: 500 }
      );
    }

    // Sauvegarder dans step 9 outputData
    const step9 = await prisma.workflowStep.findUnique({
      where: { projectId_stepNumber: { projectId, stepNumber: 9 } },
    });
    const existingData = (step9?.outputData as Record<string, unknown>) ?? {};
    await prisma.workflowStep.update({
      where: { projectId_stepNumber: { projectId, stepNumber: 9 } },
      data: {
        outputData: JSON.parse(
          JSON.stringify({ ...existingData, mediaRecommendations: recommendations })
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
      recommendations,
      stats: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: costUsd.toFixed(6),
        model: result.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Media analysis failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
