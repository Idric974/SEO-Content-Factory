import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { INTERACTIVE_MODULE_PROMPT, interpolate } from "@/lib/claude/prompts";

/**
 * POST /api/generate/interactive-module — Génère un widget interactif HTML/JS
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, moduleType } = body;

  if (!projectId || !moduleType) {
    return NextResponse.json(
      { error: "projectId et moduleType requis" },
      { status: 400 }
    );
  }

  const validTypes = ["calculator", "quiz", "selector"];
  if (!validTypes.includes(moduleType)) {
    return NextResponse.json(
      { error: `moduleType doit être un parmi : ${validTypes.join(", ")}` },
      { status: 400 }
    );
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

  // Titre sélectionné
  const step1 = project.workflowSteps.find((s) => s.stepNumber === 1);
  const step1Data = step1?.outputData as { selectedTitle?: string } | null;
  const title = step1Data?.selectedTitle ?? project.title;

  // Article optimisé (step 7) — résumé pour ne pas surcharger le prompt
  const step7 = project.workflowSteps.find((s) => s.stepNumber === 7);
  const articleText = step7?.outputText ?? "";
  const articleSummary =
    articleText.length > 3000
      ? articleText.slice(0, 3000) + "\n\n[... article tronqué pour contexte ...]"
      : articleText;

  const typeLabels: Record<string, string> = {
    calculator: "Calculateur",
    quiz: "Quiz",
    selector: "Sélecteur / Arbre de décision",
  };

  const variables = {
    title,
    keyword: project.keyword,
    article: articleSummary,
    moduleType: typeLabels[moduleType] ?? moduleType,
  };

  const systemPrompt = interpolate(INTERACTIVE_MODULE_PROMPT.system, variables);
  const userPrompt = interpolate(INTERACTIVE_MODULE_PROMPT.user, variables);

  try {
    const result = await generate({
      systemPrompt,
      userPrompt,
      maxTokens: 4096,
      temperature: 0.6,
    });

    // Extraire le HTML (nettoyer les backticks markdown éventuels)
    let html = result.text;
    const htmlMatch = html.match(/```html?\s*\n?([\s\S]*?)```/);
    if (htmlMatch) {
      html = htmlMatch[1].trim();
    }

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
      html,
      moduleType,
      stats: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: costUsd.toFixed(6),
        model: result.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Interactive module generation failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
