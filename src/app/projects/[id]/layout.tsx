"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StepTimeline } from "@/components/workflow/StepTimeline";
import {
  ProjectWorkflowProvider,
  useProjectWorkflow,
} from "@/contexts/ProjectWorkflowContext";

function ProjectLayoutInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { project, loading } = useProjectWorkflow();

  // Extraire le numéro d'étape active depuis le chemin
  const stepMatch = pathname.match(/\/steps\/(\d+)/);
  const activeStepNumber = stepMatch ? parseInt(stepMatch[1], 10) : undefined;

  return (
    <div className="flex h-[calc(100vh-3.5rem)]">
      {/* Colonne timeline */}
      <aside className="w-64 shrink-0 overflow-y-auto border-r bg-muted/30">
        <div className="p-4">
          <Button variant="ghost" size="sm" className="mb-3 -ml-2" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Dashboard
            </Link>
          </Button>
          <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
            Étapes du workflow
          </h3>
          {loading || !project ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-9 animate-pulse rounded-lg bg-muted"
                />
              ))}
            </div>
          ) : (
            <StepTimeline
              projectId={project.id}
              currentStep={project.currentStep}
              steps={project.workflowSteps}
              activeStepNumber={activeStepNumber}
            />
          )}
        </div>
      </aside>

      {/* Colonne contenu */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const projectId = params.id as string;

  return (
    <ProjectWorkflowProvider projectId={projectId}>
      <ProjectLayoutInner>{children}</ProjectLayoutInner>
    </ProjectWorkflowProvider>
  );
}
