import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";

/**
 * POST /api/serp/recommend-format — Recommande un format éditorial via Claude
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, serpFeatures, dominantFormats, businessObjective, peopleAlsoAsk } = body;

  const systemPrompt = `Tu es un stratège de contenu SEO expert. Tu analyses les données SERP et recommandes le framework éditorial le plus adapté. Tu réponds UNIQUEMENT en JSON valide.`;

  const userPrompt = `Analyse ces données SERP et recommande le meilleur framework éditorial.

Données SERP :
- Features détectées : ${(serpFeatures ?? []).join(", ") || "Aucune"}
- Formats dominants : ${(dominantFormats ?? []).join(", ") || "Non détectés"}
- Objectif business : ${businessObjective ?? "Non défini"}
- Questions PAA : ${(peopleAlsoAsk ?? []).slice(0, 5).join(" / ") || "Aucune"}

Frameworks possibles :
- "pas" : Problème - Agitation - Solution (requêtes problème douloureux)
- "aida" : Attention - Intérêt - Désir - Action (contenus conversion)
- "mece" : Mutuellement Exclusif, Collectivement Exhaustif (guides complets)
- "inverted_pyramid" : Pyramide inversée (requêtes informationnelles)

Réponds UNIQUEMENT avec ce JSON :
{"format": "le_format_choisi", "justification": "Explication en 1-2 phrases de pourquoi ce format est le plus adapté"}`;

  try {
    const result = await generate({
      systemPrompt,
      userPrompt,
      maxTokens: 256,
      temperature: 0.3,
    });

    // Logger le coût
    if (projectId) {
      const cost = calculateCost(result.model, result.inputTokens, result.outputTokens);
      await prisma.apiUsageLog.create({
        data: {
          projectId,
          provider: "anthropic",
          model: result.model,
          inputTokens: result.inputTokens,
          outputTokens: result.outputTokens,
          costUsd: cost,
        },
      });
    }

    // Extraire le JSON de la réponse
    const jsonMatch = result.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { format: "mece", justification: "Format par défaut recommandé." },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Sauvegarder le format dans le projet
    if (projectId && parsed.format) {
      await prisma.project.update({
        where: { id: projectId },
        data: { editorialFormat: parsed.format },
      });
    }

    return NextResponse.json(parsed);
  } catch (err) {
    console.error("Format recommendation failed:", err);
    return NextResponse.json(
      { format: "mece", justification: "Format par défaut (erreur de recommandation)." },
    );
  }
}
