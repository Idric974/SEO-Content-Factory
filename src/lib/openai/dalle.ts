import OpenAI from "openai";
import fs from "fs/promises";
import path from "path";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface GenerateImageOptions {
  prompt: string;
  filename: string;
  projectId: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd";
}

export interface GenerateImageResult {
  filename: string;
  localPath: string;
  publicUrl: string;
  revisedPrompt: string;
}

/**
 * Génère une image via DALL-E 3 et la sauvegarde localement.
 */
export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  const {
    prompt,
    filename,
    projectId,
    size = "1024x1024",
    quality = "standard",
  } = options;

  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size,
    quality,
    response_format: "b64_json",
  });

  const imageData = response.data?.[0];
  if (!imageData?.b64_json) {
    throw new Error("Pas de données image reçues de DALL-E");
  }

  // Créer le dossier du projet si nécessaire
  const projectDir = path.join(
    process.cwd(),
    "public",
    "uploads",
    "images",
    projectId
  );
  await fs.mkdir(projectDir, { recursive: true });

  // Sauvegarder l'image
  const safeFilename = filename.replace(/[^a-z0-9\-\.]/gi, "-").toLowerCase();
  const filePath = path.join(projectDir, safeFilename);
  const buffer = Buffer.from(imageData.b64_json, "base64");
  await fs.writeFile(filePath, buffer);

  return {
    filename: safeFilename,
    localPath: filePath,
    publicUrl: `/uploads/images/${projectId}/${safeFilename}`,
    revisedPrompt: imageData.revised_prompt ?? prompt,
  };
}

/**
 * Parse le texte brut de l'étape 10 (prompts illustrations) en liste structurée.
 * Format attendu :
 *   - Image : nom-fichier.jpg
 *   - Prompt : description en anglais...
 */
export function parseImagePrompts(
  text: string
): { filename: string; prompt: string }[] {
  const results: { filename: string; prompt: string }[] = [];
  const lines = text.split("\n");

  let currentFilename = "";
  let currentPrompt = "";

  for (const line of lines) {
    const trimmed = line.trim();

    // Chercher le nom de fichier
    const fileMatch = trimmed.match(
      /^[-*•]?\s*(?:Image|Fichier|File)\s*:\s*(.+)/i
    );
    if (fileMatch) {
      // Sauver le précédent s'il existe
      if (currentFilename && currentPrompt) {
        results.push({
          filename: currentFilename.trim(),
          prompt: currentPrompt.trim(),
        });
      }
      currentFilename = fileMatch[1].trim();
      currentPrompt = "";
      continue;
    }

    // Chercher le prompt
    const promptMatch = trimmed.match(
      /^[-*•]?\s*Prompt\s*:\s*(.+)/i
    );
    if (promptMatch) {
      currentPrompt = promptMatch[1].trim();
      continue;
    }

    // Ligne de continuation du prompt
    if (currentFilename && currentPrompt && trimmed && !trimmed.startsWith("-")) {
      currentPrompt += " " + trimmed;
    }
  }

  // Dernier élément
  if (currentFilename && currentPrompt) {
    results.push({
      filename: currentFilename.trim(),
      prompt: currentPrompt.trim(),
    });
  }

  return results;
}
