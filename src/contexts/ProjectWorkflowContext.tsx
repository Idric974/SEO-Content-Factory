"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";

interface WorkflowStepData {
  id: string;
  stepNumber: number;
  stepName: string;
  isValidated: boolean;
  outputText: string | null;
  outputData: Record<string, unknown> | null;
  tokensUsed: number | null;
  costUsd: string | null;
}

export interface ProjectData {
  id: string;
  title: string;
  keyword: string;
  searchIntents: string[];
  businessObjective: string | null;
  serpAnalysis: Record<string, unknown> | null;
  editorialFormat: string | null;
  status: string;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
  client: { id: string; name: string; slug: string; persona: unknown };
  workflowSteps: WorkflowStepData[];
}

interface ProjectWorkflowContextType {
  project: ProjectData | null;
  loading: boolean;
  refreshProject: () => Promise<void>;
}

const ProjectWorkflowContext = createContext<ProjectWorkflowContextType | null>(
  null
);

export function ProjectWorkflowProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProject = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      setProject(await res.json());
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    refreshProject();
  }, [refreshProject]);

  return (
    <ProjectWorkflowContext.Provider
      value={{ project, loading, refreshProject }}
    >
      {children}
    </ProjectWorkflowContext.Provider>
  );
}

export function useProjectWorkflow() {
  const ctx = useContext(ProjectWorkflowContext);
  if (!ctx) {
    throw new Error(
      "useProjectWorkflow must be used within a ProjectWorkflowProvider"
    );
  }
  return ctx;
}
