"use client";

import { useState, useCallback, useRef } from "react";

interface GenerateState {
  isGenerating: boolean;
  output: string;
  error: string | null;
  stats: {
    inputTokens: number;
    outputTokens: number;
    costUsd: string;
    model: string;
  } | null;
}

/**
 * Hook pour appeler l'API de génération avec streaming SSE
 */
export function useGenerate() {
  const [state, setState] = useState<GenerateState>({
    isGenerating: false,
    output: "",
    error: null,
    stats: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const generate = useCallback(
    async (projectId: string, stepNumber: number) => {
      // Annuler une génération en cours
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setState({
        isGenerating: true,
        output: "",
        error: null,
        stats: null,
      });

      try {
        const response = await fetch(`/api/generate/${stepNumber}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error ?? "Erreur de génération");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Pas de stream disponible");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const json = line.slice(6);

            try {
              const event = JSON.parse(json);

              if (event.type === "text") {
                setState((prev) => ({
                  ...prev,
                  output: prev.output + event.text,
                }));
              } else if (event.type === "done") {
                setState((prev) => ({
                  ...prev,
                  isGenerating: false,
                  stats: {
                    inputTokens: event.inputTokens,
                    outputTokens: event.outputTokens,
                    costUsd: event.costUsd,
                    model: event.model,
                  },
                }));
              } else if (event.type === "error") {
                setState((prev) => ({
                  ...prev,
                  isGenerating: false,
                  error: event.error,
                }));
              }
            } catch {
              // Ligne SSE malformée, on ignore
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          isGenerating: false,
          error: err instanceof Error ? err.message : "Erreur inconnue",
        }));
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isGenerating: false }));
  }, []);

  const setOutput = useCallback((text: string) => {
    setState((prev) => ({ ...prev, output: text }));
  }, []);

  return { ...state, generate, cancel, setOutput };
}
