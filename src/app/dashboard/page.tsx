"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, FolderOpen, Clock, DollarSign } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { WORKFLOW_STEPS } from "@/config/steps";

interface ProjectItem {
  id: string;
  title: string;
  keyword: string;
  status: string;
  client: { id: string; name: string };
  workflowSteps: { stepNumber: number }[];
}

interface ClientItem {
  id: string;
  name: string;
}

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  in_progress: "En cours",
  completed: "Terminé",
  published: "Publié",
};

const statusVariants: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  published: "outline",
};

export default function DashboardPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyCost, setMonthlyCost] = useState<number | null>(null);

  // Filtres
  const [filterClient, setFilterClient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const fetchProjects = useCallback(async () => {
    const params = new URLSearchParams();
    if (filterClient) params.set("clientId", filterClient);
    if (filterStatus) params.set("status", filterStatus);
    const qs = params.toString();
    const res = await fetch(`/api/projects${qs ? `?${qs}` : ""}`);
    if (res.ok) {
      setProjects(await res.json());
    }
    setLoading(false);
  }, [filterClient, filterStatus]);

  useEffect(() => {
    setLoading(true);
    fetchProjects();
  }, [fetchProjects]);

  // Charger les clients + coût mensuel au mount
  useEffect(() => {
    fetch("/api/clients")
      .then((res) => res.json())
      .then((data) => setClients(data));

    fetch("/api/costs?period=30d")
      .then((res) => res.json())
      .then((data) => setMonthlyCost(data.totalCost ?? 0));
  }, []);

  const totalSteps = WORKFLOW_STEPS.length;
  const inProgressCount = projects.filter((p) => p.status === "in_progress").length;

  async function handleDelete(projectId: string) {
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) {
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
    }
  }

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* En-tête + bouton */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Projets</h2>
            <p className="text-muted-foreground">
              {loading
                ? "Chargement..."
                : `${projects.length} projet${projects.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Link>
          </Button>
        </div>

        {/* Cartes de résumé */}
        <div className="grid gap-4 grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <FolderOpen className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{projects.length}</p>
                <p className="text-xs text-muted-foreground">
                  Projet{projects.length !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <div className="rounded-lg bg-blue-500/10 p-2">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{inProgressCount}</p>
                <p className="text-xs text-muted-foreground">En cours</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 pt-4 pb-3">
              <div className="rounded-lg bg-green-500/10 p-2">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {monthlyCost !== null ? `$${monthlyCost.toFixed(2)}` : "..."}
                </p>
                <p className="text-xs text-muted-foreground">Coût 30 jours</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-3">
          <select
            value={filterClient}
            onChange={(e) => setFilterClient(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tous les clients</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(statusLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Grille de projets */}
        {!loading && projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-muted-foreground">
                {filterClient || filterStatus
                  ? "Aucun projet ne correspond aux filtres"
                  : "Aucun projet pour le moment"}
              </p>
              {!filterClient && !filterStatus && (
                <Button asChild>
                  <Link href="/projects/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Créer votre premier projet
                  </Link>
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => {
              const validatedSteps = project.workflowSteps.length;
              const progressPercent = Math.round(
                (validatedSteps / totalSteps) * 100
              );

              return (
                <Card
                  key={project.id}
                  className="cursor-pointer transition-shadow hover:shadow-md"
                  onClick={() => router.push(`/projects/${project.id}`)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base leading-tight">
                        {project.title}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant={statusVariants[project.status]}>
                          {statusLabels[project.status] ?? project.status}
                        </Badge>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm(`Supprimer le projet "${project.title}" ?`)) {
                              handleDelete(project.id);
                            }
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                          title="Supprimer le projet"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {project.client.name}
                    </p>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          Mot-clé : {project.keyword}
                        </span>
                        <span className="font-medium">
                          {validatedSteps}/{totalSteps}
                        </span>
                      </div>
                      <Progress value={progressPercent} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
