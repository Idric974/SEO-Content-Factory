"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, ChevronRight, DollarSign, Cpu, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ApiMonitorPanelProps {
  projectId: string;
  isValidated: boolean;
  hasOutput: boolean;
  isGenerating: boolean;
  onValidate: () => void;
  refreshTrigger: number;
}

interface CostData {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  byModel: Record<
    string,
    { count: number; cost: number; inputTokens: number; outputTokens: number }
  >;
  dailyCosts: { date: string; cost: number; count: number }[];
  recentLogs: {
    id: string;
    provider: string;
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: string;
    createdAt: string;
  }[];
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return `il y a ${days}j`;
}

export function ApiMonitorPanel({
  projectId,
  isValidated,
  hasOutput,
  isGenerating,
  onValidate,
  refreshTrigger,
}: ApiMonitorPanelProps) {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCosts = useCallback(async () => {
    try {
      const res = await fetch(`/api/costs?projectId=${projectId}`);
      if (res.ok) {
        setData(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchCosts();
  }, [fetchCosts]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchCosts();
    }
  }, [refreshTrigger, fetchCosts]);

  const modelEntries = data ? Object.entries(data.byModel).slice(0, 5) : [];
  const logs = data ? data.recentLogs.slice(0, 10) : [];

  return (
    <div className="space-y-4">
      {/* Section 1 : Validation */}
      <Card>
        <CardContent className="pt-4 pb-3">
          {isValidated ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700 dark:bg-green-950 dark:text-green-300">
              <Check className="h-4 w-4" />
              Étape validée
            </div>
          ) : (
            <Button
              onClick={onValidate}
              disabled={!hasOutput || isGenerating}
              className="w-full"
            >
              <Check className="mr-2 h-4 w-4" />
              Valider et continuer
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Section 2 : Coûts projet */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            Coûts projet
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Chargement...
            </div>
          ) : data ? (
            <>
              <div className="flex items-baseline justify-between">
                <span className="text-xl font-bold">
                  ${data.totalCost.toFixed(4)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {data.totalRequests} req.
                </span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span>{data.totalInputTokens.toLocaleString()} in</span>
                <span>{data.totalOutputTokens.toLocaleString()} out</span>
              </div>
              {/* Mini graphique 7 jours */}
              {data.dailyCosts.length > 0 && (
                <div className="flex items-end gap-1 h-12">
                  {data.dailyCosts.map((day) => {
                    const maxCost = Math.max(
                      ...data.dailyCosts.map((d) => d.cost)
                    );
                    const height =
                      maxCost > 0
                        ? Math.max((day.cost / maxCost) * 100, 8)
                        : 8;
                    return (
                      <div
                        key={day.date}
                        className="flex flex-1 flex-col items-center gap-0.5"
                        title={`${day.date}: $${day.cost.toFixed(4)} (${day.count} req.)`}
                      >
                        <div
                          className="w-full rounded-t bg-primary/70"
                          style={{ height: `${height}%` }}
                        />
                        <span className="text-[10px] text-muted-foreground">
                          {day.date.slice(8)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Aucune donnée.</p>
          )}
        </CardContent>
      </Card>

      {/* Section 3 : Par modèle */}
      {modelEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Par modèle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {modelEntries.map(([model, stats]) => (
              <div key={model} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 min-w-0">
                  {model.includes("dall") ? (
                    <ImageIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                  ) : (
                    <Cpu className="h-3 w-3 text-muted-foreground shrink-0" />
                  )}
                  <span className="text-xs truncate" title={model}>
                    {model}
                  </span>
                </div>
                <Badge variant="outline" className="ml-2 shrink-0 text-[10px]">
                  ${stats.cost.toFixed(4)}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section 4 : Derniers appels */}
      {data && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Derniers appels
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[200px] px-4 pb-4">
              {logs.length === 0 ? (
                <p className="py-2 text-xs text-muted-foreground">
                  Aucune requête.
                </p>
              ) : (
                logs.map((log, i) => (
                  <div key={log.id}>
                    <div className="flex items-center justify-between py-1.5">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Badge
                          variant="outline"
                          className={`px-1.5 py-0 text-[10px] ${
                            log.provider === "openai"
                              ? "border-green-300 text-green-700 dark:text-green-400"
                              : "border-orange-300 text-orange-700 dark:text-orange-400"
                          }`}
                        >
                          {log.provider === "openai" ? "OAI" : "ANT"}
                        </Badge>
                        <span
                          className="truncate text-[10px] text-muted-foreground"
                          title={log.model}
                        >
                          {log.model}
                        </span>
                      </div>
                      <span className="shrink-0 font-mono text-[10px]">
                        ${Number(log.costUsd).toFixed(4)}
                      </span>
                    </div>
                    <p className="-mt-0.5 mb-1 text-[10px] text-muted-foreground">
                      {timeAgo(log.createdAt)}
                    </p>
                    {i < logs.length - 1 && <Separator />}
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
