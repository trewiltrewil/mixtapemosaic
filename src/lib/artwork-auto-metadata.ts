import sharp from "sharp";
import type { AssetMetadataInput } from "./image-assets";

export type GeneratedArtworkMetadata = {
  title: string;
  description: string;
  alt_text: string;
  tags: string[];
  categories: string[];
  colors: string[];
  moods: string[];
  subjects: string[];
};

const metadataSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title", "description", "alt_text", "tags", "categories", "colors", "moods", "subjects"],
  properties: {
    title: {
      type: "string",
      description: "A short, punchy marketing name in Title Case. Two to four words."
    },
    description: {
      type: "string",
      description: "One vivid, customer-friendly sentence that helps search and merchandising."
    },
    alt_text: {
      type: "string",
      description: "A factual accessibility description of the visible image."
    },
    tags: {
      type: "array",
      minItems: 12,
      maxItems: 32,
      items: { type: "string" }
    },
    categories: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string" }
    },
    colors: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string" }
    },
    moods: {
      type: "array",
      minItems: 2,
      maxItems: 8,
      items: { type: "string" }
    },
    subjects: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      items: { type: "string" }
    }
  }
} as const;

const systemPrompt = `You create metadata for Mixtape Mosaic's internal approved artwork library.

Mixtape Mosaic turns images into custom wall art across vintage cassette tapes. The metadata must help customers browse artwork and help staff search the library later.

Return only JSON that matches the provided schema.

Rules:
- Title should be a sick short marketing name: memorable, visual, retro-friendly, and not generic.
- Title must be 2 to 4 words in Title Case.
- Description should be one sentence, under 160 characters, with strong visual language.
- Alt text should be factual and accessible, not marketing copy.
- Tags must be lowercase, no hashtags, no duplicates, 1 to 3 words each.
- Categories must be broad lowercase buckets, like food and drink, gaming, landscape, music, city, nature, retro, abstract, or pop art.
- Do not add "curated" unless it was explicitly supplied by the admin. Curated is an intentional merchandising flag, not a default.
- Include visible subjects, color words, mood words, composition/style words, and search terms.
- Avoid naming brands, copyrighted characters, or private people unless the supplied filename/metadata clearly provides that context.
- Do not invent photographer names, source URLs, licenses, locations, or ownership claims.`;

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function uniqueCleanList(values: Array<string | null | undefined>, limit = 40) {
  const seen = new Set<string>();
  const clean: string[] = [];

  for (const value of values) {
    const item = value?.trim().toLowerCase().replace(/^#/, "");
    if (!item || seen.has(item)) {
      continue;
    }
    seen.add(item);
    clean.push(item);
    if (clean.length >= limit) {
      break;
    }
  }

  return clean;
}

function extractOutputText(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string" && direct.trim()) {
    return direct;
  }

  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) {
    return null;
  }

  for (const item of output) {
    const content = (item as { content?: unknown })?.content;
    if (!Array.isArray(content)) {
      continue;
    }
    for (const part of content) {
      const text = (part as { text?: unknown })?.text;
      if (typeof text === "string" && text.trim()) {
        return text;
      }
    }
  }

  return null;
}

export function deriveSourceMetadataFromFilename(filename: string): Partial<AssetMetadataInput> {
  const nameWithoutExtension = filename.replace(/\.[^.]+$/, "");
  const isUnsplash = /unsplash/i.test(nameWithoutExtension);
  const parts = nameWithoutExtension
    .replace(/[-_]?unsplash$/i, "")
    .split(/[-_]+/)
    .filter(Boolean);

  if (parts.length > 1 && /^(?=.*[a-z])(?=.*[A-Z0-9])[A-Za-z0-9]{8,}$/.test(parts[parts.length - 1])) {
    parts.pop();
  }

  const author = parts.length ? titleCase(parts.join(" ")) : null;

  return {
    source_type: isUnsplash ? "licensed_upload" : "manual_upload",
    source_name: isUnsplash ? "Unsplash" : null,
    source_author: author,
    source_license: isUnsplash ? "Unsplash" : null
  };
}

