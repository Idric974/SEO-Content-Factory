"use client";

import { useState } from "react";
import {
  Loader2,
  Link2,
  ExternalLink,
  Globe,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

interface SitePage {
  url: string;
  title: string;
  snippet: string;
  relevance: number;
}

export interface InternalLinkSuggestion {
  anchor: string;
  targetUrl: string;
  targetTitle: string;
  relevanceScore: number;
  articleContext: string;
  freshnessNote: string | null;
}

interface InternalLinkAssistantProps {
  projectId: string;
  existingSuggestions?: InternalLinkSuggestion[];
  existingSitePages?: SitePage[];
  existingSiteUrl?: string;
}

function relevanceColor(score: number): string {
  if (score >= 80)
    return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
  if (score >= 60)
    return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
}

export default function InternalLinkAssistant({
  projectId,
  existingSuggestions,
  existingSitePages,
  existingSiteUrl,
}: InternalLinkAssistantProps) {
  const [siteUrl, setSiteUrl] = useState(existingSiteUrl ?? "");
  const [suggestions, setSuggestions] = useState<InternalLinkSuggestion[]>(
    existingSuggestions ?? []
  );
  const [sitePages, setSitePages] = useState<SitePage[]>(
    existingSitePages ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPages, setShowPages] = useState(false);

  async function handleAnalyze() {
    if (!siteUrl.trim()) {
      setError("Veuillez saisir l'URL du site client");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze/internal-links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, siteUrl: siteUrl.trim() }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'analyse");
      }

      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
      setSitePages(data.sitePages ?? []);

      if (data.message) {
        setError(data.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  const freshnessNotes = suggestions.filter((s) => s.freshnessNote);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          Maillage Interne Sémantique
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Scanne le site client via recherche web et propose des liens internes
          basés sur la proximité sémantique réelle. Suggère aussi les mises à
          jour de pages existantes (freshness).
        </p>

        {/* Input URL + bouton */}
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              placeholder="https://monsite.com"
              value={siteUrl}
              onChange={(e) => setSiteUrl(e.target.value)}
              disabled={loading}
            />
          </div>
          <Button onClick={handleAnalyze} disabled={loading || !siteUrl.trim()}>
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Analyse...
              </>
            ) : suggestions.length > 0 ? (
              <>
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                Réanalyser
              </>
            ) : (
              <>
                <Globe className="mr-1.5 h-3.5 w-3.5" />
                Scanner et analyser
              </>
            )}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Pages trouvées (collapsible) */}
        {sitePages.length > 0 && (
          <div>
            <button
              onClick={() => setShowPages(!showPages)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <Globe className="h-3 w-3" />
              {sitePages.length} page(s) trouvée(s) sur le site
              {showPages ? " (masquer)" : " (voir)"}
            </button>

            {showPages && (
              <div className="mt-2 space-y-1.5">
                {sitePages.map((page, i) => (
                  <div
                    key={i}
                    className="text-xs rounded border p-2 space-y-0.5"
                  >
                    <div className="flex items-center gap-1">
                      <a
                        href={page.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400 truncate"
                      >
                        {page.title}
                      </a>
                      <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground truncate">{page.url}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Suggestions de liens internes */}
        {suggestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {suggestions.length} lien(s) suggéré(s)
              </Badge>
              {freshnessNotes.length > 0 && (
                <Badge
                  variant="secondary"
                  className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                >
                  {freshnessNotes.length} mise(s) à jour suggérée(s)
                </Badge>
              )}
            </div>

            {suggestions.map((suggestion, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                {/* En-tête : ancre + URL cible + score */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5">
                    <p className="text-sm">
                      Ancre :{" "}
                      <span className="font-medium text-blue-600 dark:text-blue-400">
                        {suggestion.anchor}
                      </span>
                    </p>
                    <a
                      href={suggestion.targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-muted-foreground hover:underline flex items-center gap-1"
                    >
                      {suggestion.targetTitle}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                  <Badge className={`shrink-0 ${relevanceColor(suggestion.relevanceScore)}`}>
                    {suggestion.relevanceScore}%
                  </Badge>
                </div>

                {/* Contexte dans l'article */}
                <div className="rounded bg-muted p-2">
                  <p className="text-xs text-muted-foreground italic">
                    &ldquo;{suggestion.articleContext}&rdquo;
                  </p>
                </div>

                {/* Note freshness */}
                {suggestion.freshnessNote && (
                  <div className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                    <span>{suggestion.freshnessNote}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
