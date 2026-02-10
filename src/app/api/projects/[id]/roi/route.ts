import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";

type Params = { params: Promise<{ id: string }> };

export interface RoiData {
  tjm: number;
  hoursSpent: number;
  publicationUrl: string;
  publishedAt: string;
  conversionValue: number;
  metrics: MetricsEntry[];
}

export interface MetricsEntry {
  id: string;
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  darkSocialTraffic: number;
  avgTimeOnPage: number;
  bounceRate: number;
  conversions: number;
  revenue: number;
}

interface StepCost {
  stepNumber: number;
  stepName: string;
  costUsd: number;
}

/**
 * GET /api/projects/[id]/roi — Données ROI + coûts agrégés
 */
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      workflowSteps: {
        orderBy: { stepNumber: "asc" },
        select: {
          stepNumber: true,
          stepName: true,
          costUsd: true,
          outputText: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Données ROI existantes
  const roiData = (project.roiData as RoiData | null) ?? null;

  // Coûts API agrégés par provider
  const apiLogs = await prisma.apiUsageLog.groupBy({
    by: ["provider"],
    where: { projectId: id },
    _sum: { costUsd: true },
    _count: true,
  });

  const apiCostTotal = apiLogs.reduce(
    (sum, log) => sum + (log._sum.costUsd ? Number(log._sum.costUsd) : 0),
    0
  );

  const byProvider: Record<string, { count: number; cost: number }> = {};
  for (const log of apiLogs) {
    byProvider[log.provider] = {
      count: log._count,
      cost: log._sum.costUsd ? Number(log._sum.costUsd) : 0,
    };
  }

  // Coûts par étape
  const stepCosts: StepCost[] = project.workflowSteps
    .filter((s) => s.costUsd && Number(s.costUsd) > 0)
    .map((s) => ({
      stepNumber: s.stepNumber,
      stepName: s.stepName,
      costUsd: Number(s.costUsd),
    }));

  // Nombre de mots (étape 7 = article optimisé)
  const step7 = project.workflowSteps.find((s) => s.stepNumber === 7);
  const wordCount = step7?.outputText
    ? step7.outputText.split(/\s+/).filter(Boolean).length
    : 0;

  return NextResponse.json({
    roiData,
    apiCosts: {
      total: apiCostTotal,
      byProvider,
    },
    stepCosts,
    wordCount,
  });
}

/**
 * PUT /api/projects/[id]/roi — Sauvegarder les données ROI
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.project.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  const project = await prisma.project.update({
    where: { id },
    data: {
      roiData: JSON.parse(JSON.stringify(body.roiData)),
    },
  });

  return NextResponse.json({
    roiData: project.roiData as RoiData | null,
  });
}
