import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Params = { params: Promise<{ id: string; step: string }> };

// GET /api/projects/:id/steps/:step - Récupérer une étape
export async function GET(_request: NextRequest, { params }: Params) {
  const { id, step: stepParam } = await params;
  const stepNumber = parseInt(stepParam, 10);

  const workflowStep = await prisma.workflowStep.findUnique({
    where: { projectId_stepNumber: { projectId: id, stepNumber } },
  });

  if (!workflowStep) {
    return NextResponse.json({ error: "Étape introuvable" }, { status: 404 });
  }

  return NextResponse.json(workflowStep);
}

// PUT /api/projects/:id/steps/:step - Mettre à jour une étape
export async function PUT(request: NextRequest, { params }: Params) {
  const { id, step: stepParam } = await params;
  const stepNumber = parseInt(stepParam, 10);
  const body = await request.json();

  const { outputText, outputData, isValidated } = body;

  const workflowStep = await prisma.workflowStep.update({
    where: { projectId_stepNumber: { projectId: id, stepNumber } },
    data: {
      ...(outputText !== undefined && { outputText }),
      ...(outputData !== undefined && { outputData }),
      ...(isValidated !== undefined && {
        isValidated,
        validatedAt: isValidated ? new Date() : null,
      }),
    },
  });

  // Si validé, avancer l'étape courante du projet
  if (isValidated) {
    const project = await prisma.project.findUnique({ where: { id } });
    if (project && project.currentStep <= stepNumber) {
      await prisma.project.update({
        where: { id },
        data: {
          currentStep: stepNumber + 1,
          status: stepNumber >= 15 ? "completed" : "in_progress",
        },
      });
    }
  }

  return NextResponse.json(workflowStep);
}
