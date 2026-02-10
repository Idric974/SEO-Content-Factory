"use client";

import { useState } from "react";
import { Loader2, Image, Film, BarChart3, Table, PenTool } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface MediaRecommendationItem {
  section: string;
  mediaType: "photo" | "infographie" | "schéma" | "vidéo" | "tableau";
  rationale: string;
  suggestedDescription: string;
}

interface MediaRecommendationProps {
  projectId: string;
  existingRecommendations?: MediaRecommendationItem[];
}

const MEDIA_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ElementType; color: string }
> = {
  photo: { label: "Photo", icon: Image, color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300" },
  infographie: { label: "Infographie", icon: BarChart3, color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300" },
  "schéma": { label: "Schéma", icon: PenTool, color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  "vidéo": { label: "Vidéo", icon: Film, color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  tableau: { label: "Tableau", icon: Table, color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300" },
};

export default function MediaRecommendation({
  projectId,
  existingRecommendations,
}: MediaRecommendationProps) {
  const [recommendations, setRecommendations] = useState<MediaRecommendationItem[]>(
    existingRecommendations ?? []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/analyze/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de l'analyse");
      }

      const data = await res.json();
      setRecommendations(data.recommendations);
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
            <Image className="h-4 w-4" />
            Recommandations médias (Navboost)
          </CardTitle>
          <Button
            size="sm"
            variant={recommendations.length > 0 ? "outline" : "default"}
            onClick={handleAnalyze}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Analyse...
              </>
            ) : recommendations.length > 0 ? (
              "Réanalyser"
            ) : (
              "Analyser les médias"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Analyse l&apos;article et la SERP pour recommander où ajouter des médias
          (images, infographies, vidéos) afin d&apos;optimiser l&apos;engagement utilisateur.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {recommendations.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{recommendations.length} recommandation(s)</Badge>
            </div>

            <div className="grid gap-3">
              {recommendations.map((rec, i) => {
                const config = MEDIA_TYPE_CONFIG[rec.mediaType] ?? MEDIA_TYPE_CONFIG.photo;
                const IconComponent = config.icon;

                return (
                  <div
                    key={i}
                    className="rounded-lg border p-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium leading-tight">{rec.section}</p>
                      <Badge className={`shrink-0 ${config.color}`}>
                        <IconComponent className="mr-1 h-3 w-3" />
                        {config.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{rec.rationale}</p>
                    <p className="text-xs italic">{rec.suggestedDescription}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
