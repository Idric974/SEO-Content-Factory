import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { analyzeSERP } from "@/lib/serpapi/client";

/**
 * POST /api/serp/analyze — Lance une analyse SERP et sauvegarde dans le projet
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { keyword, projectId } = body;

  if (!keyword) {
    return NextResponse.json(
      { error: "keyword requis" },
      { status: 400 }
    );
  }

  try {
    const analysis = await analyzeSERP(keyword);

    // Sauvegarder dans le projet si projectId fourni
    if (projectId) {
      await prisma.project.update({
        where: { id: projectId },
        data: { serpAnalysis: JSON.parse(JSON.stringify(analysis)) },
      });

      // Logger l'usage API
      await prisma.apiUsageLog.create({
        data: {
          projectId,
          provider: "serpapi",
          model: "google_search",
          costUsd: 0, // SerpAPI facture au forfait, pas à l'usage unitaire
        },
      });
    }

    return NextResponse.json(analysis);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("SERP analysis failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