export function mergeMetadata({
  submitted,
  generated,
  filenameDefaults
}: {
  submitted: AssetMetadataInput;
  generated?: GeneratedArtworkMetadata | null;
  filenameDefaults?: Partial<AssetMetadataInput>;
}): AssetMetadataInput {
  const submittedTitle = submitted.title?.trim();
  const generatedTags = generated
    ? uniqueCleanList([...generated.tags, ...generated.colors, ...generated.moods, ...generated.subjects], 48)
    : [];
  const generatedCategories = generated ? uniqueCleanList(generated.categories, 12) : [];

  return {
    ...submitted,
    title:
      submittedTitle && submittedTitle.toLowerCase() !== "untitled image"
        ? submittedTitle
        : generated?.title?.trim() || "Untitled image",
    description: submitted.description?.trim() || generated?.description?.trim() || null,
    alt_text: submitted.alt_text?.trim() || generated?.alt_text?.trim() || generated?.title?.trim() || null,
    source_type: submitted.source_type?.trim() || filenameDefaults?.source_type || "manual_upload",
    source_name: submitted.source_name?.trim() || filenameDefaults?.source_name || null,
    source_author: submitted.source_author?.trim() || filenameDefaults?.source_author || null,
    source_license: submitted.source_license?.trim() || filenameDefaults?.source_license || null,
    tags: uniqueCleanList([...(submitted.tags ?? []), ...generatedTags], 64),
    categories: uniqueCleanList([...(submitted.categories ?? []), ...generatedCategories], 16),
    status: submitted.status ?? "active"
  };
}

export async function generateArtworkMetadata({
  originalBuffer,
  filename,
  contentType
}: {
  originalBuffer: Buffer;
  filename: string;
  contentType: string;
}): Promise<GeneratedArtworkMetadata | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_IMAGE_METADATA_MODEL || "gpt-4.1-mini";
  const resized = await sharp(originalBuffer, { failOn: "none" })
    .rotate()
    .resize({ width: 1200, withoutEnlargement: true })
    .jpeg({ quality: 78 })
    .toBuffer();
  const imageUrl = `data:image/jpeg;base64,${resized.toString("base64")}`;
  const promptId = process.env.OPENAI_IMAGE_METADATA_PROMPT_ID?.trim();
  const promptVersion = process.env.OPENAI_IMAGE_METADATA_PROMPT_VERSION?.trim();

  const body: Record<string, unknown> = {
    model,
    input: [
      {
        role: "system",
        content: [{ type: "input_text", text: systemPrompt }]
      },
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `Create metadata for this uploaded artwork image. Filename: ${filename}. Content type: ${contentType}.`
          },
          { type: "input_image", image_url: imageUrl, detail: "low" }
        ]
      }
    ],
    text: {
      format: {
        type: "json_schema",
        name: "mixtape_artwork_metadata",
        strict: true,
        schema: metadataSchema
      }
    },
    temperature: 0.8,
    max_output_tokens: 1600
  };

  if (promptId) {
    body.prompt = { id: promptId, ...(promptVersion ? { version: promptVersion } : {}) };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as unknown;
  const text = extractOutputText(payload);
  if (!text) {
    return null;
  }

  try {
    const parsed = JSON.parse(text) as GeneratedArtworkMetadata;
    return {
      title: parsed.title?.trim() || "Untitled image",
      description: parsed.description?.trim() || "",
      alt_text: parsed.alt_text?.trim() || "",
      tags: uniqueCleanList(parsed.tags ?? [], 32),
      categories: uniqueCleanList(parsed.categories ?? [], 8),
      colors: uniqueCleanList(parsed.colors ?? [], 8),
      moods: uniqueCleanList(parsed.moods ?? [], 8),
      subjects: uniqueCleanList(parsed.subjects ?? [], 10)
    };
  } catch {
    return null;
  }
}
