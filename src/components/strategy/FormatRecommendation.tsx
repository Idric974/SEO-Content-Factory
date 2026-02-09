"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { SERPAnalysis } from "@/lib/serpapi/client";

const EDITORIAL_FORMATS = [
  {
    value: "pas",
    label: "PAS",
    full: "Problème - Agitation - Solution",
    description:
      "Ideal pour les requêtes liées à un problème douloureux. Captive en montrant le problème, amplifie l'urgence, puis présente la solution.",
  },
  {
    value: "aida",
    label: "AIDA",
    full: "Attention - Intérêt - Désir - Action",
    description:
      "Parfait pour les contenus orientés conversion. Capte l'attention, suscite l'intérêt, crée le désir puis pousse à l'action.",
  },
  {
    value: "mece",
    label: "MECE",
    full: "Mutuellement Exclusif, Collectivement Exhaustif",
    description:
      "Ideal pour les guides complets et les sujets complexes. Chaque section couvre un aspect unique, l'ensemble couvre 100% du sujet.",
  },
  {
    value: "inverted_pyramid",
    label: "Pyramide inversée",
    full: "Information essentielle en premier",
    description:
      "Parfait pour les requêtes informationnelles. L'information la plus importante est présentée d'abord, puis les détails suivent.",
  },
] as const;

interface FormatRecommendationProps {
  serpAnalysis: SERPAnalysis | null;
  businessObjective: string | null;
  selectedFormat: string | null;
  onSelectFormat: (format: string) => void;
  projectId: string;
}

export function FormatRecommendation({
  serpAnalysis,
  businessObjective,
  selectedFormat,
  onSelectFormat,
  projectId,
}: FormatRecommendationProps) {
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [aiJustification, setAiJustification] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleGetRecommendation() {
    if (!serpAnalysis) return;
    setLoading(true);

    try {
      const res = await fetch("/api/serp/recommend-format", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          serpFeatures: serpAnalysis.serpFeatures,
          dominantFormats: serpAnalysis.dominantFormats,
          businessObjective,
          peopleAlsoAsk: serpAnalysis.peopleAlsoAsk.map((p) => p.question),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiRecommendation(data.format);
        setAiJustification(data.justification);
        onSelectFormat(data.format);
      }
    } catch {
      // Ignore - user can still select manually
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Format éditorial</CardTitle>
          {serpAnalysis && !aiRecommendation && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGetRecommendation}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Recommandation IA
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {aiJustification && (
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <p className="text-sm">
              <span className="font-medium">Recommandation IA :</span>{" "}
              {aiJustification}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          {EDITORIAL_FORMATS.map((format) => (
            <button
              key={format.value}
              type="button"
              onClick={() => onSelectFormat(format.value)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors hover:bg-accent",
                selectedFormat === format.value &&
                  "border-primary bg-primary/5 ring-2 ring-primary/50",
                aiRecommendation === format.value &&
                  selectedFormat !== format.value &&
                  "border-primary/30 bg-primary/5"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{format.label}</span>
                {aiRecommendation === format.value && (
                  <Sparkles className="h-3 w-3 text-primary" />
                )}
              </div>
              <span className="text-xs font-medium text-muted-foreground">
                {format.full}
              </span>
              <p className="text-xs text-muted-foreground">
                {format.description}
              </p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
