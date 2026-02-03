"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface MetaSelectorProps {
  titles: string[];
  descriptions: string[];
  selectedTitleIndex: number | null;
  selectedDescriptionIndex: number | null;
  onSelectTitle: (index: number) => void;
  onSelectDescription: (index: number) => void;
}

/**
 * Double sélection pour les méta-données : un titre + une description.
 */
export function MetaSelector({
  titles,
  descriptions,
  selectedTitleIndex,
  selectedDescriptionIndex,
  onSelectTitle,
  onSelectDescription,
}: MetaSelectorProps) {
  return (
    <div className="space-y-4">
      {/* Meta titles */}
      {titles.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Meta Title
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                50-60 caractères
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {titles.map((title, index) => (
              <button
                key={index}
                onClick={() => onSelectTitle(index)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                  selectedTitleIndex === index
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span>
                    <span className="mr-2 font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    {title}
                  </span>
                  <Badge
                    variant={
                      title.length >= 50 && title.length <= 60
                        ? "default"
                        : "secondary"
                    }
                    className="shrink-0 text-xs"
                  >
                    {title.length} car.
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meta descriptions */}
      {descriptions.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Meta Description
              </CardTitle>
              <Badge variant="outline" className="text-xs">
                150-160 caractères
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {descriptions.map((desc, index) => (
              <button
                key={index}
                onClick={() => onSelectDescription(index)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left text-sm transition-colors",
                  selectedDescriptionIndex === index
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "border-border hover:border-primary/50 hover:bg-accent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <span>
                    <span className="mr-2 font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    {desc}
                  </span>
                  <Badge
                    variant={
                      desc.length >= 150 && desc.length <= 160
                        ? "default"
                        : "secondary"
                    }
                    className="shrink-0 text-xs"
                  >
                    {desc.length} car.
                  </Badge>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

/**
 * Parse le texte de l'étape 13 pour extraire les titres et descriptions.
 * Format attendu : sections "Meta titles" et "Meta descriptions" avec listes numérotées.
 */
export function parseMetaOutput(text: string): {
  titles: string[];
  descriptions: string[];
} {
  const titles: string[] = [];
  const descriptions: string[] = [];

  // Séparer en sections par les titres
  const lines = text.split("\n");
  let currentSection: "none" | "titles" | "descriptions" = "none";

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (
      lower.includes("meta title") ||
      lower.includes("titre") ||
      lower.includes("title")
    ) {
      if (lower.includes("description")) {
        currentSection = "descriptions";
      } else {
        currentSection = "titles";
      }
      continue;
    }

    if (
      lower.includes("meta description") ||
      lower.includes("description")
    ) {
      currentSection = "descriptions";
      continue;
    }

    // Extraire les éléments numérotés
    const match = line.match(/^\d+[\.\)]\s*(.+)/);
    if (match) {
      const content = match[1]
        .replace(/^["«]|["»]$/g, "")
        .trim();
      if (content) {
        if (currentSection === "titles") {
          titles.push(content);
        } else if (currentSection === "descriptions") {
          descriptions.push(content);
        }
      }
    }
  }

  return { titles, descriptions };
}
