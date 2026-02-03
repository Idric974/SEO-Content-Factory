import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
} from "docx";
import { AssembledArticle } from "./assemble";

/**
 * Convertit un article assemblé en document DOCX (buffer)
 */
export async function exportDocx(article: AssembledArticle): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Titre principal
  children.push(
    new Paragraph({
      text: article.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  );

  // Méta-données en italique
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Meta title: ${article.metaTitle}`,
          italics: true,
          size: 20,
          color: "666666",
        }),
      ],
      spacing: { after: 100 },
    })
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Meta description: ${article.metaDescription}`,
          italics: true,
          size: 20,
          color: "666666",
        }),
      ],
      spacing: { after: 400 },
    })
  );

  // Introduction
  if (article.introduction) {
    const introLines = article.introduction.split("\n").filter(Boolean);
    for (const line of introLines) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: line.trim(),
              size: 24,
            }),
          ],
          spacing: { after: 200 },
        })
      );
    }
    children.push(new Paragraph({ text: "" }));
  }

  // Corps de l'article (parser le Markdown basique)
  const bodyLines = article.body.split("\n");
  for (const line of bodyLines) {
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // H2
    if (trimmed.startsWith("## ")) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^##\s+/, ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 400, after: 200 },
        })
      );
      continue;
    }

    // H3
    if (trimmed.startsWith("### ")) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^###\s+/, ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 300, after: 150 },
        })
      );
      continue;
    }

    // H4
    if (trimmed.startsWith("#### ")) {
      children.push(
        new Paragraph({
          text: trimmed.replace(/^####\s+/, ""),
          heading: HeadingLevel.HEADING_4,
          spacing: { before: 200, after: 100 },
        })
      );
      continue;
    }

    // Liste à puces
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      children.push(
        new Paragraph({
          children: parseInlineMarkdown(trimmed.replace(/^[-*]\s+/, "")),
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // Liste numérotée
    const numberedMatch = trimmed.match(/^\d+\.\s+(.+)/);
    if (numberedMatch) {
      children.push(
        new Paragraph({
          children: parseInlineMarkdown(numberedMatch[1]),
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 100 },
        })
      );
      continue;
    }

    // Paragraphe normal
    children.push(
      new Paragraph({
        children: parseInlineMarkdown(trimmed),
        spacing: { after: 200 },
      })
    );
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "default-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: AlignmentType.START,
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440,
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        children,
      },
    ],
  });

  return Buffer.from(await Packer.toBuffer(doc));
}

/**
 * Parse le Markdown inline basique (**bold**, *italic*) en TextRun[]
 */
function parseInlineMarkdown(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // Regex pour **bold** et *italic*
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|([^*]+))/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match[2]) {
      // **bold**
      runs.push(new TextRun({ text: match[2], bold: true, size: 24 }));
    } else if (match[3]) {
      // *italic*
      runs.push(new TextRun({ text: match[3], italics: true, size: 24 }));
    } else if (match[4]) {
      // texte normal
      runs.push(new TextRun({ text: match[4], size: 24 }));
    }
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text, size: 24 }));
  }

  return runs;
}
