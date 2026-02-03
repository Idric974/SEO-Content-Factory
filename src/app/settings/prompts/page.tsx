"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  RotateCcw,
  ChevronDown,
  ChevronRight,
  Check,
} from "lucide-react";

interface PromptEntry {
  stepNumber: number;
  stepName: string;
  systemPrompt: string;
  userPromptTemplate: string;
  isCustom: boolean;
  dbId: string | null;
  version: number;
}

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<PromptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [editedSystem, setEditedSystem] = useState<Record<number, string>>({});
  const [editedUser, setEditedUser] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState<number | null>(null);
  const [savedStep, setSavedStep] = useState<number | null>(null);

  async function fetchPrompts() {
    setLoading(true);
    const res = await fetch("/api/prompts");
    if (res.ok) {
      setPrompts(await res.json());
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchPrompts();
  }, []);

  function handleExpand(stepNumber: number) {
    if (expandedStep === stepNumber) {
      setExpandedStep(null);
      return;
    }
    setExpandedStep(stepNumber);
    const p = prompts.find((p) => p.stepNumber === stepNumber);
    if (p && editedSystem[stepNumber] === undefined) {
      setEditedSystem((prev) => ({ ...prev, [stepNumber]: p.systemPrompt }));
      setEditedUser((prev) => ({
        ...prev,
        [stepNumber]: p.userPromptTemplate,
      }));
    }
  }

  async function handleSave(stepNumber: number) {
    setSaving(stepNumber);
    const res = await fetch("/api/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        stepNumber,
        systemPrompt: editedSystem[stepNumber],
        userPromptTemplate: editedUser[stepNumber],
      }),
    });

    if (res.ok) {
      setSavedStep(stepNumber);
      setTimeout(() => setSavedStep(null), 2000);
      await fetchPrompts();
    }
    setSaving(null);
  }

  async function handleReset(stepNumber: number) {
    const res = await fetch(`/api/prompts?stepNumber=${stepNumber}`, {
      method: "DELETE",
    });

    if (res.ok) {
      // Recharger et remettre les valeurs par défaut
      await fetchPrompts();
      const p = prompts.find((p) => p.stepNumber === stepNumber);
      if (p) {
        setEditedSystem((prev) => {
          const copy = { ...prev };
          delete copy[stepNumber];
          return copy;
        });
        setEditedUser((prev) => {
          const copy = { ...prev };
          delete copy[stepNumber];
          return copy;
        });
      }
      setExpandedStep(null);
    }
  }

  function hasChanges(stepNumber: number): boolean {
    const p = prompts.find((p) => p.stepNumber === stepNumber);
    if (!p) return false;
    return (
      editedSystem[stepNumber] !== p.systemPrompt ||
      editedUser[stepNumber] !== p.userPromptTemplate
    );
  }

  return (
    <>
      <Header title="Templates de prompts" />
      <div className="p-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Personnalisation des prompts
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Modifiez les prompts envoyés à Claude pour chaque étape du
              workflow. Les variables disponibles sont :{" "}
              <code className="text-xs">
                {"{{keyword}}"}, {"{{title}}"}, {"{{persona}}"}, {"{{brand}}"},
                {"{{research}}"}, {"{{questions}}"}, {"{{plan}}"},{" "}
                {"{{article}}"}, {"{{intents}}"}
              </code>
            </p>
          </CardHeader>
        </Card>

        {loading ? (
          <p className="text-muted-foreground">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {prompts.map((p) => (
              <Card key={p.stepNumber}>
                <button
                  onClick={() => handleExpand(p.stepNumber)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-accent transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {expandedStep === p.stepNumber ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0" />
                    )}
                    <Badge variant="outline" className="shrink-0">
                      {p.stepNumber}
                    </Badge>
                    <span className="font-medium text-sm">{p.stepName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isCustom && (
                      <Badge
                        variant="secondary"
                        className="text-xs"
                      >
                        Personnalisé v{p.version}
                      </Badge>
                    )}
                    {savedStep === p.stepNumber && (
                      <Badge className="bg-green-500 text-white text-xs">
                        <Check className="mr-1 h-3 w-3" />
                        Sauvé
                      </Badge>
                    )}
                  </div>
                </button>

                {expandedStep === p.stepNumber && (
                  <CardContent className="border-t pt-4 space-y-4">
                    {/* System prompt */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Prompt système
                      </label>
                      <textarea
                        value={editedSystem[p.stepNumber] ?? p.systemPrompt}
                        onChange={(e) =>
                          setEditedSystem((prev) => ({
                            ...prev,
                            [p.stepNumber]: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Prompt système..."
                      />
                    </div>

                    {/* User prompt template */}
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Prompt utilisateur (template)
                      </label>
                      <textarea
                        value={
                          editedUser[p.stepNumber] ?? p.userPromptTemplate
                        }
                        onChange={(e) =>
                          setEditedUser((prev) => ({
                            ...prev,
                            [p.stepNumber]: e.target.value,
                          }))
                        }
                        className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm font-mono min-h-[200px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Prompt utilisateur avec {{variables}}..."
                      />
                    </div>

                    <Separator />

                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleSave(p.stepNumber)}
                          disabled={
                            saving === p.stepNumber ||
                            !hasChanges(p.stepNumber)
                          }
                        >
                          <Save className="mr-1 h-4 w-4" />
                          {saving === p.stepNumber
                            ? "Sauvegarde..."
                            : "Sauvegarder"}
                        </Button>
                        {p.isCustom && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReset(p.stepNumber)}
                          >
                            <RotateCcw className="mr-1 h-4 w-4" />
                            Revenir au défaut
                          </Button>
                        )}
                      </div>
                      {hasChanges(p.stepNumber) && (
                        <span className="text-xs text-amber-600">
                          Modifications non sauvegardées
                        </span>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
