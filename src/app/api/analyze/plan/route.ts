import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { extractHeadings, detectVagueHeadings } from "@/lib/plan/parser";
import { extractSemanticTerms, computeUniquenessScore } from "@/lib/plan/semantic";
import type { SERPAnalysis } from "@/lib/serpapi/client";

/**
 * POST /api/analyze/plan — Analyse un plan vs concurrents SERP
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { planText, projectId } = body;

  if (!planText || !projectId) {
    return NextResponse.json(
      { error: "planText et projectId requis" },
      { status: 400 }
    );
  }

  // Charger le projet pour récupérer les données SERP
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: {
      keyword: true,
      serpAnalysis: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Projet introuvable" },
      { status: 404 }
    );
  }

  // 1. Extraire les headings du plan
  const headings = extractHeadings(planText);

  // 2. Détecter les titres vagues
  const vagueHeadings = detectVagueHeadings(headings);

  // 3. Extraire les concurrents du SERP
  let competitorData: { title: string; snippet: string }[] = [];
  if (project.serpAnalysis && typeof project.serpAnalysis === "object") {
    const serp = project.serpAnalysis as unknown as SERPAnalysis;
    competitorData = (serp.organicResults || []).slice(0, 10).map((r) => ({
      title: r.title,
      snippet: r.snippet,
    }));
  }

  // 4. Analyse sémantique
  const semanticTerms = extractSemanticTerms(headings, competitorData);
  const uniquenessScore = computeUniquenessScore(semanticTerms);

  // 5. Appeler Claude pour les suggestions
  const h2List = headings
    .filter((h) => h.level >= 2)
    .map((h) => `${"#".repeat(h.level)} ${h.text}`)
    .join("\n");

  const vagueList = vagueHeadings
    .map((v) => `- "${v.heading.text}" (${v.issue})`)
    .join("\n");

  const missingTerms = semanticTerms
    .filter((t) => t.source === "competitor")
    .slice(0, 15)
    .map((t) => `"${t.term}" (${t.competitorCount} concurrents)`)
    .join(", ");

  const competitorTitles = competitorData
    .map((c) => `- ${c.title}`)
    .join("\n");

  try {
    const result = await generate({
      systemPrompt: `Tu es un expert SEO et architecte de contenu. Tu analyses des plans d'articles pour identifier les opportunités d'Information Gain et améliorer les titres Hn. Réponds en JSON valide uniquement.`,
      userPrompt: `Analyse ce plan d'article pour le mot-clé "${project.keyword}".

--- PLAN ---
${h2List}
--- FIN PLAN ---

--- CONCURRENTS SERP ---
${competitorTitles}
--- FIN CONCURRENTS ---

${vagueList ? `--- TITRES VAGUES DÉTECTÉS ---\n${vagueList}\n--- FIN TITRES VAGUES ---` : "Aucun titre vague détecté."}

${missingTerms ? `--- TERMES MANQUANTS (présents chez concurrents, absents du plan) ---\n${missingTerms}\n--- FIN TERMES ---` : ""}

Score d'unicité actuel : ${uniquenessScore}%

Réponds en JSON avec cette structure exacte :
{
  "vagueHeadingSuggestions": [
    { "original": "titre vague", "suggestion": "titre amélioré descriptif" }
  ],
  "informationGainTips": [
    "suggestion 1 d'angle unique (données propriétaires, étude de cas, interview expert, outil interactif...)",
    "suggestion 2..."
  ],
  "summary": "résumé en 2-3 phrases de l'analyse du plan"
}

Règles :
- Pour chaque titre vague, propose une version descriptive et désambiguïsée contenant le mot-clé ou un terme pertinent
- Propose 3-5 idées concrètes d'Information Gain (données uniques, études de cas, interviews, outils)
- Le résumé doit mentionner le score d'unicité et les points forts/faibles`,
      maxTokens: 1024,
      temperature: 0.3,
    });

    // Logger l'usage API
    await prisma.apiUsageLog.create({
      data: {
        projectId,
        provider: "anthropic",
        model: result.model,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: calculateCost(result.model, result.inputTokens, result.outputTokens),
      },
    });

    // Parser la réponse JSON de Claude
    let aiAnalysis: {
      vagueHeadingSuggestions: { original: string; suggestion: string }[];
      informationGainTips: string[];
      summary: string;
    };

    try {
      // Extraire le JSON de la réponse (peut contenir du markdown)
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      aiAnalysis = JSON.parse(jsonMatch?.[0] || result.text);
    } catch {
      aiAnalysis = {
        vagueHeadingSuggestions: [],
        informationGainTips: [],
        summary: result.text,
      };
    }

    // Enrichir les titres vagues avec les suggestions Claude
    const enrichedVagueHeadings = vagueHeadings.map((vh) => {
      const suggestion = aiAnalysis.vagueHeadingSuggestions.find(
        (s) => s.original.toLowerCase() === vh.heading.text.toLowerCase()
      );
      return {
        ...vh,
        suggestion: suggestion?.suggestion,
      };
    });

    return NextResponse.json({
      headings,
      vagueHeadings: enrichedVagueHeadings,
      semanticTerms,
      uniquenessScore,
      informationGainTips: aiAnalysis.informationGainTips,
      summary: aiAnalysis.summary,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Plan analysis failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
