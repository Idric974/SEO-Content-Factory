import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { generateStream } from "@/lib/claude/client";
import { calculateCost } from "@/lib/claude/costs";
import { buildPrompts } from "@/lib/claude/prompts";
import { extractVariables } from "@/lib/claude/variables";
import { getStepByNumber } from "@/config/steps";

type Params = { params: Promise<{ step: string }> };

// POST /api/generate/[step] - Génère le contenu d'une étape avec streaming SSE
export async function POST(request: NextRequest, { params }: Params) {
  const { step: stepParam } = await params;
  const stepNumber = parseInt(stepParam, 10);

  if (isNaN(stepNumber) || stepNumber < 1 || stepNumber > 14) {
    return new Response(
      JSON.stringify({ error: "Numéro d'étape invalide (1-14)" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const body = await request.json();
  const { projectId } = body;

  if (!projectId) {
    return new Response(
      JSON.stringify({ error: "projectId requis" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Charger le projet avec toutes ses données
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

  // Extraire les variables et construire les prompts
  const variables = extractVariables(project);

  // Pour l'étape 1, le titre choisi est le titre du projet
  // Pour les étapes suivantes, on utilise le titre sélectionné à l'étape 1
  const step1 = project.workflowSteps.find((s) => s.stepNumber === 1);
  if (step1?.outputData && typeof step1.outputData === "object") {
    const data = step1.outputData as { selectedTitle?: string };
    if (data.selectedTitle) {
      variables.title = data.selectedTitle;
    }
  }

  // Chercher un prompt personnalisé en BDD
  const customPrompt = await prisma.promptTemplate.findFirst({
    where: { stepNumber, isActive: true },
  });

  const { systemPrompt, userPrompt } = buildPrompts(
    stepNumber,
    variables,
    customPrompt?.systemPrompt ?? undefined,
    customPrompt?.userPromptTemplate ?? undefined
  );

  // Config par étape
  const stepDef = getStepByNumber(stepNumber);
  const maxTokens = stepDef?.maxTokens || 4096;
  const temperature = stepDef?.temperature ?? 0.7;

  // Streaming SSE
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        const stream = await generateStream({
          systemPrompt,
          userPrompt,
          maxTokens,
          temperature,
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

        // Sauvegarder le résultat dans workflow_steps
        await prisma.workflowStep.update({
          where: {
            projectId_stepNumber: {
              projectId,
              stepNumber,
            },
          },
          data: {
            outputText: fullText,
            outputData: { text: fullText },
            tokensUsed: inputTokens + outputTokens,
            costUsd,
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

        // Envoyer les métadonnées finales
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              inputTokens,
              outputTokens,
              costUsd: costUsd.toFixed(6),
              model,
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
