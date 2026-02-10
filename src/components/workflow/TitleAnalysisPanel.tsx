"use client";

import { useState } from "react";
import { Search, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  analyzeTitles,
  type TitleAnalysis,
  type TitlePattern,
} from "@/lib/seo/titleAnalyzer";

interface TitleAnalysisPanelProps {
  keyword: string;
  serpCompetitors: { title: string; position: number; link: string }[];
}

function PatternBadges({ pattern }: { pattern: TitlePattern }) {
  return (
    <div className="flex flex-wrap gap-1">
      {pattern.powerWords.length > 0 && (
        <Badge variant="secondary" className="text-[10px] bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
          {pattern.powerWords.join(", ")}
        </Badge>
      )}
      {pattern.hasNumber && (
        <Badge variant="secondary" className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          Chiffre
        </Badge>
      )}
      {pattern.hasYear && (
        <Badge variant="secondary" className="text-[10px] bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
          Année
        </Badge>
      )}
      {pattern.hasParentheses && (
        <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300">
          (Parenthèses)
        </Badge>
      )}
      {pattern.hasQuestion && (
        <Badge variant="secondary" className="text-[10px] bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
          Question ?
        </Badge>
      )}
      <Badge variant="outline" className="text-[10px]">
        Mot-clé : {pattern.keywordPosition}
      </Badge>
      <Badge variant="outline" className="text-[10px]">
        {pattern.charCount} car.
      </Badge>
    </div>
  );
}

export default function TitleAnalysisPanel({
  keyword,
  serpCompetitors,
}: TitleAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<TitleAnalysis | null>(null);
  const [expanded, setExpanded] = useState(false);

  function handleAnalyze() {
    const titles = serpCompetitors.map((c) => ({
      title: c.title,
      position: c.position,
    }));
    const result = analyzeTitles(titles, keyword);
    setAnalysis(result);
    setExpanded(true);
  }

  if (serpCompetitors.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            Analyse titres concurrents
          </CardTitle>
          <div className="flex items-center gap-2">
            {analysis && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
            )}
            <Button
              size="sm"
              variant={analysis ? "outline" : "default"}
              onClick={handleAnalyze}
            >
              {analysis ? "Réanalyser" : "Analyser les titres SERP"}
            </Button>
          </div>
        </div>
      </CardHeader>

      {analysis && expanded && (
        <CardContent className="space-y-4">
          {/* Titres concurrents avec patterns */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Top {analysis.patterns.length} titres SERP pour &ldquo;{keyword}&rdquo;
            </p>
            {analysis.patterns.map((pattern, i) => (
              <div key={i} className="rounded-lg border p-2.5 space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm leading-tight">
                    <span className="font-medium text-muted-foreground mr-1.5">
                      #{pattern.position}
                    </span>
                    {pattern.title}
                  </p>
                </div>
                <PatternBadges pattern={pattern} />
              </div>
            ))}
          </div>

          {/* Statistiques */}
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border p-2.5 text-center">
              <p className="text-lg font-bold">{analysis.avgLength}</p>
              <p className="text-xs text-muted-foreground">Longueur moyenne</p>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <p className="text-lg font-bold">{analysis.dominantPowerWords.length}</p>
              <p className="text-xs text-muted-foreground">Power words uniques</p>
            </div>
            <div className="rounded-lg border p-2.5 text-center">
              <p className="text-lg font-bold">
                {analysis.patterns.filter((p) => p.keywordPosition === "start").length}/
                {analysis.patterns.length}
              </p>
              <p className="text-xs text-muted-foreground">Mot-clé en début</p>
            </div>
          </div>

          {/* Recommandations */}
          {analysis.recommendations.length > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950">
              <p className="text-xs font-medium text-blue-800 dark:text-blue-300 mb-2 flex items-center gap-1">
                <Lightbulb className="h-3 w-3" />
                Recommandations
              </p>
              <ul className="space-y-1">
                {analysis.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-xs text-blue-700 dark:text-blue-400"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
