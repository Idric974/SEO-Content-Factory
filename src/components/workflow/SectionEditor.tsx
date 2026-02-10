"use client";

import {
  Loader2,
  Play,
  RefreshCw,
  CheckCircle,
  Clock,
  Pencil,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import type { PlanSection } from "@/lib/plan/sections";
import type { SectionQBST } from "@/lib/plan/qbst";

export interface SectionData {
  index: number;
  heading: string;
  content: string | null;
  status: "pending" | "generating" | "done" | "edited";
  wordCount: number;
}

interface SectionEditorProps {
  sections: PlanSection[];
  sectionOutputs: SectionData[];
  qbstData: SectionQBST[];
  generatingIndex: number | null;
  streamingText: string;
  onGenerateSection: (index: number) => void;
  onGenerateAll: () => void;
  onEditSection: (index: number, text: string) => void;
  onAssemble: () => void;
  isAssembled: boolean;
}

function getStatusBadge(status: SectionData["status"]) {
  switch (status) {
    case "pending":
      return (
        <Badge variant="secondary" className="gap-1">
          <Clock className="h-3 w-3" />
          En attente
        </Badge>
      );
    case "generating":
      return (
        <Badge variant="secondary" className="gap-1 bg-blue-100 text-blue-800">
          <Loader2 className="h-3 w-3 animate-spin" />
          En cours
        </Badge>
      );
    case "done":
      return (
        <Badge
          variant="secondary"
          className="gap-1 bg-green-100 text-green-800"
        >
          <CheckCircle className="h-3 w-3" />
          Rédigé
        </Badge>
      );
    case "edited":
      return (
        <Badge
          variant="secondary"
          className="gap-1 bg-amber-100 text-amber-800"
        >
          <Pencil className="h-3 w-3" />
          Modifié
        </Badge>
      );
  }
}

export default function SectionEditor({
  sections,
  sectionOutputs,
  qbstData,
  generatingIndex,
  streamingText,
  onGenerateSection,
  onGenerateAll,
  onEditSection,
  onAssemble,
  isAssembled,
}: SectionEditorProps) {
  const doneCount = sectionOutputs.filter(
    (s) => s.status === "done" || s.status === "edited"
  ).length;
  const totalCount = sections.length;
  const allDone = doneCount === totalCount;
  const isGenerating = generatingIndex !== null;

  return (
    <div className="space-y-4">
      {/* Barre de progression */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-sm font-medium">
            {doneCount}/{totalCount} sections rédigées
          </div>
          <div className="h-2 w-48 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-300"
              style={{
                width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
        <Button
          size="sm"
          onClick={onGenerateAll}
          disabled={isGenerating || allDone}
        >
          <Zap className="mr-2 h-3.5 w-3.5" />
          {doneCount > 0 ? "Générer les restantes" : "Générer toutes les sections"}
        </Button>
      </div>

      {/* Accordion des sections */}
      <Accordion
        type="multiple"
        defaultValue={sections.map((s) => `section-${s.index}`)}
        className="rounded-md border"
      >
        {sections.map((section) => {
          const sectionData = sectionOutputs.find(
            (s) => s.index === section.index
          );
          const status = sectionData?.status ?? "pending";
          const isCurrentlyGenerating = generatingIndex === section.index;
          const qbst = qbstData.find(
            (q) => q.sectionIndex === section.index
          );
          const content = isCurrentlyGenerating
            ? streamingText
            : sectionData?.content ?? "";
          const wordCount = content
            ? content.split(/\s+/).filter(Boolean).length
            : 0;

          return (
            <AccordionItem
              key={section.index}
              value={`section-${section.index}`}
              className="px-4"
            >
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3 flex-1 mr-2">
                  <span className="text-xs text-muted-foreground font-mono w-5">
                    H2
                  </span>
                  <span className="font-medium text-sm flex-1 text-left">
                    {section.h2.text}
                  </span>
                  {getStatusBadge(
                    isCurrentlyGenerating ? "generating" : status
                  )}
                  {wordCount > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {wordCount} mots
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3">
                  {/* Sous-sections */}
                  {section.subsections.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {section.subsections.map((sub, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          H{sub.level} — {sub.text}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Termes QBST */}
                  {qbst && qbst.terms.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">
                        Termes clés à intégrer :
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {qbst.terms.map((term, i) => (
                          <Badge
                            key={i}
                            variant="outline"
                            className="text-xs bg-blue-50 border-blue-200 text-blue-700"
                          >
                            {term}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Bouton générer */}
                  <div className="flex gap-2">
                    {status === "pending" ? (
                      <Button
                        size="sm"
                        onClick={() => onGenerateSection(section.index)}
                        disabled={isGenerating}
                      >
                        <Play className="mr-1.5 h-3.5 w-3.5" />
                        Générer cette section
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onGenerateSection(section.index)}
                        disabled={isGenerating}
                      >
                        <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        Régénérer
                      </Button>
                    )}
                  </div>

                  {/* Éditeur de section */}
                  {(content || isCurrentlyGenerating) && (
                    <textarea
                      className="w-full min-h-[200px] rounded-md border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                      value={content}
                      onChange={(e) => {
                        onEditSection(section.index, e.target.value);
                      }}
                      readOnly={isCurrentlyGenerating}
                      placeholder="Le contenu de la section apparaîtra ici..."
                    />
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Bouton assembler */}
      {allDone && !isAssembled && (
        <Button className="w-full" onClick={onAssemble}>
          <CheckCircle className="mr-2 h-4 w-4" />
          Assembler l&apos;article ({totalCount} sections)
        </Button>
      )}

      {isAssembled && (
        <div className="rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center gap-2">
          <CheckCircle className="h-4 w-4" />
          Article assemblé. Vous pouvez maintenant valider pour passer à l&apos;optimisation SEO.
        </div>
      )}
    </div>
  );
}
