"use client";

import { useState } from "react";
import {
  Loader2,
  Calculator,
  HelpCircle,
  GitBranch,
  Trash2,
  Code,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InteractiveModule {
  moduleType: string;
  html: string;
}

interface InteractiveModuleGeneratorProps {
  projectId: string;
  existingModules?: InteractiveModule[];
  onModulesChanged: (modules: InteractiveModule[]) => void;
}

const MODULE_TYPES = [
  {
    value: "calculator",
    label: "Calculateur",
    icon: Calculator,
    description: "Formulaire de calcul interactif",
  },
  {
    value: "quiz",
    label: "Quiz",
    icon: HelpCircle,
    description: "Questions à choix multiples avec score",
  },
  {
    value: "selector",
    label: "Sélecteur",
    icon: GitBranch,
    description: "Arbre de décision progressif",
  },
];

export default function InteractiveModuleGenerator({
  projectId,
  existingModules,
  onModulesChanged,
}: InteractiveModuleGeneratorProps) {
  const [modules, setModules] = useState<InteractiveModule[]>(
    existingModules ?? []
  );
  const [selectedType, setSelectedType] = useState<string>("calculator");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate/interactive-module", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, moduleType: selectedType }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }

      const data = await res.json();
      const newModule: InteractiveModule = {
        moduleType: data.moduleType,
        html: data.html,
      };

      const updated = [...modules, newModule];
      setModules(updated);
      onModulesChanged(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  function handleRemove(index: number) {
    const updated = modules.filter((_, i) => i !== index);
    setModules(updated);
    onModulesChanged(updated);
    if (previewIndex === index) setPreviewIndex(null);
    if (editIndex === index) setEditIndex(null);
  }

  function handleEditHtml(index: number, html: string) {
    const updated = modules.map((m, i) =>
      i === index ? { ...m, html } : m
    );
    setModules(updated);
    onModulesChanged(updated);
  }

  const typeLabel = (type: string) =>
    MODULE_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Code className="h-4 w-4" />
          Modules Interactifs (Navboost)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Générez des widgets interactifs (calculateurs, quiz, sélecteurs) pour
          augmenter l&apos;engagement utilisateur. Le code HTML/JS sera inclus
          dans l&apos;export WordPress/HTML.
        </p>

        {/* Sélection du type + génération */}
        <div className="flex flex-wrap items-center gap-2">
          {MODULE_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <Button
                key={type.value}
                size="sm"
                variant={selectedType === type.value ? "default" : "outline"}
                onClick={() => setSelectedType(type.value)}
                disabled={loading}
              >
                <Icon className="mr-1.5 h-3.5 w-3.5" />
                {type.label}
              </Button>
            );
          })}
          <Button
            size="sm"
            onClick={handleGenerate}
            disabled={loading}
            className="ml-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Génération...
              </>
            ) : (
              "Générer"
            )}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {/* Liste des modules générés */}
        {modules.length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {modules.length} module(s) généré(s)
                </Badge>
              </div>

              {modules.map((mod, i) => (
                <div key={i} className="rounded-lg border">
                  <div className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{typeLabel(mod.moduleType)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {mod.html.length} caractères
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setPreviewIndex(previewIndex === i ? null : i)
                        }
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setEditIndex(editIndex === i ? null : i)
                        }
                      >
                        <Code className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() => handleRemove(i)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  {/* Prévisualisation HTML */}
                  {previewIndex === i && (
                    <div className="border-t p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Prévisualisation
                      </p>
                      <iframe
                        srcDoc={mod.html}
                        className="w-full min-h-[300px] rounded border bg-white"
                        sandbox="allow-scripts"
                        title={`Preview ${typeLabel(mod.moduleType)}`}
                      />
                    </div>
                  )}

                  {/* Éditeur HTML */}
                  {editIndex === i && (
                    <div className="border-t p-3">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        Code HTML
                      </p>
                      <textarea
                        className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                        value={mod.html}
                        onChange={(e) => handleEditHtml(i, e.target.value)}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
