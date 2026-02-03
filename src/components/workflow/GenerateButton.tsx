"use client";

import { Loader2, Sparkles, RotateCcw, Square } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GenerateButtonProps {
  isGenerating: boolean;
  hasOutput: boolean;
  onGenerate: () => void;
  onCancel: () => void;
}

export function GenerateButton({
  isGenerating,
  hasOutput,
  onGenerate,
  onCancel,
}: GenerateButtonProps) {
  if (isGenerating) {
    return (
      <Button variant="destructive" onClick={onCancel}>
        <Square className="mr-2 h-4 w-4" />
        Arrêter
      </Button>
    );
  }

  return (
    <Button onClick={onGenerate}>
      {hasOutput ? (
        <>
          <RotateCcw className="mr-2 h-4 w-4" />
          Régénérer
        </>
      ) : (
        <>
          <Sparkles className="mr-2 h-4 w-4" />
          Générer
        </>
      )}
    </Button>
  );
}

export function GeneratingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span>Génération en cours...</span>
    </div>
  );
}
