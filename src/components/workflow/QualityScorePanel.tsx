"use client";

import { useState } from "react";
import { Loader2, BarChart3, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QualityMetrics } from "@/lib/nlp/qualityMetrics";

interface QualityScorePanelProps {
  projectId: string;
  existingMetrics?: QualityMetrics;
}

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-600 dark:text-green-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function scoreBg(score: number): string {
  if (score >= 75) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  if (score >= 50) return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
}

function MetricBar({ label, value, max, unit, target }: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  target?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const barColor =
    pct >= 75 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">
          {value}{unit ?? ""} {target && <span className="text-muted-foreground">({target})</span>}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted">
        <div
          className={`h-2 rounded-full ${barColor} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function QualityScorePanel({
  projectId,
  existingMetrics,
}: QualityScorePanelProps) {
  const [metrics, setMetrics] = useState<QualityMetrics | null>(
    existingMetrics ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze/quality", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'analyse");
      }

      const data = await res.json();
      setMetrics(data.metrics);
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
            <BarChart3 className="h-4 w-4" />
            Score de Qualité (NLP)
          </CardTitle>
          <Button
            size="sm"
            variant={metrics ? "outline" : "default"}
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Analyse...
              </>
            ) : metrics ? (
              "Réanalyser"
            ) : (
              "Analyser la qualité"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Analyse instantanée de la diversité lexicale, lisibilité, verbes modaux
          et voix passive. Aucun appel IA — résultat immédiat.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {metrics && (
          <>
            {/* Score global */}
            <div className="flex items-center gap-4">
              <div className={`text-4xl font-bold ${scoreColor(metrics.overallScore)}`}>
                {metrics.overallScore}
              </div>
              <div>
                <p className="text-sm font-medium">Score global</p>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalWords} mots | {metrics.totalSentences} phrases
                </p>
              </div>
              <Badge className={`ml-auto ${scoreBg(metrics.overallScore)}`}>
                {metrics.overallScore >= 75
                  ? "Bonne qualité"
                  : metrics.overallScore >= 50
                    ? "À améliorer"
                    : "Qualité faible"}
              </Badge>
            </div>

            {/* Jauges */}
            <div className="space-y-3">
              <MetricBar
                label="Diversité lexicale"
                value={metrics.lexicalDiversity}
                max={100}
                unit="%"
                target="cible 60-80%"
              />
              <MetricBar
                label="Lisibilité Flesch"
                value={metrics.readabilityScore}
                max={100}
                target="plus haut = plus lisible"
              />
              <MetricBar
                label="Longueur moy. phrases"
                value={Math.max(0, 100 - (metrics.avgSentenceLength - 15) * 4)}
                max={100}
                unit=""
                target={`${metrics.avgSentenceLength} mots/phrase`}
              />
            </div>

            {/* Alertes */}
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-lg font-bold">{metrics.modalVerbCount}</p>
                <p className="text-xs text-muted-foreground">Verbes modaux</p>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-lg font-bold">{metrics.passiveVoiceCount}</p>
                <p className="text-xs text-muted-foreground">Voix passive</p>
              </div>
              <div className="rounded-lg border p-2.5 text-center">
                <p className="text-lg font-bold">{metrics.longSentences}</p>
                <p className="text-xs text-muted-foreground">Phrases longues (&gt;25 mots)</p>
              </div>
            </div>

            {/* Exemples expandable */}
            {(metrics.modalVerbExamples.length > 0 ||
              metrics.passiveVoiceExamples.length > 0) && (
              <div>
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showExamples ? (
                    <ChevronUp className="h-3 w-3" />
                  ) : (
                    <ChevronDown className="h-3 w-3" />
                  )}
                  {showExamples ? "Masquer" : "Voir"} les exemples
                </button>

                {showExamples && (
                  <div className="mt-2 space-y-3">
                    {metrics.modalVerbExamples.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">
                          Verbes modaux trouvés :
                        </p>
                        <ul className="space-y-1">
                          {metrics.modalVerbExamples.map((ex, i) => (
                            <li
                              key={i}
                              className="text-xs text-muted-foreground bg-muted rounded px-2 py-1"
                            >
                              &ldquo;{ex}&rdquo;
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {metrics.passiveVoiceExamples.length > 0 && (
                      <div>
                        <p className="text-xs font-medium mb-1">
                          Voix passive trouvée :
                        </p>
                        <ul className="space-y-1">
                          {metrics.passiveVoiceExamples.map((ex, i) => (
                            <li
                              key={i}
                              className="text-xs text-muted-foreground bg-muted rounded px-2 py-1"
                            >
                              &ldquo;{ex}&rdquo;
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
