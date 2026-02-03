import { AssembledArticle } from "./assemble";

interface WordPressConfig {
  siteUrl: string;
  username: string;
  applicationPassword: string;
}

interface WordPressPostResult {
  id: number;
  link: string;
  status: string;
}

/**
 * Convertit le Markdown basique en HTML pour WordPress
 */
function markdownToHtml(md: string): string {
  let html = md;

  // Headings (traiter du plus spécifique au moins)
  html = html.replace(/^#### (.+)$/gm, "<h4>$1</h4>");
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");

  // Bold et italic
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");

  // Listes à puces (grouper les lignes consécutives)
  html = html.replace(
    /(?:^[-*] .+$\n?)+/gm,
    (match) => {
      const items = match
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^[-*]\s+/, "")}</li>`)
        .join("\n");
      return `<ul>\n${items}\n</ul>`;
    }
  );

  // Listes numérotées
  html = html.replace(
    /(?:^\d+\. .+$\n?)+/gm,
    (match) => {
      const items = match
        .trim()
        .split("\n")
        .map((line) => `<li>${line.replace(/^\d+\.\s+/, "")}</li>`)
        .join("\n");
      return `<ol>\n${items}\n</ol>`;
    }
  );

  // Paragraphes (lignes non vides qui ne sont pas déjà des tags HTML)
  const lines = html.split("\n");
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      result.push("");
      continue;
    }
    if (trimmed.startsWith("<")) {
      result.push(trimmed);
    } else {
      result.push(`<p>${trimmed}</p>`);
    }
  }

  return result.filter(Boolean).join("\n");
}

/**
 * Publie l'article sur WordPress via REST API
 */
export async function publishToWordPress(
  article: AssembledArticle,
  config: WordPressConfig,
  options?: { status?: "draft" | "publish" }
): Promise<WordPressPostResult> {
  const { siteUrl, username, applicationPassword } = config;
  const status = options?.status ?? "draft";

  // Construire le contenu HTML
  const introHtml = article.introduction
    ? markdownToHtml(article.introduction)
    : "";
  const bodyHtml = markdownToHtml(article.body);
  const content = introHtml + "\n" + bodyHtml;

  // Ajouter le JSON-LD en fin de contenu
  let fullContent = content;
  if (article.structuredData) {
    fullContent += `\n\n<!-- Schema.org JSON-LD -->\n<script type="application/ld+json">\n${article.structuredData}\n</script>`;
  }

  // Credentials en base64
  const credentials = Buffer.from(`${username}:${applicationPassword}`).toString(
    "base64"
  );

  const apiUrl = `${siteUrl.replace(/\/$/, "")}/wp-json/wp/v2/posts`;

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify({
      title: article.title,
      content: fullContent,
      status,
      meta: {
        _yoast_wpseo_title: article.metaTitle,
        _yoast_wpseo_metadesc: article.metaDescription,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WordPress API error (${response.status}): ${error}`);
  }

  const result = await response.json();
  return {
    id: result.id,
    link: result.link,
    status: result.status,
  };
}

/**
 * Exporte l'article en HTML standalone (pour copier-coller dans WordPress)
 */
export function exportWordPressHtml(article: AssembledArticle): string {
  const introHtml = article.introduction
    ? markdownToHtml(article.introduction)
    : "";
  const bodyHtml = markdownToHtml(article.body);

  let html = `<!-- Article: ${article.title} -->\n`;
  html += `<!-- Meta Title: ${article.metaTitle} -->\n`;
  html += `<!-- Meta Description: ${article.metaDescription} -->\n\n`;
  html += introHtml + "\n\n" + bodyHtml;

  // Images avec alt
  if (article.images.length > 0) {
    html += "\n\n<!-- Images -->\n";
    for (const img of article.images) {
      html += `<!-- <img src="${img.url}" alt="${img.alt}" /> -->\n`;
    }
  }

  // JSON-LD
  if (article.structuredData) {
    html += `\n\n<script type="application/ld+json">\n${article.structuredData}\n</script>`;
  }

  return html;
}
