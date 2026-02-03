import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { DEFAULT_PROMPTS } from "@/lib/claude/prompts";
import { WORKFLOW_STEPS } from "@/config/steps";

// GET /api/prompts - Liste tous les prompts (DB + defaults)
export async function GET() {
  // Récupérer les prompts personnalisés en BDD
  const dbPrompts = await prisma.promptTemplate.findMany({
    where: { isActive: true },
    orderBy: { stepNumber: "asc" },
  });

  // Construire la liste fusionnée : default + override BDD
  const prompts = WORKFLOW_STEPS.filter((s) => s.number >= 1 && s.number <= 14 && s.number !== 11)
    .map((step) => {
      const dbEntry = dbPrompts.find((p) => p.stepNumber === step.number);
      const defaultEntry = DEFAULT_PROMPTS[step.number];

      return {
        stepNumber: step.number,
        stepName: step.name,
        systemPrompt: dbEntry?.systemPrompt ?? defaultEntry?.system ?? "",
        userPromptTemplate: dbEntry?.userPromptTemplate ?? defaultEntry?.user ?? "",
        isCustom: !!dbEntry,
        dbId: dbEntry?.id ?? null,
        version: dbEntry?.version ?? 0,
      };
    });

  return NextResponse.json(prompts);
}

// POST /api/prompts - Créer ou mettre à jour un prompt
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { stepNumber, systemPrompt, userPromptTemplate } = body;

  if (stepNumber === undefined || !systemPrompt || !userPromptTemplate) {
    return NextResponse.json(
      { error: "stepNumber, systemPrompt et userPromptTemplate sont requis" },
      { status: 400 }
    );
  }

  const stepDef = WORKFLOW_STEPS.find((s) => s.number === stepNumber);
  if (!stepDef) {
    return NextResponse.json(
      { error: "Numéro d'étape invalide" },
      { status: 400 }
    );
  }

  // Chercher si un prompt existe déjà pour cette étape
  const existing = await prisma.promptTemplate.findFirst({
    where: { stepNumber, isActive: true },
  });

  if (existing) {
    // Mettre à jour
    const updated = await prisma.promptTemplate.update({
      where: { id: existing.id },
      data: {
        systemPrompt,
        userPromptTemplate,
        version: existing.version + 1,
      },
    });
    return NextResponse.json(updated);
  }

  // Créer
  const created = await prisma.promptTemplate.create({
    data: {
      stepNumber,
      stepName: stepDef.name,
      systemPrompt,
      userPromptTemplate,
    },
  });

  return NextResponse.json(created, { status: 201 });
}

// DELETE /api/prompts - Supprimer un prompt personnalisé (revient au défaut)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const stepNumber = parseInt(searchParams.get("stepNumber") ?? "", 10);

  if (isNaN(stepNumber)) {
    return NextResponse.json(
      { error: "stepNumber requis" },
      { status: 400 }
    );
  }

  await prisma.promptTemplate.deleteMany({
    where: { stepNumber },
  });

  return NextResponse.json({ success: true });
}
