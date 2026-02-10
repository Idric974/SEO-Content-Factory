"use client";

import { useState } from "react";
import { Loader2, ShieldCheck, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface FactCheckResult {
  claim: string;
  verdict: "confirmé" | "douteux" | "non_vérifié";
  confidence: number;
  justification: string;
  source: string | null;
  suggestion: string | null;
}

interface FactCheckPanelProps {
  projectId: string;
  existingResults?: FactCheckResult[];
}

const VERDICT_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  "confirmé": {
    label: "Confirmé",
    color: "text-green-700 dark:text-green-300",
    bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  },
  douteux: {
    label: "Douteux",
    color: "text-red-700 dark:text-red-300",
    bg: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
  },
  "non_vérifié": {
    label: "Non vérifié",
    color: "text-amber-700 dark:text-amber-300",
    bg: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  },
};

export default function FactCheckPanel({
  projectId,
  existingResults,
}: FactCheckPanelProps) {
  const [results, setResults] = useState<FactCheckResult[]>(
    existingResults ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmedCount = results.filter((r) => r.verdict === "confirmé").length;
  const doubtfulCount = results.filter((r) => r.verdict === "douteux").length;
  const unverifiedCount = results.filter(
    (r) => r.verdict === "non_vérifié"
  ).length;

  async function handleFactCheck() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors du fact-checking");
      }

      const data = await res.json();
      setResults(data.claims);
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
            <ShieldCheck className="h-4 w-4" />
            Fact-Checking
          </CardTitle>
          <Button
            size="sm"
            variant={results.length > 0 ? "outline" : "default"}
            onClick={handleFactCheck}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Vérification...
              </>
            ) : results.length > 0 ? (
              "Revérifier"
            ) : (
              "Vérifier les faits"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Extraction automatique des affirmations vérifiables, recherche web via
          Tavily, puis évaluation par IA. Vérifie les chiffres, dates et statistiques.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {results.length > 0 && (
          <>
            {/* Résumé */}
            <div className="flex flex-wrap gap-2">
              <Badge className={VERDICT_CONFIG["confirmé"].bg}>
                {confirmedCount} confirmé(s)
              </Badge>
              <Badge className={VERDICT_CONFIG.douteux.bg}>
                {doubtfulCount} douteux
              </Badge>
              <Badge className={VERDICT_CONFIG["non_vérifié"].bg}>
                {unverifiedCount} non vérifié(s)
              </Badge>
            </div>

            {/* Liste des affirmations */}
            <div className="space-y-2">
              {results.map((result, i) => {
                const config =
                  VERDICT_CONFIG[result.verdict] ??
                  VERDICT_CONFIG["non_vérifié"];

                return (
                  <div key={i} className="rounded-lg border p-3 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm leading-tight">
                        &ldquo;{result.claim}&rdquo;
                      </p>
                      <Badge className={`shrink-0 ${config.bg}`}>
                        {config.label} ({result.confidence}%)
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {result.justification}
                    </p>
                    {result.suggestion && (
                      <p className="text-xs text-amber-700 dark:text-amber-400">
                        Suggestion : {result.suggestion}
                      </p>
                    )}
                    {result.source && (
                      <a
                        href={result.source}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                      >
                        Source <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
