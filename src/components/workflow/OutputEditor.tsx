"use client";

import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OutputEditorProps {
  value: string;
  onChange: (value: string) => void;
  readOnly?: boolean;
  label?: string;
}

export function OutputEditor({
  value,
  onChange,
  readOnly = false,
  label = "Résultat",
}: OutputEditorProps) {
  if (!value) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          className="min-h-[300px] font-mono text-sm leading-relaxed"
          placeholder="Le contenu généré apparaîtra ici..."
        />
      </CardContent>
    </Card>
  );
}

/**
 * Affiche le contenu en Markdown rendu simplement (pour la prévisualisation)
 */
export function OutputPreview({ value }: { value: string }) {
  if (!value) return null;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Aperçu</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
          {value}
        </div>
      </CardContent>
    </Card>
  );
}
