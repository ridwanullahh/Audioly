import { getProviderRegistry } from "@/lib/ai-providers";
import { DocumentService, ProjectService, AudioService, UsageService, NotificationService } from "@/services";
import type { Document, Project, NarrationPlan, NarrationSection, TTSRequest } from "@/types";

export class AIAgent {
  private registry = getProviderRegistry();

  async analyzeDocument(doc: Document): Promise<DocumentAnalysis> {
    const response = await this.registry.generate({
      systemPrompt: "You are an expert document analyst. Analyze the provided document and return a JSON object with: documentType (academic|novel|report|legal|blog|manual|textbook|presentation|news|other), language, structure (chapters array with title and level), summary, keyTopics array, suggestedNarrationMode (straight|multi-voice|podcast|summary|chapter-by-chapter).",
      prompt: `Analyze this document:\n\nTitle: ${doc.title}\nContent (first 3000 chars):\n${doc.content.slice(0, 3000)}`,
      maxTokens: 1500,
      temperature: 0.3,
    });

    try {
      const parsed = JSON.parse(response.text);
      return {
        documentType: parsed.documentType ?? "other",
        language: parsed.language ?? "en",
        chapters: parsed.structure?.chapters ?? [],
        summary: parsed.summary ?? "",
        keyTopics: parsed.keyTopics ?? [],
        suggestedNarrationMode: parsed.suggestedNarrationMode ?? "straight",
      };
    } catch {
      return { documentType: "other", language: "en", chapters: [], summary: "", keyTopics: [], suggestedNarrationMode: "straight" };
    }
  }

  async generateNarrationPlan(doc: Document, mode: string): Promise<NarrationPlan> {
    const chapters = doc.structure?.chapters ?? [];
    const sections: NarrationSection[] = chapters.map((ch, i) => ({
      id: crypto.randomUUID(),
      chapterId: ch.id,
      title: ch.title,
      voiceId: "",
      estimatedDuration: Math.ceil(ch.wordCount / 150 * 60),
      pace: "normal" as const,
      skip: false,
    }));

    if (sections.length === 0) {
      sections.push({
        id: crypto.randomUUID(),
        chapterId: "main",
        title: doc.title,
        voiceId: "",
        estimatedDuration: Math.ceil((doc.wordCount || 500) / 150 * 60),
        pace: "normal",
        skip: false,
      });
    }

    return {
      sections,
      totalEstimatedDuration: sections.reduce((sum, s) => sum + s.estimatedDuration, 0),
      voiceAssignments: {},
    };
  }

  async synthesizeSection(text: string, voiceId: string, speed = 1.0, provider?: any): Promise<Uint8Array> {
    const request: TTSRequest = { text, voiceId, speed, provider };
    const response = await this.registry.synthesize(request);
    if (response.audioData instanceof ArrayBuffer) {
      return new Uint8Array(response.audioData);
    }
    return new TextEncoder().encode(response.audioData);
  }

  async summarizeDocument(content: string): Promise<string> {
    const response = await this.registry.generate({
      systemPrompt: "You are a skilled summarizer. Provide a concise summary in 3-5 bullet points.",
      prompt: `Summarize this content:\n\n${content.slice(0, 4000)}`,
      maxTokens: 500,
      temperature: 0.5,
    });
    return response.text;
  }

  async generateChapterTitles(content: string): Promise<string[]> {
    const response = await this.registry.generate({
      systemPrompt: "Generate creative chapter titles based on the content. Return a JSON array of strings.",
      prompt: `Generate chapter titles for this content:\n\n${content.slice(0, 3000)}`,
      maxTokens: 500,
      temperature: 0.7,
    });
    try {
      return JSON.parse(response.text);
    } catch {
      return [];
    }
  }

  async generateCoverArtDescription(title: string, content: string): Promise<string> {
    const response = await this.registry.generate({
      systemPrompt: "Generate a vivid, one-sentence description for cover art that would represent this audiobook.",
      prompt: `Title: ${title}\nContent preview: ${content.slice(0, 1000)}`,
      maxTokens: 200,
      temperature: 0.8,
    });
    return response.text;
  }

