"use client";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChoiceSelectorProps {
  items: string[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  label?: string;
}

/**
 * Composant pour sélectionner un élément parmi une liste
 * (ex: choix du titre, choix de l'introduction)
 */
export function ChoiceSelector({
  items,
  selectedIndex,
  onSelect,
  label = "Sélectionnez une option",
}: ChoiceSelectorProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => onSelect(index)}
            className={cn(
              "w-full rounded-lg border p-3 text-left text-sm transition-colors",
              selectedIndex === index
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "border-border hover:border-primary/50 hover:bg-accent"
            )}
          >
            <span className="mr-2 font-medium text-muted-foreground">
              {index + 1}.
            </span>
            {item}
          </button>
        ))}
      </CardContent>
    </Card>
  );
}

/**
 * Parse un texte numéroté en liste d'éléments
 * Ex: "1. Premier titre\n2. Deuxième titre" → ["Premier titre", "Deuxième titre"]
 */
export function parseNumberedList(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/^\d+[\.\)]\s*/, "").trim())
    .filter((line) => line.length > 0);
}
