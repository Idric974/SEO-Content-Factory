"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Loader2,
  DollarSign,
  TrendingUp,
  BarChart3,
  Plus,
  Trash2,
  ExternalLink,
  Calculator,
  Eye,
  Users,
  Clock,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import MetricsChart from "./MetricsChart";

interface MetricsEntry {
  id: string;
  date: string;
  pageViews: number;
  uniqueVisitors: number;
  darkSocialTraffic: number;
  avgTimeOnPage: number;
  bounceRate: number;
  conversions: number;
  revenue: number;
}

interface RoiData {
  tjm: number;
  hoursSpent: number;
  publicationUrl: string;
  publishedAt: string;
  conversionValue: number;
  metrics: MetricsEntry[];
}

interface ApiCosts {
  total: number;
  byProvider: Record<string, { count: number; cost: number }>;
}

interface StepCost {
  stepNumber: number;
  stepName: string;
  costUsd: number;
}

interface RoiApiResponse {
  roiData: RoiData | null;
  apiCosts: ApiCosts;
  stepCosts: StepCost[];
  wordCount: number;
}

interface RoiDashboardProps {
  projectId: string;
}

const DEFAULT_ROI: RoiData = {
  tjm: 400,
  hoursSpent: 0,
  publicationUrl: "",
  publishedAt: "",
  conversionValue: 50,
  metrics: [],
};

function formatEur(n: number): string {
  return n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";
}

function formatUsd(n: number): string {
  return "$" + n.toFixed(4);
}

