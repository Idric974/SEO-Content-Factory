import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { WORKFLOW_STEPS } from "@/config/steps";

// GET /api/projects - Liste tous les projets
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const status = searchParams.get("status");

  const where: Record<string, unknown> = {};
  if (clientId) where.clientId = clientId;
  if (status) where.status = status;

  const projects = await prisma.project.findMany({
    where,
    include: {
      client: { select: { id: true, name: true, slug: true } },
      workflowSteps: {
        where: { isValidated: true },
        select: { stepNumber: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(projects);
}

// POST /api/projects - Crée un nouveau projet
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clientId, title, keyword, searchIntents } = body;

  if (!clientId || !title || !keyword) {
    return NextResponse.json(
      { error: "clientId, title et keyword sont requis" },
      { status: 400 }
    );
  }

  const client = await prisma.client.findUnique({ where: { id: clientId } });
  if (!client) {
    return NextResponse.json(
      { error: "Client introuvable" },
      { status: 404 }
    );
  }

  const project = await prisma.project.create({
    data: {
      clientId,
      title,
      keyword,
      searchIntents: searchIntents ?? [],
      status: "draft",
      currentStep: 0,
    },
    include: { client: true },
  });

  // Créer les entrées workflow_steps pour chaque étape
  await prisma.workflowStep.createMany({
    data: WORKFLOW_STEPS.map((step) => ({
      projectId: project.id,
      stepNumber: step.number,
      stepName: step.name,
    })),
  });

  return NextResponse.json(project, { status: 201 });
}
