import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { analyzeQuality } from "@/lib/nlp/qualityMetrics";

/**
 * POST /api/analyze/quality — Analyse NLP de la qualité du texte (pas d'appel IA)
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return NextResponse.json({ error: "projectId requis" }, { status: 400 });
  }

  const step7 = await prisma.workflowStep.findUnique({
    where: {
      projectId_stepNumber: { projectId, stepNumber: 7 },
    },
  });

  if (!step7?.outputText) {
    return NextResponse.json(
      { error: "Article optimisé non trouvé (étape 7)" },
      { status: 400 }
    );
  }

  const metrics = analyzeQuality(step7.outputText);

  // Sauvegarder dans step 7 outputData
  const existingData = (step7.outputData as Record<string, unknown>) ?? {};
  await prisma.workflowStep.update({
    where: {
      projectId_stepNumber: { projectId, stepNumber: 7 },
    },
    data: {
      outputData: JSON.parse(
        JSON.stringify({ ...existingData, qualityScore: metrics })
      ),
    },
  });

  return NextResponse.json({ metrics });
}
