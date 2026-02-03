import Link from "next/link";
import { Plus } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { prisma } from "@/lib/prisma/client";
import { WORKFLOW_STEPS } from "@/config/steps";

const statusLabels: Record<string, string> = {
  draft: "Brouillon",
  in_progress: "En cours",
  completed: "Terminé",
  published: "Publié",
};

const statusVariants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "secondary",
  in_progress: "default",
  completed: "outline",
  published: "outline",
};

export default async function DashboardPage() {
  const projects = await prisma.project.findMany({
    include: {
      client: true,
      workflowSteps: {
        where: { isValidated: true },
        select: { stepNumber: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalSteps = WORKFLOW_STEPS.length;

  return (
    <>
      <Header title="Dashboard" />
      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Projets</h2>
            <p className="text-muted-foreground">
              {projects.length} projet{projects.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau projet
            </Link>
          </Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="mb-4 text-muted-foreground">
                Aucun projet pour le moment
              </p>
              <Button asChild>
                <Link href="/projects/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Créer votre premier projet
                </Link>
              </Button>
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
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base leading-tight">
                          {project.title}
                        </CardTitle>
                        <Badge variant={statusVariants[project.status]}>
                          {statusLabels[project.status] ?? project.status}
                        </Badge>
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
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
