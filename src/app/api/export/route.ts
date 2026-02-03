import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma/client";
import { assembleArticle } from "@/lib/export/assemble";
import { exportMarkdown } from "@/lib/export/markdown";
import { exportDocx } from "@/lib/export/docx";
import { exportWordPressHtml, publishToWordPress } from "@/lib/export/wordpress";

// POST /api/export - Exporte l'article dans le format demandé
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { projectId, format, wordpressConfig } = body;

  if (!projectId || !format) {
    return NextResponse.json(
      { error: "projectId et format sont requis" },
      { status: 400 }
    );
  }

  // Charger le projet complet
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      workflowSteps: { orderBy: { stepNumber: "asc" } },
      images: true,
    },
  });

  if (!project) {
    return NextResponse.json(
      { error: "Projet introuvable" },
      { status: 404 }
    );
  }

  // Assembler l'article
  const article = assembleArticle({
    title: project.title,
    keyword: project.keyword,
    workflowSteps: project.workflowSteps.map((s) => ({
      stepNumber: s.stepNumber,
      outputText: s.outputText,
      outputData: s.outputData as Record<string, unknown> | null,
    })),
    images: project.images.map((img) => ({
      filename: img.filename,
      imageUrl: img.imageUrl,
      altText: img.altText,
    })),
  });

  switch (format) {
    case "markdown": {
      const md = exportMarkdown(article);
      return new Response(md, {
        headers: {
          "Content-Type": "text/markdown; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slugify(article.title)}.md"`,
        },
      });
    }

    case "docx": {
      const buffer = await exportDocx(article);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${slugify(article.title)}.docx"`,
        },
      });
    }

    case "html": {
      const html = exportWordPressHtml(article);
      return new Response(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${slugify(article.title)}.html"`,
        },
      });
    }

    case "wordpress": {
      if (!wordpressConfig?.siteUrl || !wordpressConfig?.username || !wordpressConfig?.applicationPassword) {
        return NextResponse.json(
          { error: "Configuration WordPress requise (siteUrl, username, applicationPassword)" },
          { status: 400 }
        );
      }

      try {
        const result = await publishToWordPress(article, wordpressConfig, {
          status: wordpressConfig.publishStatus ?? "draft",
        });
        return NextResponse.json({
          success: true,
          postId: result.id,
          postUrl: result.link,
          status: result.status,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur WordPress";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    case "preview": {
      // Retourne l'article assemblé en JSON pour prévisualisation
      return NextResponse.json(article);
    }

    default:
      return NextResponse.json(
        { error: `Format non supporté: ${format}` },
        { status: 400 }
      );
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
