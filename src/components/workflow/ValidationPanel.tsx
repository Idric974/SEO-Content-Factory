"use client";

import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ValidationPanelProps {
  isValidated: boolean;
  hasOutput: boolean;
  isGenerating: boolean;
  onValidate: () => void;
  stats?: {
    inputTokens: number;
    outputTokens: number;
    costUsd: string;
    model: string;
  } | null;
}

export function ValidationPanel({
  isValidated,
  hasOutput,
  isGenerating,
  onValidate,
  stats,
}: ValidationPanelProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Validation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats && (
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Modèle</span>
              <span className="font-mono text-xs">{stats.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tokens entrée</span>
              <span>{stats.inputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tokens sortie</span>
              <span>{stats.outputTokens.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-medium">
              <span>Coût</span>
              <span>${stats.costUsd}</span>
            </div>
          </div>
        )}

        {isValidated ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            <Check className="h-4 w-4" />
            <span>Étape validée</span>
          </div>
        ) : (
          <Button
            onClick={onValidate}
            disabled={!hasOutput || isGenerating}
            className="w-full"
          >
            <Check className="mr-2 h-4 w-4" />
            Valider et continuer
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
