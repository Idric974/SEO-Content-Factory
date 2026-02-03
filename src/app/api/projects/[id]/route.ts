import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      client: true,
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      images: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Projet introuvable" },
      { status: 404 }
    );
  }

  return NextResponse.json(project);
}

// PUT /api/projects/:id
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();
  const { title, keyword, searchIntents, status, currentStep } = body;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Projet introuvable" },
      { status: 404 }
    );
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(keyword !== undefined && { keyword }),
      ...(searchIntents !== undefined && { searchIntents }),
      ...(status !== undefined && { status }),
      ...(currentStep !== undefined && { currentStep }),
    },
    include: { client: true },
  });

  return NextResponse.json(project);
}

// DELETE /api/projects/:id
export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Projet introuvable" },
      { status: 404 }
    );
  }

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
