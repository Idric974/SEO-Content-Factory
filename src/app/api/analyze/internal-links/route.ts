import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { INTERNAL_LINKS_PROMPT, interpolate } from "@/lib/claude/prompts";
import { tavilySearch } from "@/lib/tavily/client";

export interface SitePage {
  url: string;
  title: string;
  snippet: string;
  relevance: number;
}

export interface InternalLinkSuggestion {
  anchor: string;
  targetUrl: string;
  targetTitle: string;
  relevanceScore: number;
  articleContext: string;
  freshnessNote: string | null;
}

/**
 * POST /api/analyze/internal-links — Scan site + suggestion de maillage interne
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, siteUrl } = body;

  if (!projectId || !siteUrl) {
    return NextResponse.json(
      { error: "projectId et siteUrl requis" },
      { status: 400 }
    );
  }

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workflowSteps: {
        where: { stepNumber: { in: [1, 7] } },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  // Article optimisé (step 7)
  const step7 = project.workflowSteps.find((s) => s.stepNumber === 7);
  if (!step7?.outputText) {
    return NextResponse.json(
      { error: "Article optimisé non trouvé (étape 7)" },
      { status: 400 }
    );
  }

  // Titre
  const step1 = project.workflowSteps.find((s) => s.stepNumber === 1);
  const step1Data = step1?.outputData as { selectedTitle?: string } | null;
  const title = step1Data?.selectedTitle ?? project.title;

  // Normaliser l'URL du site
  let domain = siteUrl.replace(/^https?:\/\//, "").replace(/\/+$/, "");

  try {
    // === Étape 1 : Scanner le site via Tavily ===
    const sitePages: SitePage[] = [];

    // Requête 1 : site:domain + mot-clé principal
    const searchQueries = [
      `site:${domain} ${project.keyword}`,
      `site:${domain}`,
    ];

    // Extraire des termes clés de l'article pour des recherches ciblées
    const headings = step7.outputText.match(/^##\s+(.+)$/gm);
    if (headings && headings.length > 0) {
      const firstH2 = headings[0].replace(/^##\s+/, "").trim();
      searchQueries.push(`site:${domain} ${firstH2}`);
    }

    for (const query of searchQueries) {
      try {
        const result = await tavilySearch({
          query,
          maxResults: 5,
          searchDepth: "basic",
        });

        for (const r of result.results) {
          // Éviter les doublons
          if (!sitePages.find((p) => p.url === r.url)) {
            sitePages.push({
              url: r.url,
              title: r.title,
              snippet: r.content.slice(0, 300),
              relevance: r.score,
            });
          }
        }
      } catch {
        // Continuer même si une recherche échoue
      }
    }

    if (sitePages.length === 0) {
      return NextResponse.json({
        suggestions: [],
        sitePages: [],
        stats: null,
        message: "Aucune page trouvée sur ce domaine. Vérifiez l'URL du site.",
      });
    }

    // === Étape 2 : Claude analyse les opportunités de liens internes ===
    const sitePagesFormatted = sitePages
      .slice(0, 15) // Max 15 pages pour ne pas surcharger le prompt
      .map(
        (p, i) =>
          `${i + 1}. ${p.title}\n   URL : ${p.url}\n   Extrait : ${p.snippet}`
      )
      .join("\n\n");

    const variables = {
      title,
      keyword: project.keyword,
      article: step7.outputText,
      sitePages: sitePagesFormatted,
    };

    const systemPrompt = interpolate(INTERNAL_LINKS_PROMPT.system, variables);
    const userPrompt = interpolate(INTERNAL_LINKS_PROMPT.user, variables);

    const result = await generate({
      systemPrompt,
      userPrompt,
      maxTokens: 3072,
      temperature: 0.4,
    });

    // Parser le JSON
    let suggestions: InternalLinkSuggestion[] = [];
    try {
      const jsonMatch = result.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        suggestions = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json(
        { error: "Format de réponse inattendu", raw: result.text },
        { status: 500 }
      );
    }

    // Sauvegarder dans step 14 outputData
    const step14 = await prisma.workflowStep.findUnique({
      where: {
        projectId_stepNumber: { projectId, stepNumber: 14 },
      },
    });
    const existingData = (step14?.outputData as Record<string, unknown>) ?? {};
    await prisma.workflowStep.update({
      where: {
        projectId_stepNumber: { projectId, stepNumber: 14 },
      },
      data: {
        outputData: JSON.parse(
          JSON.stringify({
            ...existingData,
            internalLinks: suggestions,
            sitePages,
            siteUrl,
          })
        ),
      },
    });

    // Logger l'usage API
    const costUsd = calculateCost(
      result.model,
      result.inputTokens,
      result.outputTokens
    );
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
      suggestions,
      sitePages,
      stats: {
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
        costUsd: costUsd.toFixed(6),
        model: result.model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Internal links analysis failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
