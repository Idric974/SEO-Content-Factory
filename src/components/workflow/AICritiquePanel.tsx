"use client";

import { useState } from "react";
import { Loader2, MessageSquareWarning, ThumbsUp, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface CritiqueAxis {
  name: string;
  score: number;
  strengths: string[];
  improvements: string[];
}

export interface CritiqueResult {
  axes: CritiqueAxis[];
  overallScore: number;
  priorityActions: string[];
}

interface AICritiquePanelProps {
  projectId: string;
  existingCritique?: CritiqueResult;
}

function axisScoreColor(score: number): string {
  if (score >= 8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  if (score >= 6) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
}

function overallColor(score: number): string {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function AICritiquePanel({
  projectId,
  existingCritique,
}: AICritiquePanelProps) {
  const [critique, setCritique] = useState<CritiqueResult | null>(
    existingCritique ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCritique() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze/critique", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la critique");
      }

      const data = await res.json();
      setCritique(data.critique);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquareWarning className="h-4 w-4" />
            Critique IA
          </CardTitle>
          <Button
            size="sm"
            variant={critique ? "outline" : "default"}
            onClick={handleCritique}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Analyse...
              </>
            ) : critique ? (
              "Relancer"
            ) : (
              "Lancer la critique"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Un agent &ldquo;Critique&rdquo; exigeant analyse l&apos;article sur 5 axes :
          originalité, profondeur, engagement, crédibilité et structure.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {critique && (
          <>
            {/* Score global */}
            <div className="flex items-center gap-4">
              <div
                className={`text-4xl font-bold ${overallColor(critique.overallScore)}`}
              >
                {critique.overallScore}
              </div>
              <div>
                <p className="text-sm font-medium">Score éditorial</p>
                <p className="text-xs text-muted-foreground">
                  Moyenne sur 5 axes d&apos;analyse
                </p>
              </div>
            </div>

            {/* Axes */}
            <div className="space-y-3">
              {critique.axes.map((axis, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{axis.name}</p>
                    <Badge className={axisScoreColor(axis.score)}>
                      {axis.score}/10
                    </Badge>
                  </div>

                  {axis.strengths.length > 0 && (
                    <div className="space-y-1">
                      {axis.strengths.map((s, j) => (
                        <div
                          key={j}
                          className="flex items-start gap-1.5 text-xs text-green-700 dark:text-green-400"
                        >
                          <ThumbsUp className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {axis.improvements.length > 0 && (
                    <div className="space-y-1">
                      {axis.improvements.map((imp, j) => (
                        <div
                          key={j}
                          className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400"
                        >
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>{imp}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Actions prioritaires */}
            {critique.priorityActions.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Actions prioritaires
                </p>
                <ol className="space-y-1 list-decimal list-inside">
                  {critique.priorityActions.map((action, i) => (
                    <li
                      key={i}
                      className="text-xs text-blue-700 dark:text-blue-400"
                    >
                      {action}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
