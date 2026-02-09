"use client";

import { useState } from "react";
import {
  Search,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Check,
  X,
  Video,
  ShoppingCart,
  MapPin,
  Newspaper,
  Image,
  MessageSquareQuote,
  HelpCircle,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SERPAnalysis } from "@/lib/serpapi/client";

interface SerpAnalysisPanelProps {
  keyword: string;
  projectId: string;
  initialAnalysis?: SERPAnalysis | null;
  onAnalysisComplete?: (analysis: SERPAnalysis) => void;
}

const FEATURE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType }
> = {
  featured_snippet: { label: "Featured Snippet", icon: MessageSquareQuote },
  knowledge_graph: { label: "Knowledge Graph", icon: Globe },
  people_also_ask: { label: "People Also Ask", icon: HelpCircle },
  video_carousel: { label: "Vidéos", icon: Video },
  shopping: { label: "Shopping", icon: ShoppingCart },
  local_pack: { label: "Local Pack", icon: MapPin },
  top_stories: { label: "Actualités", icon: Newspaper },
  image_pack: { label: "Images", icon: Image },
  related_searches: { label: "Recherches associées", icon: Search },
};

const ALL_FEATURES = Object.keys(FEATURE_CONFIG);

export function SerpAnalysisPanel({
  keyword,
  projectId,
  initialAnalysis,
  onAnalysisComplete,
}: SerpAnalysisPanelProps) {
  const [analysis, setAnalysis] = useState<SERPAnalysis | null>(
    initialAnalysis ?? null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedPAA, setExpandedPAA] = useState<number | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/serp/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword, projectId }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Erreur d'analyse SERP");
      }

      const data: SERPAnalysis = await res.json();
      setAnalysis(data);
      onAnalysisComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analyse SERP</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Analysez la SERP Google pour &quot;{keyword}&quot; afin de
            comprendre le paysage concurrentiel et les opportunités.
          </p>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <Button onClick={handleAnalyze} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                Lancer l&apos;analyse SERP
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* SERP Features */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Features SERP</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {ALL_FEATURES.map((feature) => {
              const config = FEATURE_CONFIG[feature];
              const isPresent = analysis.serpFeatures.includes(feature);
              const Icon = config.icon;
              return (
                <Badge
                  key={feature}
                  variant={isPresent ? "default" : "outline"}
                  className={
                    isPresent
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "opacity-50"
                  }
                >
                  {isPresent ? (
                    <Check className="mr-1 h-3 w-3" />
                  ) : (
                    <X className="mr-1 h-3 w-3" />
                  )}
                  <Icon className="mr-1 h-3 w-3" />
                  {config.label}
                </Badge>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Formats dominants */}
      {analysis.dominantFormats.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Formats dominants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.dominantFormats.map((format) => (
                <Badge key={format} variant="secondary">
                  {format}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Featured Snippet */}
      {analysis.answerBox && (
        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Featured Snippet</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{analysis.answerBox.answer}</p>
            {analysis.answerBox.source && (
              <a
                href={analysis.answerBox.source.link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center text-xs text-muted-foreground hover:underline"
              >
                {analysis.answerBox.source.title}
                <ExternalLink className="ml-1 h-3 w-3" />
              </a>
            )}
          </CardContent>
        </Card>
      )}

      {/* People Also Ask */}
      {analysis.peopleAlsoAsk.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              People Also Ask ({analysis.peopleAlsoAsk.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {analysis.peopleAlsoAsk.map((paa, i) => (
              <div key={i} className="rounded-lg border">
                <button
                  type="button"
                  onClick={() =>
                    setExpandedPAA(expandedPAA === i ? null : i)
                  }
                  className="flex w-full items-center gap-2 p-3 text-left text-sm hover:bg-accent"
                >
                  {expandedPAA === i ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="font-medium">{paa.question}</span>
                </button>
                {expandedPAA === i && (
                  <div className="border-t px-3 pb-3 pt-2">
                    <p className="text-sm text-muted-foreground">
                      {paa.snippet}
                    </p>
                    {paa.link && (
                      <a
                        href={paa.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center text-xs text-primary hover:underline"
                      >
                        {paa.title}
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Top 10 Concurrents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            Top concurrents ({analysis.organicResults.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.organicResults.map((r) => (
              <div key={r.position} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                  {r.position}
                </span>
                <div className="min-w-0 flex-1">
                  <a
                    href={r.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {r.title}
                  </a>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {r.snippet}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recherches associées */}
      {analysis.relatedSearches.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recherches associées</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {analysis.relatedSearches.map((q, i) => (
                <Badge key={i} variant="outline">
                  {q}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bouton re-analyse */}
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          Relancer l&apos;analyse
        </Button>
      </div>
    </div>
  );
}
