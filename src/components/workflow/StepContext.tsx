"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ContextItem {
  stepNumber: number;
  stepName: string;
  summary: string;
}

interface StepContextProps {
  items: ContextItem[];
  userInstructions?: string;
}

/**
 * Affiche les données contextuelles des étapes précédentes
 * et les instructions pour l'étape en cours.
 */
export function StepContext({ items, userInstructions }: StepContextProps) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <div className="space-y-3">
      {/* Instructions */}
      {userInstructions && (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardContent className="flex gap-3 pt-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
            <p className="text-sm text-blue-800 dark:text-blue-200">
              {userInstructions}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Contexte des étapes précédentes */}
      {items.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Données des étapes précédentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {items.map((item) => (
              <div key={item.stepNumber} className="rounded-md border">
                <button
                  onClick={() =>
                    setExpandedStep(
                      expandedStep === item.stepNumber
                        ? null
                        : item.stepNumber
                    )
                  }
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
                >
                  {expandedStep === item.stepNumber ? (
                    <ChevronDown className="h-3 w-3 shrink-0" />
                  ) : (
                    <ChevronRight className="h-3 w-3 shrink-0" />
                  )}
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {item.stepNumber}
                  </Badge>
                  <span className="truncate">{item.stepName}</span>
                </button>
                {expandedStep === item.stepNumber && (
                  <div className="border-t px-3 py-2">
                    <pre className="max-h-40 overflow-y-auto whitespace-pre-wrap text-xs text-muted-foreground">
                      {item.summary}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
