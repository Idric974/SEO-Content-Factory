import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { AI_CRITIQUE_PROMPT, interpolate } from "@/lib/claude/prompts";

export interface CritiqueAxis {
  name: string;
  score: number;
  strengths: string[];
  improvements: string[];
}

export interface CritiqueResult {
  axes: CritiqueAxis[];
  overallScore: number;
  priorityActions: string[];
}

/**
 * POST /api/analyze/critique — Critique subjective par IA
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
      client: true,
      workflowSteps: {
        where: { stepNumber: { in: [1, 7] } },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

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

  // Persona
  let persona = "Non défini";
  if (project.client.persona && typeof project.client.persona === "object") {
    const p = project.client.persona as Record<string, string>;
    const parts: string[] = [];
    if (p.name) parts.push(`Nom : ${p.name}`);
    if (p.profession) parts.push(`Profession : ${p.profession}`);
    if (p.problems) parts.push(`Problèmes : ${p.problems}`);
    if (p.goals) parts.push(`Objectifs : ${p.goals}`);
    if (p.tone) parts.push(`Ton préféré : ${p.tone}`);
    if (p.description) parts.push(`Description : ${p.description}`);
    if (parts.length > 0) persona = parts.join("\n");
  }

  const variables = {
    title,
    keyword: project.keyword,
    persona,
    article: step7.outputText,
  };

  const systemPrompt = interpolate(AI_CRITIQUE_PROMPT.system, variables);
  const userPrompt = interpolate(AI_CRITIQUE_PROMPT.user, variables);

  try {
    const result = await generate({
      systemPrompt,
      userPrompt,
      maxTokens: 3072,
      temperature: 0.6,
    });

    // Parser le JSON
    let critique: CritiqueResult | null = null;
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        critique = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json(
        { error: "Format de réponse inattendu", raw: result.text },
        { status: 500 }
      );
    }

    if (!critique) {
      return NextResponse.json(
        { error: "Critique vide", raw: result.text },
        { status: 500 }
      );
    }

    // Sauvegarder dans step 7 outputData
    const existingData = (step7.outputData as Record<string, unknown>) ?? {};
    await prisma.workflowStep.update({
      where: {
        projectId_stepNumber: { projectId, stepNumber: 7 },
      },
      data: {
        outputData: JSON.parse(
          JSON.stringify({ ...existingData, aiCritique: critique })
        ),
      },
    });

    // Logger l'usage API
    const costUsd = calculateCost(
      result.model,
      result.inputTokens,
      result.outputTokens
    );
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
      critique,
      stats: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: costUsd.toFixed(6),
        model: result.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("AI critique failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