export default function RoiDashboard({ projectId }: RoiDashboardProps) {
  const [data, setData] = useState<RoiApiResponse | null>(null);
  const [roi, setRoi] = useState<RoiData>(DEFAULT_ROI);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showStepCosts, setShowStepCosts] = useState(false);

  // New entry form state
  const [newEntry, setNewEntry] = useState<Omit<MetricsEntry, "id">>({
    date: new Date().toISOString().split("T")[0],
    pageViews: 0,
    uniqueVisitors: 0,
    darkSocialTraffic: 0,
    avgTimeOnPage: 0,
    bounceRate: 0,
    conversions: 0,
    revenue: 0,
  });

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/roi`);
      if (res.ok) {
        const json: RoiApiResponse = await res.json();
        setData(json);
        if (json.roiData) {
          setRoi(json.roiData);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function saveRoi(updatedRoi: RoiData) {
    setSaving(true);
    try {
      await fetch(`/api/projects/${projectId}/roi`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roiData: updatedRoi }),
      });
      setRoi(updatedRoi);
    } finally {
      setSaving(false);
    }
  }

  function handleFieldChange(field: keyof RoiData, value: string | number) {
    const updated = { ...roi, [field]: value };
    setRoi(updated);
  }

  async function handleBlurSave() {
    await saveRoi(roi);
  }

  async function handleAddEntry() {
    const entry: MetricsEntry = {
      ...newEntry,
      id: crypto.randomUUID(),
    };
    const updated = {
      ...roi,
      metrics: [...roi.metrics, entry].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    };
    await saveRoi(updated);
    setShowAddForm(false);
    setNewEntry({
      date: new Date().toISOString().split("T")[0],
      pageViews: 0,
      uniqueVisitors: 0,
      darkSocialTraffic: 0,
      avgTimeOnPage: 0,
      bounceRate: 0,
      conversions: 0,
      revenue: 0,
    });
  }

  async function handleDeleteEntry(entryId: string) {
    const updated = {
      ...roi,
      metrics: roi.metrics.filter((m) => m.id !== entryId),
    };
    await saveRoi(updated);
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  // Calculs
  const apiCostUsd = data.apiCosts.total;
  const humanCost = roi.tjm * (roi.hoursSpent / 8);
  const totalProductionCost = humanCost + apiCostUsd * 0.92; // Conversion approximative USD→EUR
  const totalConversions = roi.metrics.reduce((s, m) => s + m.conversions, 0);
  const totalRevenue = roi.metrics.reduce((s, m) => s + m.revenue, 0);
  const roiPercent =
    totalProductionCost > 0
      ? ((totalRevenue - totalProductionCost) / totalProductionCost) * 100
      : 0;
  const breakEven =
    roi.conversionValue > 0
      ? Math.ceil(totalProductionCost / roi.conversionValue)
      : 0;
  const isProfitable = totalRevenue >= totalProductionCost && totalProductionCost > 0;

  // Métriques agrégées
  const totalPageViews = roi.metrics.reduce((s, m) => s + m.pageViews, 0);
  const totalDarkSocial = roi.metrics.reduce((s, m) => s + m.darkSocialTraffic, 0);
  const avgTimeOnPage =
    roi.metrics.length > 0
      ? roi.metrics.reduce((s, m) => s + m.avgTimeOnPage, 0) / roi.metrics.length
      : 0;

  // Chart data
  const chartEntries = roi.metrics.map((m) => ({
    label: new Date(m.date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    values: [
      { name: "Pages vues", value: m.pageViews, color: "#3b82f6" },
      { name: "Conversions", value: m.conversions * 100, color: "#22c55e" }, // Scale up for visibility
    ],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-5 w-5" />
        <h2 className="text-lg font-semibold">Tableau de Bord ROI</h2>
        {saving && (
          <Badge variant="secondary" className="ml-auto">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Sauvegarde...
          </Badge>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* === Section 1 : Coûts de production === */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <DollarSign className="h-4 w-4" />
              Coûts de production
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Coût API (auto) */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Coût API</span>
                <span className="text-sm font-medium">{formatUsd(apiCostUsd)}</span>
              </div>
              <div className="flex gap-1">
                {Object.entries(data.apiCosts.byProvider).map(([provider, info]) => (
                  <Badge key={provider} variant="outline" className="text-xs">
                    {provider}: {formatUsd(info.cost)} ({info.count} req.)
                  </Badge>
                ))}
              </div>
              {data.wordCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {data.wordCount.toLocaleString("fr-FR")} mots
                  {apiCostUsd > 0 && ` — ${formatUsd(apiCostUsd / data.wordCount * 1000)}/1k mots`}
                </p>
              )}
            </div>

            {/* Détail par étape (collapsible) */}
            {data.stepCosts.length > 0 && (
              <div>
                <button
                  onClick={() => setShowStepCosts(!showStepCosts)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {showStepCosts ? "Masquer" : "Voir"} le détail par étape ({data.stepCosts.length})
                </button>
                {showStepCosts && (
                  <div className="mt-2 space-y-1">
                    {data.stepCosts.map((sc) => (
                      <div key={sc.stepNumber} className="flex justify-between text-xs">
                        <span className="text-muted-foreground truncate mr-2">
                          {sc.stepNumber}. {sc.stepName}
                        </span>
                        <span className="shrink-0">{formatUsd(sc.costUsd)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* TJM + heures (inputs) */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">TJM (€/jour)</label>
                <Input
                  type="number"
                  value={roi.tjm}
                  onChange={(e) => handleFieldChange("tjm", Number(e.target.value))}
                  onBlur={handleBlurSave}
                  min={0}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Heures passées</label>
                <Input
                  type="number"
                  value={roi.hoursSpent}
                  onChange={(e) => handleFieldChange("hoursSpent", Number(e.target.value))}
                  onBlur={handleBlurSave}
                  min={0}
                  step={0.5}
                  className="h-8 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Coût humain</span>
              <span className="font-medium">{formatEur(humanCost)}</span>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total production</span>
              <span className="text-lg font-bold">{formatEur(totalProductionCost)}</span>
            </div>

            <Separator />

            {/* Publication */}
            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">URL de publication</label>
                <Input
                  placeholder="https://monsite.com/article"
                  value={roi.publicationUrl}
                  onChange={(e) => handleFieldChange("publicationUrl", e.target.value)}
                  onBlur={handleBlurSave}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Date de publication</label>
                <Input
                  type="date"
                  value={roi.publishedAt}
                  onChange={(e) => handleFieldChange("publishedAt", e.target.value)}
                  onBlur={handleBlurSave}
                  className="h-8 text-sm"
                />
              </div>
              {roi.publicationUrl && (
                <a
                  href={roi.publicationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  Voir l&apos;article publié
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </CardContent>
        </Card>

        {/* === Section 2 : Calculateur ROI === */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4" />
              Rentabilité
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Valeur d&apos;une conversion (€)
              </label>
              <Input
                type="number"
                value={roi.conversionValue}
                onChange={(e) => handleFieldChange("conversionValue", Number(e.target.value))}
                onBlur={handleBlurSave}
                min={0}
                className="h-8 text-sm"
              />
            </div>

            <Separator />

            {/* Métriques résumées */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{totalConversions}</p>
                <p className="text-xs text-muted-foreground">Conversions</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{formatEur(totalRevenue)}</p>
                <p className="text-xs text-muted-foreground">Revenus</p>
              </div>
            </div>

            <Separator />

            {/* ROI */}
            <div className="rounded-lg border p-4 text-center space-y-2">
              <div
                className={`text-4xl font-bold ${
                  isProfitable
                    ? "text-green-600 dark:text-green-400"
                    : totalProductionCost > 0
                      ? "text-red-600 dark:text-red-400"
                      : "text-muted-foreground"
                }`}
              >
                {totalProductionCost > 0 ? `${roiPercent >= 0 ? "+" : ""}${roiPercent.toFixed(0)}%` : "—"}
              </div>
              <p className="text-sm font-medium">ROI</p>
              <p className="text-xs text-muted-foreground">
                (Revenus − Coûts) / Coûts × 100
              </p>
            </div>

            {/* Seuil de rentabilité */}
            <div className="rounded-lg border p-3 space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Seuil de rentabilité</span>
                <span className="font-medium">{breakEven} conversions</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isProfitable ? "bg-green-500" : "bg-amber-500"}`}
                  style={{
                    width: `${Math.min((totalConversions / Math.max(breakEven, 1)) * 100, 100)}%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{totalConversions} / {breakEven}</span>
                <Badge
                  variant="secondary"
                  className={
                    isProfitable
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                      : "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300"
                  }
                >
                  {isProfitable ? "Rentable" : "Pas encore rentable"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* === Section 3 : Métriques d'engagement === */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              Métriques d&apos;engagement
            </CardTitle>
            <Button
              size="sm"
              variant={showAddForm ? "secondary" : "default"}
              onClick={() => setShowAddForm(!showAddForm)}
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {showAddForm ? "Annuler" : "Ajouter un relevé"}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Résumé rapide */}
          {roi.metrics.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="flex items-center gap-2 rounded border p-2">
                <Eye className="h-4 w-4 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{totalPageViews.toLocaleString("fr-FR")}</p>
                  <p className="text-xs text-muted-foreground">Pages vues</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded border p-2">
                <Users className="h-4 w-4 text-purple-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{totalDarkSocial.toLocaleString("fr-FR")}</p>
                  <p className="text-xs text-muted-foreground">Dark Social</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded border p-2">
                <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">
                    {Math.floor(avgTimeOnPage / 60)}m{Math.round(avgTimeOnPage % 60)}s
                  </p>
                  <p className="text-xs text-muted-foreground">Temps moyen</p>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded border p-2">
                <Target className="h-4 w-4 text-green-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium">{totalConversions}</p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
              </div>
            </div>
          )}

          {/* Graphique */}
          {chartEntries.length >= 2 && (
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded bg-blue-500" />
                  <span className="text-xs text-muted-foreground">Pages vues</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="h-2.5 w-2.5 rounded bg-green-500" />
                  <span className="text-xs text-muted-foreground">Conversions (×100)</span>
                </div>
              </div>
              <MetricsChart entries={chartEntries} height={120} />
            </div>
          )}

          {/* Formulaire d'ajout */}
          {showAddForm && (
            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Nouveau relevé</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Date</label>
                  <Input
                    type="date"
                    value={newEntry.date}
                    onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Pages vues</label>
                  <Input
                    type="number"
                    value={newEntry.pageViews}
                    onChange={(e) => setNewEntry({ ...newEntry, pageViews: Number(e.target.value) })}
                    min={0}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Visiteurs uniques</label>
                  <Input
                    type="number"
                    value={newEntry.uniqueVisitors}
                    onChange={(e) => setNewEntry({ ...newEntry, uniqueVisitors: Number(e.target.value) })}
                    min={0}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Dark Social</label>
                  <Input
                    type="number"
                    value={newEntry.darkSocialTraffic}
                    onChange={(e) => setNewEntry({ ...newEntry, darkSocialTraffic: Number(e.target.value) })}
                    min={0}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Temps moyen (s)</label>
                  <Input
                    type="number"
                    value={newEntry.avgTimeOnPage}
                    onChange={(e) => setNewEntry({ ...newEntry, avgTimeOnPage: Number(e.target.value) })}
                    min={0}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Taux de rebond (%)</label>
                  <Input
                    type="number"
                    value={newEntry.bounceRate}
                    onChange={(e) => setNewEntry({ ...newEntry, bounceRate: Number(e.target.value) })}
                    min={0}
                    max={100}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Conversions</label>
                  <Input
                    type="number"
                    value={newEntry.conversions}
                    onChange={(e) => setNewEntry({ ...newEntry, conversions: Number(e.target.value) })}
                    min={0}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Revenu (€)</label>
                  <Input
                    type="number"
                    value={newEntry.revenue}
                    onChange={(e) => setNewEntry({ ...newEntry, revenue: Number(e.target.value) })}
                    min={0}
                    step={0.01}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Button size="sm" onClick={handleAddEntry}>
                Ajouter
              </Button>
            </div>
          )}

          {/* Tableau des entrées */}
          {roi.metrics.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 text-left font-medium">Date</th>
                    <th className="py-2 text-right font-medium">Pages vues</th>
                    <th className="py-2 text-right font-medium">Visiteurs</th>
                    <th className="py-2 text-right font-medium">Dark Social</th>
                    <th className="py-2 text-right font-medium">Temps moy.</th>
                    <th className="py-2 text-right font-medium">Rebond</th>
                    <th className="py-2 text-right font-medium">Conv.</th>
                    <th className="py-2 text-right font-medium">Revenu</th>
                    <th className="py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {roi.metrics.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="py-2">
                        {new Date(m.date).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="py-2 text-right">{m.pageViews.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right">{m.uniqueVisitors.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right">{m.darkSocialTraffic.toLocaleString("fr-FR")}</td>
                      <td className="py-2 text-right">
                        {Math.floor(m.avgTimeOnPage / 60)}m{Math.round(m.avgTimeOnPage % 60)}s
                      </td>
                      <td className="py-2 text-right">{m.bounceRate}%</td>
                      <td className="py-2 text-right font-medium">{m.conversions}</td>
                      <td className="py-2 text-right font-medium">{formatEur(m.revenue)}</td>
                      <td className="py-2">
                        <button
                          onClick={() => handleDeleteEntry(m.id)}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aucun relevé de métriques. Ajoutez votre premier relevé pour suivre la performance.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
