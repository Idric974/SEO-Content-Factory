import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generate } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import {
  FACT_CHECK_EXTRACT_PROMPT,
  FACT_CHECK_EVALUATE_PROMPT,
  interpolate,
} from "@/lib/claude/prompts";
import { tavilySearch } from "@/lib/tavily/client";

interface ExtractedClaim {
  claim: string;
  searchQuery: string;
}

export interface FactCheckResult {
  claim: string;
  verdict: "confirmé" | "douteux" | "non_vérifié";
  confidence: number;
  justification: string;
  source: string | null;
  suggestion: string | null;
}

/**
 * POST /api/analyze/fact-check — Fact-checking en 2 passes (extraction + vérification)
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

  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    return NextResponse.json({ error: "Projet introuvable" }, { status: 404 });
  }

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let model = "";

  try {
    // === Étape 1 : Extraction des affirmations ===
    const extractSystem = interpolate(FACT_CHECK_EXTRACT_PROMPT.system, {});
    const extractUser = interpolate(FACT_CHECK_EXTRACT_PROMPT.user, {
      article: step7.outputText,
    });

    const extractResult = await generate({
      systemPrompt: extractSystem,
      userPrompt: extractUser,
      maxTokens: 2048,
      temperature: 0.3,
    });

    totalInputTokens += extractResult.inputTokens;
    totalOutputTokens += extractResult.outputTokens;
    model = extractResult.model;

    let claims: ExtractedClaim[] = [];
    try {
      const jsonMatch = extractResult.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        claims = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json(
        { error: "Impossible d'extraire les affirmations", raw: extractResult.text },
        { status: 500 }
      );
    }

    if (claims.length === 0) {
      const emptyResult: FactCheckResult[] = [];
      return NextResponse.json({ claims: emptyResult, stats: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, costUsd: "0", model } });
    }

    // === Étape 2 : Recherche web via Tavily ===
    const claimsWithSources: string[] = [];

    for (const claim of claims.slice(0, 10)) {
      let searchResults = "Aucune source web trouvée.";
      try {
        const tavilyResult = await tavilySearch({
          query: claim.searchQuery,
          maxResults: 3,
          searchDepth: "basic",
        });
        if (tavilyResult.results.length > 0) {
          searchResults = tavilyResult.results
            .map(
              (r) =>
                `- ${r.title} (${r.url})\n  ${r.content.slice(0, 200)}`
            )
            .join("\n");
        }
      } catch {
        // Si Tavily échoue, on continue sans sources
        searchResults = "Recherche web indisponible.";
      }

      claimsWithSources.push(
        `### Affirmation : "${claim.claim}"\nSources web :\n${searchResults}`
      );
    }

    // === Étape 3 : Évaluation par Claude ===
    const evalSystem = interpolate(FACT_CHECK_EVALUATE_PROMPT.system, {});
    const evalUser = interpolate(FACT_CHECK_EVALUATE_PROMPT.user, {
      claimsWithSources: claimsWithSources.join("\n\n"),
    });

    const evalResult = await generate({
      systemPrompt: evalSystem,
      userPrompt: evalUser,
      maxTokens: 3072,
      temperature: 0.3,
    });

    totalInputTokens += evalResult.inputTokens;
    totalOutputTokens += evalResult.outputTokens;

    let results: FactCheckResult[] = [];
    try {
      const jsonMatch = evalResult.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        results = JSON.parse(jsonMatch[0]);
      }
    } catch {
      return NextResponse.json(
        { error: "Impossible de parser l'évaluation", raw: evalResult.text },
        { status: 500 }
      );
    }

    // Sauvegarder dans step 7 outputData
    const existingData = (step7.outputData as Record<string, unknown>) ?? {};
    await prisma.workflowStep.update({
      where: {
        projectId_stepNumber: { projectId, stepNumber: 7 },
      },
      data: {
        outputData: JSON.parse(
          JSON.stringify({ ...existingData, factCheck: results })
        ),
      },
    });

    // Logger l'usage API (2 appels Claude combinés)
    const costUsd = calculateCost(model, totalInputTokens, totalOutputTokens);
    await prisma.apiUsageLog.create({
      data: {
        projectId,
        provider: "anthropic",
        model,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd,
      },
    });

    return NextResponse.json({
      claims: results,
      stats: {
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        costUsd: costUsd.toFixed(6),
        model,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    console.error("Fact-check failed:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
