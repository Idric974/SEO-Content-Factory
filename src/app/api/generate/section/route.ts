import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generateStream } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { extractVariables } from "@/lib/claude/variables";
import { SECTION_PROMPT, interpolate } from "@/lib/claude/prompts";

/**
 * POST /api/generate/section — Génère une section H2 de l'article avec streaming SSE
 */
export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    projectId,
    sectionIndex,
    sectionHeading,
    subsections,
    previousSectionText,
    qbstTerms,
  } = body;

  if (!projectId || sectionIndex === undefined || !sectionHeading) {
    return new Response(
      JSON.stringify({ error: "projectId, sectionIndex et sectionHeading requis" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Charger le projet
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      client: true,
      workflowSteps: { orderBy: { stepNumber: "asc" } },
    },
  });

  if (!project) {
    return new Response(
      JSON.stringify({ error: "Projet introuvable" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Extraire les variables standard
  const variables = extractVariables(project);

  // Injecter les variables spécifiques à la section
  variables.sectionHeading = sectionHeading;
  variables.subsections = (subsections as string[])?.join("\n- ") || "";

  // Contexte de la section précédente
  if (previousSectionText) {
    const trimmed =
      previousSectionText.length > 1000
        ? "..." + previousSectionText.slice(-1000)
        : previousSectionText;
    variables.previousSectionContext = `Section précédente (pour assurer la continuité du ton et des transitions) :\n${trimmed}`;
  } else {
    variables.previousSectionContext = "";
  }

  // Termes QBST
  if (qbstTerms && (qbstTerms as string[]).length > 0) {
    variables.qbstContext = `Termes clés à intégrer naturellement dans cette section :\n${(qbstTerms as string[]).join(", ")}\n\nEssaie d'utiliser ces termes de manière naturelle pour renforcer la pertinence sémantique.`;
  } else {
    variables.qbstContext = "";
  }

  // Titre sélectionné à l'étape 1
  const step1 = project.workflowSteps.find((s) => s.stepNumber === 1);
  if (step1?.outputData && typeof step1.outputData === "object") {
    const data = step1.outputData as { selectedTitle?: string };
    if (data.selectedTitle) {
      variables.title = data.selectedTitle;
    }
  }

  // Construire les prompts
  const systemPrompt = interpolate(SECTION_PROMPT.system, variables);
  const userPrompt = interpolate(SECTION_PROMPT.user, variables);

  // Streaming SSE
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await generateStream({
          systemPrompt,
          userPrompt,
          maxTokens: 2048,
          temperature: 0.7,
        });

        let fullText = "";

        stream.on("text", (text) => {
          fullText += text;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "text", text })}\n\n`)
          );
        });

        const finalMessage = await stream.finalMessage();

        const inputTokens = finalMessage.usage.input_tokens;
        const outputTokens = finalMessage.usage.output_tokens;
        const model = finalMessage.model;
        const costUsd = calculateCost(model, inputTokens, outputTokens);

        // Sauvegarder la section dans outputData du step 6
        const step6 = await prisma.workflowStep.findUnique({
          where: {
            projectId_stepNumber: { projectId, stepNumber: 6 },
          },
        });

        const existingData = (step6?.outputData as Record<string, unknown>) ?? {};
        const existingSections = (existingData.sections as Array<Record<string, unknown>>) ?? [];

        // Mettre à jour ou ajouter la section
        const wordCount = fullText.split(/\s+/).filter(Boolean).length;
        const updatedSection = {
          index: sectionIndex,
          heading: sectionHeading,
          content: fullText,
          status: "done",
          wordCount,
        };

        const sectionExists = existingSections.findIndex(
          (s) => s.index === sectionIndex
        );
        if (sectionExists >= 0) {
          existingSections[sectionExists] = updatedSection;
        } else {
          existingSections.push(updatedSection);
        }

        await prisma.workflowStep.update({
          where: {
            projectId_stepNumber: { projectId, stepNumber: 6 },
          },
          data: {
            outputData: JSON.parse(
              JSON.stringify({
                ...existingData,
                sections: existingSections,
                assembled: false,
              })
            ),
          },
        });

        // Logger l'usage API
        await prisma.apiUsageLog.create({
          data: {
            projectId,
            provider: "anthropic",
            model,
            inputTokens,
            outputTokens,
            costUsd,
          },
        });

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              sectionIndex,
              inputTokens,
              outputTokens,
              costUsd: costUsd.toFixed(6),
              model,
              wordCount,
            })}\n\n`
          )
        );
        controller.close();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Erreur inconnue";
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", error: message })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
