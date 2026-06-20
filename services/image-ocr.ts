import * as FileSystem from "expo-file-system";
import { getProviderRegistry } from "@/lib/ai-providers";
import type { ImageAnalysis } from "@/types";

const IMAGE_EXTRACTION_PROMPT = `Analyze this image and extract all visible text. Follow these rules strictly:
1. Extract ALL text content maintaining reading order (top-to-bottom, left-to-right)
2. Preserve paragraph structure with blank lines between paragraphs
3. If you see tables, format them as: TABLE_START\\nrow1col1 | row1col2\\nrow2col1 | row2col2\\nTABLE_END
4. If you see headings, prefix with # (markdown style)
5. If you see lists, use - for bullet points and 1. for numbered lists
6. If you see captions or labels, include them
7. Skip decorative elements, watermarks, and page numbers
8. Return ONLY the extracted text content, no explanations

Return JSON with this exact structure:
{
  "extractedText": "all extracted text here",
  "contentType": "text-heavy|image-heavy|mixed|diagram|table|chart",
  "language": "detected language code like en, fr, ar",
  "confidence": 0.95,
  "tables": [{"rows": 3, "cols": 2, "data": [["cell1","cell2"],["cell3","cell4"],["cell5","cell6"]]}],
  "diagrams": ["description of any diagrams found"],
  "sections": [{"title": "section title", "content": "section content"}]
}`;

export async function fileToBase64(uri: string): Promise<string> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return base64;
}

export function isImageFile(fileType: string, filename: string): boolean {
  const imageExts = [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".webp", ".tiff"];
  const imageMimes = ["image/jpeg", "image/png", "image/gif", "image/bmp", "image/webp", "image/tiff"];
  return imageMimes.includes(fileType) || imageExts.some((ext) => filename?.toLowerCase().endsWith(ext));
}

export function isScannedPDFDContent(content: string): boolean {
  const textContent = content.replace(/\s+/g, "").trim();
  return textContent.length < 50;
}

export async function analyzeImageWithMultimodal(imageBase64: string): Promise<ImageAnalysis> {
  const registry = getProviderRegistry();
  try {
    const result = await registry.analyzeImage(imageBase64, IMAGE_EXTRACTION_PROMPT);
    const cleaned = result.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return {
      extractedText: parsed.extractedText ?? "",
      contentType: parsed.contentType ?? "mixed",
      language: parsed.language ?? "en",
      confidence: parsed.confidence ?? 0.8,
      tables: parsed.tables ?? [],
      diagrams: parsed.diagrams ?? [],
      sections: parsed.sections ?? [],
    };
  } catch (err) {
    console.warn("Multimodal analysis failed, falling back to OCR:", err);
    return await analyzeImageWithOCRFallback(imageBase64);
  }
}

async function analyzeImageWithOCRFallback(imageBase64: string): Promise<ImageAnalysis> {
  const registry = getProviderRegistry();
  try {
    const result = await registry.generate({
      systemPrompt: "You are an OCR engine. Extract all text from the image description or context provided. Return only the extracted text.",
      prompt: `Process this base64 image as OCR. Extract all visible text maintaining structure. Return the text only, no explanations.\n\nImage data length: ${imageBase64.length} chars`,
      maxTokens: 4000,
      temperature: 0.1,
    });
    return {
      extractedText: result.text,
      contentType: "text-heavy",
      language: "en",
      confidence: 0.6,
      tables: [],
      diagrams: [],
      sections: [{ title: "OCR Extract", content: result.text }],
    };
  } catch {
    return {
      extractedText: "[Image content could not be extracted. Please try uploading a text-based document instead.]",
      contentType: "image-heavy",
      language: "en",
      confidence: 0,
      tables: [],
      diagrams: [],
      sections: [],
    };
  }
}

export async function processImageFile(uri: string, filename: string): Promise<{ content: string; analysis: ImageAnalysis }> {
  const base64 = await fileToBase64(uri);
  const analysis = await analyzeImageWithMultimodal(base64);
  let content = analysis.extractedText;
  if (analysis.tables.length > 0) {
    for (const table of analysis.tables) {
      content += "\n\n[TABLE]\n";
      for (const row of table.data) {
        content += row.join(" | ") + "\n";
      }
      content += "[/TABLE]\n";
    }
  }
  return { content, analysis };
}

export async function detectDocumentContentType(uri: string, fileType: string, filename: string): Promise<"text" | "image" | "mixed"> {
  if (isImageFile(fileType, filename)) return "image";
  if (fileType === "application/pdf") {
    try {
      const content = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      if (isScannedPDFDContent(content)) return "image";
      return "text";
    } catch {
      return "mixed";
    }
  }
  return "text";
}

export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkTextForAI(text: string, maxTokens = 3000): string[] {
  const maxChars = maxTokens * 4;
  if (text.length <= maxChars) return [text];
  const chunks: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars) {
      if (current) chunks.push(current.trim());
      current = sentence;
    } else {
      current += " " + sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks;
}

export function buildEfficientPrompt(task: string, context: string, maxLength = 3000): string {
  const trimmedContext = context.length > maxLength ? context.slice(0, maxLength) + "..." : context;
  return `${task}\n\nContext:\n${trimmedContext}`;
}
