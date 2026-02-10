"use client";

import { useState } from "react";
import {
  Loader2,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Lightbulb,
  ArrowRight,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PlanHeading, HnIssue } from "@/lib/plan/parser";
import { issueLabel } from "@/lib/plan/parser";
import type { SemanticTerm } from "@/lib/plan/semantic";

interface PlanAnalysis {
  headings: PlanHeading[];
  vagueHeadings: HnIssue[];
  semanticTerms: SemanticTerm[];
  uniquenessScore: number;
  informationGainTips: string[];
  summary: string;
}

interface PlanAnalyzerProps {
  planText: string;
  projectId: string;
  onApplySuggestions?: (updatedPlan: string) => void;
}

export default function PlanAnalyzer({
  planText,
  projectId,
  onApplySuggestions,
}: PlanAnalyzerProps) {
  const [analysis, setAnalysis] = useState<PlanAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runAnalysis() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planText, projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'analyse");
      }

      const data = await res.json();
      setAnalysis(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function applySuggestions() {
    if (!analysis || !onApplySuggestions) return;

    let updated = planText;
    for (const vh of analysis.vagueHeadings) {
      if (vh.suggestion) {
        // Remplacer le titre vague par la suggestion
        const prefix = "#".repeat(vh.heading.level);
        updated = updated.replace(
          `${prefix} ${vh.heading.text}`,
          `${prefix} ${vh.suggestion}`
        );
      }
    }
    onApplySuggestions(updated);
  }

  const hasSuggestions =
    analysis?.vagueHeadings.some((vh) => vh.suggestion) ?? false;

  if (!analysis && !loading) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-6">
          <Search className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground text-center">
            Analysez votre plan pour vérifier l&apos;Information Gain, la
            qualité des titres Hn et les trous sémantiques vs concurrents.
          </p>
          <Button onClick={runAnalysis} disabled={!planText.trim()}>
            <BarChart3 className="mr-2 h-4 w-4" />
            Analyser le plan
          </Button>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-3 py-8">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-muted-foreground">
            Analyse en cours (comparaison SERP + IA)...
          </span>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  const coveredTerms = analysis.semanticTerms.filter(
    (t) => t.source === "both"
  );
  const missingTerms = analysis.semanticTerms.filter(
    (t) => t.source === "competitor"
  );
  const uniqueTerms = analysis.semanticTerms.filter(
    (t) => t.source === "plan"
  );

  return (
    <div className="space-y-4">
      {/* Résumé IA */}
      <Card>
        <CardContent className="pt-4">
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </CardContent>
      </Card>

      {/* Section 1 : Score d'unicité */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Information Gain — Score d&apos;unicité
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16">
              <svg className="h-16 w-16 -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15.91549"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-muted"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15.91549"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray={`${analysis.uniquenessScore} ${100 - analysis.uniquenessScore}`}
                  className={
                    analysis.uniquenessScore >= 30
                      ? "text-green-500"
                      : analysis.uniquenessScore >= 20
                        ? "text-orange-500"
                        : "text-red-500"
                  }
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                {analysis.uniquenessScore}%
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">
                {analysis.uniquenessScore >= 30
                  ? "Bon niveau d'originalité"
                  : analysis.uniquenessScore >= 20
                    ? "Unicité moyenne — ajoutez des angles uniques"
                    : "Unicité faible — le plan est trop similaire aux concurrents"}
              </p>
              <p className="text-xs text-muted-foreground">
                Objectif : &ge; 30% de termes uniques dans le plan
              </p>
            </div>
          </div>

          {analysis.informationGainTips.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                Suggestions d&apos;Information Gain
              </p>
              <ul className="space-y-1.5">
                {analysis.informationGainTips.map((tip, i) => (
                  <li
                    key={i}
                    className="text-sm text-muted-foreground flex items-start gap-2"
                  >
                    <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2 : Optimisation Hn */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4" />
            Optimisation des titres Hn
            {analysis.vagueHeadings.length > 0 ? (
              <Badge variant="destructive" className="ml-auto">
                {analysis.vagueHeadings.length} problème
                {analysis.vagueHeadings.length > 1 ? "s" : ""}
              </Badge>
            ) : (
              <Badge
                variant="secondary"
                className="ml-auto bg-green-100 text-green-800"
              >
                OK
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {analysis.vagueHeadings.length === 0 ? (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Tous les titres sont descriptifs et optimisés pour les LLMs.
            </p>
          ) : (
            <>
              {analysis.vagueHeadings.map((vh, i) => (
                <div
                  key={i}
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-destructive">
                      H{vh.heading.level}
                    </Badge>
                    <span className="text-sm font-medium line-through">
                      {vh.heading.text}
                    </span>
                    <Badge variant="secondary" className="text-xs ml-auto">
                      {issueLabel(vh.issue)}
                    </Badge>
                  </div>
                  {vh.suggestion && (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                      {vh.suggestion}
                    </div>
                  )}
                </div>
              ))}
              {hasSuggestions && onApplySuggestions && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={applySuggestions}
                >
                  Appliquer les suggestions dans l&apos;éditeur
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Section 3 : Trous sémantiques */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Trous sémantiques
            <div className="ml-auto flex gap-1.5">
              <Badge
                variant="secondary"
                className="bg-green-100 text-green-800"
              >
                {coveredTerms.length} couverts
              </Badge>
              <Badge
                variant="secondary"
                className="bg-red-100 text-red-800"
              >
                {missingTerms.length} manquants
              </Badge>
              <Badge
                variant="secondary"
                className="bg-amber-100 text-amber-800"
              >
                {uniqueTerms.length} uniques
              </Badge>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {analysis.semanticTerms.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Pas assez de données SERP pour comparer.
            </p>
          ) : (
            <div className="space-y-3">
              {/* Termes manquants (les plus importants) */}
              {missingTerms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1.5">
                    Manquants (chez les concurrents, absents de votre plan)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {missingTerms.slice(0, 20).map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-red-300 bg-red-50 text-red-700"
                      >
                        {t.term}
                        <span className="ml-1 text-red-400">
                          ({t.competitorCount})
                        </span>
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Termes couverts */}
              {coveredTerms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-green-700 mb-1.5">
                    Couverts (dans votre plan ET chez les concurrents)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {coveredTerms.slice(0, 20).map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-green-300 bg-green-50 text-green-700"
                      >
                        {t.term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Termes uniques */}
              {uniqueTerms.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-amber-700 mb-1.5">
                    Uniques (dans votre plan, absents chez les concurrents)
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {uniqueTerms.slice(0, 20).map((t, i) => (
                      <Badge
                        key={i}
                        variant="outline"
                        className="border-amber-300 bg-amber-50 text-amber-700"
                      >
                        {t.term}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bouton relancer */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={runAnalysis}>
          <BarChart3 className="mr-2 h-3.5 w-3.5" />
          Relancer l&apos;analyse
        </Button>
      </div>
    </div>
  );
}
