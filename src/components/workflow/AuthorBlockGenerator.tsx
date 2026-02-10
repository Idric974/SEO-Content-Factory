"use client";

import { useState } from "react";
import { Loader2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface AuthorBlockGeneratorProps {
  projectId: string;
  existingAuthorBlock?: string;
  onAuthorBlockGenerated: (block: string) => void;
}

export default function AuthorBlockGenerator({
  projectId,
  existingAuthorBlock,
  onAuthorBlockGenerated,
}: AuthorBlockGeneratorProps) {
  const [authorBlock, setAuthorBlock] = useState(existingAuthorBlock ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const wordCount = authorBlock
    ? authorBlock.split(/\s+/).filter(Boolean).length
    : 0;

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/generate/author-block", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erreur lors de la génération");
      }

      const data = await res.json();
      setAuthorBlock(data.authorBlock);
      onAuthorBlockGenerated(data.authorBlock);
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
            <UserCheck className="h-4 w-4" />
            Bloc Auteur (E-E-A-T)
          </CardTitle>
          <Button
            size="sm"
            variant={authorBlock ? "outline" : "default"}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Génération...
              </>
            ) : authorBlock ? (
              "Régénérer"
            ) : (
              "Générer le bloc auteur"
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          Encart auteur justifiant l&apos;expertise et la légitimité (E-E-A-T).
          Généré à partir du persona client. Sera inclus dans l&apos;article exporté.
        </p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {authorBlock && (
          <>
            <textarea
              className="w-full min-h-[100px] rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              value={authorBlock}
              onChange={(e) => {
                setAuthorBlock(e.target.value);
                onAuthorBlockGenerated(e.target.value);
              }}
            />
            <div className="flex justify-end">
              <Badge
                variant="secondary"
                className={
                  wordCount >= 80 && wordCount <= 150
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }
              >
                {wordCount} mots{" "}
                {wordCount < 80
                  ? "(trop court)"
                  : wordCount > 150
                    ? "(trop long)"
                    : ""}
              </Badge>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