  async cleanContent(rawContent: string): Promise<string> {
    const response = await this.registry.generate({
      systemPrompt: "Clean this text for audio narration. Remove page numbers, headers, footers, URLs, and non-narrable content. Keep only the narrable text. Return cleaned text only.",
      prompt: rawContent.slice(0, 5000),
      maxTokens: 5000,
      temperature: 0.1,
    });
    return response.text;
  }

  async detectDialogues(content: string): Promise<Array<{ speaker: string; text: string }>> {
    const response = await this.registry.generate({
      systemPrompt: 'Identify dialogues in the text. Return a JSON array of objects with "speaker" and "text" fields. If no dialogues found, return empty array.',
      prompt: content.slice(0, 3000),
      maxTokens: 1500,
      temperature: 0.3,
    });
    try {
      return JSON.parse(response.text);
    } catch {
      return [];
    }
  }

  async generatePodcastDialogue(content: string): Promise<string> {
    const response = await this.registry.generate({
      systemPrompt: "Rewrite this content as an engaging podcast conversation between two hosts named Alex and Sam. Make it natural, conversational, and informative. Use Speaker: format.",
      prompt: content.slice(0, 4000),
      maxTokens: 4000,
      temperature: 0.8,
    });
    return response.text;
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    const provider = this.registry.get();
    if (provider.translate) {
      return provider.translate(text, from, to);
    }
    const response = await this.registry.generate({
      systemPrompt: `Translate the following text from ${from} to ${to}. Return only the translation.`,
      prompt: text,
      maxTokens: 4000,
      temperature: 0.2,
    });
    return response.text;
  }
}

export interface DocumentAnalysis {
  documentType: string;
  language: string;
  chapters: Array<{ title: string; level: number }>;
  summary: string;
  keyTopics: string[];
  suggestedNarrationMode: string;
}

export class ConversionPipeline {
  private agent = new AIAgent();

  async runConversion(projectId: string, userId: string): Promise<void> {
    const project = await ProjectService.getById(projectId);
    if (!project) throw new Error("Project not found");

    const doc = await DocumentService.getById(project.documentId!);
    if (!doc) throw new Error("Document not found");

    await ProjectService.updateStatus(projectId, "processing", 5);

    const analysis = await this.agent.analyzeDocument(doc);
    await DocumentService.update(doc.id, {
      documentType: analysis.documentType as any,
      language: analysis.language,
    });
    await ProjectService.updateStatus(projectId, "processing", 15);

    const cleanedContent = await this.agent.cleanContent(doc.content);
    await DocumentService.update(doc.id, { content: cleanedContent });
    await ProjectService.updateStatus(projectId, "processing", 30);

    const plan = await this.agent.generateNarrationPlan(doc, project.narrationMode);
    await ProjectService.updateStatus(projectId, "processing", 40);

    const sections = plan.sections.filter((s) => !s.skip);
    const totalSections = sections.length;

    for (let i = 0; i < totalSections; i++) {
      const section = sections[i];
      const sectionContent = cleanedContent.slice(
        Math.floor((i / totalSections) * cleanedContent.length),
        Math.floor(((i + 1) / totalSections) * cleanedContent.length)
      );

      if (sectionContent.trim()) {
        await this.agent.synthesizeSection(sectionContent, project.voiceId ?? "v1");
      }

      const progress = 40 + Math.round(((i + 1) / totalSections) * 50);
      await ProjectService.updateStatus(projectId, "processing", progress);

      await UsageService.log(userId, "tts_synthesis", sectionContent.length, 0, "cloudflare");
    }

    await AudioService.create({
      projectId,
      userId,
      filename: `${project.name}.${project.outputFormat ?? "mp3"}`,
      format: (project.outputFormat as any) ?? "mp3",
      quality: (project.quality as any) ?? "128kbps",
      duration: plan.totalEstimatedDuration,
      filePath: "",
      metadata: { title: project.name, description: analysis.summary },
    });

    await ProjectService.updateStatus(projectId, "completed", 100);

    await NotificationService.create({
      userId,
      title: "Conversion Complete",
      message: `"${project.name}" has been converted to audio successfully.`,
      type: "conversion",
    });
  }
}
