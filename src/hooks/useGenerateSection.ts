"use client";

import { useState, useCallback, useRef } from "react";

interface SectionStats {
  inputTokens: number;
  outputTokens: number;
  costUsd: string;
  model: string;
  wordCount: number;
}

/**
 * Hook pour générer une section d'article avec streaming SSE.
 */
export function useGenerateSection() {
  const [generatingIndex, setGeneratingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<SectionStats | null>(null);
  const [streamingText, setStreamingText] = useState("");

  const abortRef = useRef<AbortController | null>(null);

  const generateSection = useCallback(
    async (
      projectId: string,
      sectionIndex: number,
      sectionHeading: string,
      subsections: string[],
      previousSectionText: string,
      qbstTerms: string[],
      onComplete: (index: number, text: string) => void
    ) => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      setGeneratingIndex(sectionIndex);
      setError(null);
      setStats(null);
      setStreamingText("");

      try {
        const response = await fetch("/api/generate/section", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId,
            sectionIndex,
            sectionHeading,
            subsections,
            previousSectionText,
            qbstTerms,
          }),
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
        let fullText = "";

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
                fullText += event.text;
                setStreamingText(fullText);
              } else if (event.type === "done") {
                setGeneratingIndex(null);
                setStats({
                  inputTokens: event.inputTokens,
                  outputTokens: event.outputTokens,
                  costUsd: event.costUsd,
                  model: event.model,
                  wordCount: event.wordCount,
                });
                onComplete(sectionIndex, fullText);
              } else if (event.type === "error") {
                setGeneratingIndex(null);
                setError(event.error);
              }
            } catch {
              // SSE malformé
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
        setGeneratingIndex(null);
        setError(err instanceof Error ? err.message : "Erreur inconnue");
      }
    },
    []
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setGeneratingIndex(null);
  }, []);

  return {
    generatingIndex,
    streamingText,
    error,
    stats,
    generateSection,
    cancel,
  };
}
