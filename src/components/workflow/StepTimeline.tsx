"use client";

import Link from "next/link";
import { Check, Circle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { WORKFLOW_STEPS } from "@/config/steps";

interface WorkflowStepData {
  stepNumber: number;
  stepName: string;
  isValidated: boolean;
  outputData: unknown;
}

interface StepTimelineProps {
  projectId: string;
  currentStep: number;
  steps: WorkflowStepData[];
}

export function StepTimeline({
  projectId,
  currentStep,
  steps,
}: StepTimelineProps) {
  return (
    <div className="space-y-1">
      {WORKFLOW_STEPS.map((stepDef) => {
        const stepData = steps.find((s) => s.stepNumber === stepDef.number);
        const isValidated = stepData?.isValidated ?? false;
        const hasOutput = stepData?.outputData != null;
        const isCurrent = stepDef.number === currentStep;

        let status: "validated" | "current" | "available" | "locked";
        if (isValidated) {
          status = "validated";
        } else if (isCurrent) {
          status = "current";
        } else if (stepDef.number <= currentStep) {
          status = "available";
        } else {
          status = "locked";
        }

        return (
          <Link
            key={stepDef.number}
            href={
              status !== "locked"
                ? `/projects/${projectId}/steps/${stepDef.number}`
                : "#"
            }
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
              status === "validated" &&
                "text-muted-foreground hover:bg-accent",
              status === "current" &&
                "bg-primary/10 font-medium text-primary",
              status === "available" && "hover:bg-accent",
              status === "locked" &&
                "cursor-not-allowed opacity-40"
            )}
          >
            <div className="flex h-6 w-6 shrink-0 items-center justify-center">
              {status === "validated" ? (
                <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="h-3 w-3" />
                </div>
              ) : status === "current" ? (
                hasOutput ? (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-primary/20">
                    <Circle className="h-2 w-2 fill-primary text-primary" />
                  </div>
                ) : (
                  <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary">
                    <Loader2 className="h-3 w-3 animate-spin text-primary" />
                  </div>
                )
              ) : (
                <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-muted-foreground/30">
                  <span className="text-[10px] text-muted-foreground">
                    {stepDef.number}
                  </span>
                </div>
              )}
            </div>
            <div className="flex-1 truncate">
              <span>{stepDef.name}</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
