"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2, ExternalLink } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { StepTimeline } from "@/components/workflow/StepTimeline";
import { WORKFLOW_STEPS } from "@/config/steps";

interface WorkflowStepData {
  id: string;
  stepNumber: number;
  stepName: string;
  isValidated: boolean;
  outputData: unknown;
  tokensUsed: number | null;
  costUsd: string | null;
}

interface ProjectData {
  id: string;
  title: string;
  keyword: string;
  searchIntents: string[];
  status: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; slug: string };
  workflowSteps: WorkflowStepData[];
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  in_progress: "En cours",
  completed: "Terminé",
  published: "Publié",
};

export default function ProjectPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${id}`);
    if (!res.ok) {
      router.push("/dashboard");
      return;
    }
    const data = await res.json();
    setProject(data);
    setLoading(false);
  }, [id, router]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  async function handleDelete() {
    if (!project) return;
    if (!confirm(`Supprimer le projet "${project.title}" ?`)) return;
    const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/dashboard");
    }
  }

  if (loading || !project) {
    return (
      <>
        <Header title="Projet" />
        <div className="p-6">
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </>
    );
  }

  const validatedSteps = project.workflowSteps.filter(
    (s) => s.isValidated
  ).length;
  const totalSteps = WORKFLOW_STEPS.length;
  const progressPercent = Math.round((validatedSteps / totalSteps) * 100);

  const totalCost = project.workflowSteps.reduce((sum, s) => {
    return sum + (s.costUsd ? parseFloat(s.costUsd) : 0);
  }, 0);

  return (
    <>
      <Header title={project.title} />
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Sidebar timeline */}
        <div className="w-72 shrink-0 overflow-y-auto border-r p-4">
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Étapes du workflow
          </h3>
          <StepTimeline
            projectId={project.id}
            currentStep={project.currentStep}
            steps={project.workflowSteps}
          />
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-6 flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard">
                <ArrowLeft className="mr-1 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              className="text-destructive hover:text-destructive"
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Supprimer
            </Button>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Infos projet */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{project.title}</CardTitle>
                    <CardDescription>
                      <Link
                        href={`/clients/${project.client.id}`}
                        className="hover:underline"
                      >
                        {project.client.name}
                      </Link>
                    </CardDescription>
                  </div>
                  <Badge>{statusLabels[project.status] ?? project.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Mot-clé principal
                  </p>
                  <p className="text-lg font-semibold">{project.keyword}</p>
                </div>

                {project.searchIntents.length > 0 && (
                  <div>
                    <p className="mb-1 text-sm font-medium text-muted-foreground">
                      Intentions de recherche
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {project.searchIntents.map((intent, i) => (
                        <Badge key={i} variant="outline">
                          {intent}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium">
                      {validatedSteps}/{totalSteps} étapes
                    </span>
                  </div>
                  <Progress value={progressPercent} className="h-3" />
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Coût total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    ${totalCost.toFixed(4)}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Étape actuelle
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">
                    {WORKFLOW_STEPS[project.currentStep]?.name ?? "Terminé"}
                  </p>
                  <Button className="mt-2 w-full" size="sm" asChild>
                    <Link
                      href={`/projects/${project.id}/steps/${project.currentStep}`}
                    >
                      <ExternalLink className="mr-1 h-3 w-3" />
                      Continuer
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
