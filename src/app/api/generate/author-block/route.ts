import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { AUTHOR_BLOCK_PROMPT, interpolate } from "@/lib/claude/prompts";

/**
 * POST /api/generate/author-block — Génère un bloc auteur E-E-A-T
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
    if (p.age) parts.push(`Âge : ${p.age}`);
    if (p.profession) parts.push(`Profession : ${p.profession}`);
    if (p.problems) parts.push(`Expertise : ${p.problems}`);
    if (p.goals) parts.push(`Objectifs : ${p.goals}`);
    if (p.description) parts.push(`Description : ${p.description}`);
    if (parts.length > 0) persona = parts.join("\n");
  }

  // Brand guidelines
  let brand = "";
  if (project.client.brandGuidelines && typeof project.client.brandGuidelines === "object") {
    const b = project.client.brandGuidelines as Record<string, string>;
    const parts: string[] = [];
    if (b.tone) parts.push(`Ton de marque : ${b.tone}`);
    if (b.preferredStyle) parts.push(`Style : ${b.preferredStyle}`);
    if (b.additionalNotes) parts.push(`Notes : ${b.additionalNotes}`);
    if (parts.length > 0) brand = parts.join("\n");
  }

  const variables = {
    title,
    keyword: project.keyword,
    persona,
    brand,
  };

  const systemPrompt = interpolate(AUTHOR_BLOCK_PROMPT.system, variables);
  const userPrompt = interpolate(AUTHOR_BLOCK_PROMPT.user, variables);

  try {
    const result = await generate({
      systemPrompt,
      userPrompt,
      maxTokens: 1024,
      temperature: 0.5,
    });

    // Sauvegarder dans step 7 outputData
    const step7 = project.workflowSteps.find((s) => s.stepNumber === 7);
    const existingData = (step7?.outputData as Record<string, unknown>) ?? {};
    await prisma.workflowStep.update({
      where: {
        projectId_stepNumber: { projectId, stepNumber: 7 },
      },
      data: {
        outputData: JSON.parse(
          JSON.stringify({ ...existingData, authorBlock: result.text })
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
      authorBlock: result.text,
      stats: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: costUsd.toFixed(6),
        model: result.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Author block generation failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
