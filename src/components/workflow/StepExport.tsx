"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  FileDown,
  Globe,
  Eye,
  Check,
  Loader2,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

interface StepExportProps {
  projectId: string;
}

interface PreviewData {
  title: string;
  metaTitle: string;
  metaDescription: string;
  introduction: string;
  body: string;
  structuredData: string;
  images: { filename: string; url: string; alt: string }[];
  fullMarkdown: string;
}

interface StepData {
  isValidated: boolean;
}

export function StepExport({ projectId }: StepExportProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [stepData, setStepData] = useState<StepData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);
  const [wpExpanded, setWpExpanded] = useState(false);
  const [wpConfig, setWpConfig] = useState({
    siteUrl: "",
    username: "",
    applicationPassword: "",
    publishStatus: "draft" as "draft" | "publish",
  });
  const [wpResult, setWpResult] = useState<{
    postUrl: string;
    status: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      const [previewRes, stepRes] = await Promise.all([
        fetch("/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, format: "preview" }),
        }),
        fetch(`/api/projects/${projectId}/steps/15`),
      ]);

      if (previewRes.ok) {
        setPreview(await previewRes.json());
      }
      if (stepRes.ok) {
        setStepData(await stepRes.json());
      }
      setLoading(false);
    }
    loadData();
  }, [projectId]);

  async function handleExport(format: "markdown" | "docx" | "html") {
    setExporting(format);
    setError(null);

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format }),
      });

      if (!res.ok) {
        throw new Error("Erreur lors de l'export");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const filenameMatch = disposition.match(/filename="(.+)"/);
      const filename = filenameMatch?.[1] ?? `article.${format === "docx" ? "docx" : format === "html" ? "html" : "md"}`;

      // Télécharger
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
    setExporting(null);
  }

  async function handleWordPressPublish() {
    setExporting("wordpress");
    setError(null);
    setWpResult(null);

    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          format: "wordpress",
          wordpressConfig: wpConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Erreur WordPress");
      }

      setWpResult({ postUrl: data.postUrl, status: data.status });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
    }
    setExporting(null);
  }

  async function handleCopyHtml() {
    if (!preview) return;
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, format: "html" }),
      });
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Impossible de copier dans le presse-papier");
    }
  }

  async function handleValidate() {
    await fetch(`/api/projects/${projectId}/steps/15`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outputText: "Article exporté",
        outputData: { exported: true },
        isValidated: true,
      }),
    });

    // Marquer le projet comme complété
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    router.push(`/projects/${projectId}`);
  }

  if (loading) {
    return <p className="text-muted-foreground">Chargement de l&apos;export...</p>;
  }

  if (!preview) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">
            Les étapes précédentes doivent être complétées avant l&apos;export.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Prévisualisation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Prévisualisation
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant="outline">
                {preview.body.split(/\s+/).length} mots
              </Badge>
              <Badge variant="outline">
                {preview.images.length} images
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Titre</p>
            <p className="font-semibold">{preview.title}</p>
          </div>
          <Separator />
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Meta title ({preview.metaTitle.length} car.)
              </p>
              <p className="text-sm">{preview.metaTitle}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Meta description ({preview.metaDescription.length} car.)
              </p>
              <p className="text-sm">{preview.metaDescription}</p>
            </div>
          </div>
          <Separator />
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Début de l&apos;article
            </p>
            <div className="max-h-48 overflow-y-auto rounded border p-3 text-sm">
              <pre className="whitespace-pre-wrap font-sans">
                {preview.introduction.slice(0, 500)}
                {preview.introduction.length > 500 && "..."}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Options d'export */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Markdown */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <FileText className="h-8 w-8 text-muted-foreground" />
            <h3 className="font-medium">Markdown</h3>
            <p className="text-center text-xs text-muted-foreground">
              Fichier .md avec front matter, idéal pour les CMS statiques
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleExport("markdown")}
              disabled={exporting !== null}
            >
              {exporting === "markdown" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Télécharger .md
            </Button>
          </CardContent>
        </Card>

        {/* DOCX */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <FileText className="h-8 w-8 text-blue-500" />
            <h3 className="font-medium">Word (DOCX)</h3>
            <p className="text-center text-xs text-muted-foreground">
              Document Word formaté, pour relecture ou envoi au client
            </p>
            <Button
              className="w-full"
              variant="outline"
              onClick={() => handleExport("docx")}
              disabled={exporting !== null}
            >
              {exporting === "docx" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <FileDown className="mr-2 h-4 w-4" />
              )}
              Télécharger .docx
            </Button>
          </CardContent>
        </Card>

        {/* HTML */}
        <Card>
          <CardContent className="flex flex-col items-center gap-3 pt-6">
            <Globe className="h-8 w-8 text-orange-500" />
            <h3 className="font-medium">HTML</h3>
            <p className="text-center text-xs text-muted-foreground">
              Code HTML prêt à coller dans WordPress ou un autre CMS
            </p>
            <div className="flex w-full gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => handleExport("html")}
                disabled={exporting !== null}
              >
                <FileDown className="mr-1 h-4 w-4" />
                .html
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={handleCopyHtml}
                disabled={exporting !== null}
              >
                {copied ? (
                  <Check className="mr-1 h-4 w-4" />
                ) : (
                  <Copy className="mr-1 h-4 w-4" />
                )}
                {copied ? "Copié" : "Copier"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* WordPress REST API */}
      <Card>
        <CardHeader>
          <button
            onClick={() => setWpExpanded(!wpExpanded)}
            className="flex w-full items-center justify-between text-left"
          >
            <CardTitle className="flex items-center gap-2 text-sm">
              <Globe className="h-4 w-4" />
              Publier sur WordPress (REST API)
            </CardTitle>
            <Badge variant="outline">
              {wpExpanded ? "Masquer" : "Configurer"}
            </Badge>
          </button>
        </CardHeader>
        {wpExpanded && (
          <CardContent className="space-y-4 border-t pt-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  URL du site
                </label>
                <Input
                  placeholder="https://monsite.com"
                  value={wpConfig.siteUrl}
                  onChange={(e) =>
                    setWpConfig((prev) => ({ ...prev, siteUrl: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">
                  Nom d&apos;utilisateur
                </label>
                <Input
                  placeholder="admin"
                  value={wpConfig.username}
                  onChange={(e) =>
                    setWpConfig((prev) => ({
                      ...prev,
                      username: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Application Password
                </label>
                <Input
                  type="password"
                  placeholder="xxxx xxxx xxxx xxxx xxxx xxxx"
                  value={wpConfig.applicationPassword}
                  onChange={(e) =>
                    setWpConfig((prev) => ({
                      ...prev,
                      applicationPassword: e.target.value,
                    }))
                  }
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Générez un Application Password dans WordPress &gt; Users &gt;
                  Profil &gt; Application Passwords
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={
                    wpConfig.publishStatus === "draft" ? "default" : "outline"
                  }
                  onClick={() =>
                    setWpConfig((prev) => ({
                      ...prev,
                      publishStatus: "draft",
                    }))
                  }
                >
                  Brouillon
                </Button>
                <Button
                  size="sm"
                  variant={
                    wpConfig.publishStatus === "publish" ? "default" : "outline"
                  }
                  onClick={() =>
                    setWpConfig((prev) => ({
                      ...prev,
                      publishStatus: "publish",
                    }))
                  }
                >
                  Publier
                </Button>
              </div>

              <Button
                onClick={handleWordPressPublish}
                disabled={
                  exporting !== null ||
                  !wpConfig.siteUrl ||
                  !wpConfig.username ||
                  !wpConfig.applicationPassword
                }
              >
                {exporting === "wordpress" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Globe className="mr-2 h-4 w-4" />
                )}
                Envoyer vers WordPress
              </Button>
            </div>

            {wpResult && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
                <Check className="h-4 w-4" />
                <span>
                  Article publié ({wpResult.status}) :{" "}
                  <a
                    href={wpResult.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline"
                  >
                    Voir l&apos;article
                    <ExternalLink className="ml-1 inline h-3 w-3" />
                  </a>
                </span>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Erreur */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <p className="text-sm text-destructive">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Validation finale */}
      <Card>
        <CardContent className="pt-6">
          {stepData?.isValidated ? (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
              <Check className="h-4 w-4" />
              <span>Projet finalisé et exporté</span>
            </div>
          ) : (
            <Button onClick={handleValidate} className="w-full">
              <Check className="mr-2 h-4 w-4" />
              Marquer le projet comme terminé
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
