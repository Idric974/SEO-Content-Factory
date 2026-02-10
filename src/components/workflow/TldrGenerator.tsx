"use client";

import { useState } from "react";
import { Loader2, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface TldrGeneratorProps {
  projectId: string;
  existingTldr?: string;
  onTldrGenerated: (tldr: string) => void;
}

export default function TldrGenerator({
  projectId,
  existingTldr,
  onTldrGenerated,
}: TldrGeneratorProps) {
  const [tldr, setTldr] = useState(existingTldr ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = tldr ? tldr.split(/\s+/).filter(Boolean).length : 0;

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate/tldr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }

      const data = await res.json();
      setTldr(data.tldr);
      onTldrGenerated(data.tldr);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="h-4 w-4" />
            TL;DR (above the fold)
          </CardTitle>
          <Button
            size="sm"
            variant={tldr ? "outline" : "default"}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Génération...
              </>
            ) : tldr ? (
              "Régénérer"
            ) : (
              "Générer le TL;DR"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Résumé concis placé en haut de l&apos;article pour l&apos;optimisation
          &quot;above the fold&quot; et le biais de primauté des LLMs.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {tldr && (
          <>
            <textarea
              className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={tldr}
              onChange={(e) => {
                setTldr(e.target.value);
                onTldrGenerated(e.target.value);
              }}
            />
            <div className="flex justify-end">
              <Badge
                variant="secondary"
                className={
                  wordCount >= 50 && wordCount <= 100
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {wordCount} mots {wordCount < 50 ? "(trop court)" : wordCount > 100 ? "(trop long)" : ""}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
