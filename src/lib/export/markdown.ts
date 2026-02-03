import { AssembledArticle } from "./assemble";

/**
 * Exporte l'article assemblé en Markdown pur (sans front matter optionnel)
 */
export function exportMarkdown(
  article: AssembledArticle,
  options?: { includeFrontMatter?: boolean; includeSchemaOrg?: boolean }
): string {
  const { includeFrontMatter = true, includeSchemaOrg = true } = options ?? {};

  if (includeFrontMatter) {
    return article.fullMarkdown;
  }

  // Sans front matter
  const sections: string[] = [];

  sections.push(`# ${article.title}`);

  if (article.introduction) {
    sections.push(article.introduction);
  }

  if (article.body) {
    sections.push(article.body);
  }

  if (includeSchemaOrg && article.structuredData) {
    sections.push(`<!-- Schema.org JSON-LD\n${article.structuredData}\n-->`);
  }

  return sections.join("\n\n");
}
