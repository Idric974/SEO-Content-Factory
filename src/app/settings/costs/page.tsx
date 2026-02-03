"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  DollarSign,
  Cpu,
  ImageIcon,
  TrendingUp,
  RefreshCw,
} from "lucide-react";

interface CostData {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalRequests: number;
  byProvider: Record<string, { count: number; cost: number }>;
  byModel: Record<
    string,
    { count: number; cost: number; inputTokens: number; outputTokens: number }
  >;
  byProject: Record<string, { title: string; count: number; cost: number }>;
  dailyCosts: { date: string; cost: number; count: number }[];
  recentLogs: {
    id: string;
    provider: string;
    model: string;
    inputTokens: number | null;
    outputTokens: number | null;
    costUsd: string;
    createdAt: string;
    project: { title: string; keyword: string } | null;
  }[];
}

export default function CostsPage() {
  const [data, setData] = useState<CostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"all" | "7d" | "30d">("all");

  async function fetchData() {
    setLoading(true);
    const res = await fetch(`/api/costs?period=${period}`);
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  return (
    <>
      <Header title="Coûts API" />
      <div className="p-6 space-y-6">
        {/* Filtres */}
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(["all", "30d", "7d"] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p === "all" ? "Tout" : p === "30d" ? "30 jours" : "7 jours"}
              </Button>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw
              className={`mr-1 h-4 w-4 ${loading ? "animate-spin" : ""}`}
            />
            Actualiser
          </Button>
        </div>

        {loading && !data ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : data ? (
          <>
            {/* Cartes résumé */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Coût total
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    ${data.totalCost.toFixed(4)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Requêtes
                  </CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.totalRequests}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tokens entrée
                  </CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.totalInputTokens.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tokens sortie
                  </CardTitle>
                  <Cpu className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {data.totalOutputTokens.toLocaleString()}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Graphique simplifié (barres CSS) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Coûts sur 7 jours
                </CardTitle>
              </CardHeader>
              <CardContent>
                {data.dailyCosts.every((d) => d.cost === 0) ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune donnée pour cette période.
                  </p>
                ) : (
                  <div className="flex items-end gap-2 h-32">
                    {data.dailyCosts.map((day) => {
                      const maxCost = Math.max(
                        ...data.dailyCosts.map((d) => d.cost)
                      );
                      const height =
                        maxCost > 0
                          ? Math.max((day.cost / maxCost) * 100, 4)
                          : 4;
                      return (
                        <div
                          key={day.date}
                          className="flex flex-1 flex-col items-center gap-1"
                        >
                          <span className="text-xs text-muted-foreground">
                            ${day.cost.toFixed(3)}
                          </span>
                          <div
                            className="w-full rounded-t bg-primary transition-all"
                            style={{ height: `${height}%` }}
                          />
                          <span className="text-xs text-muted-foreground">
                            {day.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              {/* Par modèle */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Par modèle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(data.byModel).map(([model, stats]) => (
                    <div key={model}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {model.includes("dall") ? (
                            <ImageIcon className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Cpu className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-sm font-medium">{model}</span>
                        </div>
                        <Badge variant="outline">
                          ${stats.cost.toFixed(4)}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {stats.count} requêtes
                        {stats.inputTokens > 0 &&
                          ` · ${stats.inputTokens.toLocaleString()} in · ${stats.outputTokens.toLocaleString()} out`}
                      </div>
                    </div>
                  ))}
                  {Object.keys(data.byModel).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucune donnée.
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Par projet */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">
                    Par projet
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(data.byProject).map(
                    ([id, stats]) => (
                      <div key={id}>
                        <div className="flex items-center justify-between">
                          <span className="truncate text-sm font-medium">
                            {stats.title}
                          </span>
                          <Badge variant="outline">
                            ${stats.cost.toFixed(4)}
                          </Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {stats.count} requêtes
                        </div>
                      </div>
                    )
                  )}
                  {Object.keys(data.byProject).length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      Aucune donnée.
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Logs récents */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">
                  Dernières requêtes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.recentLogs.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Aucune requête enregistrée.
                    </p>
                  ) : (
                    data.recentLogs.slice(0, 20).map((log) => (
                      <div key={log.id}>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={
                                log.provider === "openai"
                                  ? "border-green-300 text-green-700 dark:text-green-400"
                                  : "border-orange-300 text-orange-700 dark:text-orange-400"
                              }
                            >
                              {log.provider}
                            </Badge>
                            <span className="text-muted-foreground">
                              {log.model}
                            </span>
                          </div>
                          <span className="font-mono text-xs">
                            ${Number(log.costUsd).toFixed(4)}
                          </span>
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {log.project?.title ?? "—"} ·{" "}
                          {new Date(log.createdAt).toLocaleString("fr-FR")}
                          {log.inputTokens != null &&
                            ` · ${log.inputTokens} in / ${log.outputTokens} out`}
                        </div>
                        <Separator className="mt-2" />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <p className="text-muted-foreground">Erreur de chargement.</p>
        )}
      </div>
    </>
  );
}
