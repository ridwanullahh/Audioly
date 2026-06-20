import type {
  AIProviderType,
  AITaskType,
  TTSRequest,
  TTSResponse,
  LLMRequest,
  LLMResponse,
} from "@/types";

export interface IAIProvider {
  readonly type: AIProviderType;
  readonly name: string;
  isAvailable(): Promise<boolean>;
  synthesize(request: TTSRequest): Promise<TTSResponse>;
  generate(request: LLMRequest): Promise<LLMResponse>;
  translate?(text: string, from: string, to: string): Promise<string>;
  embed?(text: string): Promise<number[]>;
  analyzeImage?(imageBase64: string, prompt: string): Promise<string>;
  supportedTasks(): AITaskType[];
}

export class CloudflareAIProvider implements IAIProvider {
  readonly type: AIProviderType = "cloudflare";
  readonly name = "Cloudflare Workers AI";
  private apiKey: string;
  private accountId: string;
  private baseUrl: string;

  constructor(apiKey: string, accountId: string) {
    this.apiKey = apiKey;
    this.accountId = accountId;
    this.baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/@cf/meta/llama-3-8b-instruct`, {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({ messages: [{ role: "user", content: "hi" }], max_tokens: 1 }),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const modelId = request.voiceId || "@cf/myshell-ai/melotts";
    const res = await fetch(`${this.baseUrl}/${modelId}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        text: request.text,
        voice: this.mapVoice(request.voiceId),
        speed: request.speed ?? 1.0,
      }),
    });

    if (!res.ok) {
      throw new Error(`Cloudflare TTS failed: ${res.status} ${await res.text()}`);
    }

    const audioBuffer = await res.arrayBuffer();
    return {
      audioData: audioBuffer,
      duration: Math.ceil(audioBuffer.byteLength / 16000),
      format: request.format ?? "mp3",
      provider: "cloudflare",
      model: modelId,
    };
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || "@cf/meta/llama-3-8b-instruct";
    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push({ role: "user", content: request.prompt });

    const res = await fetch(`${this.baseUrl}/${model}`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
      }),
    });

    if (!res.ok) {
      throw new Error(`Cloudflare LLM failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    return {
      text: data.result?.response ?? data.result?.text ?? "",
      tokensUsed: data.result?.tokens_used ?? 0,
      provider: "cloudflare",
      model,
    };
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/@cf/meta/m2m100-1.2b`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text, source_lang: from, target_lang: to }),
    });
    const data = await res.json();
    return data.result?.translated_text ?? text;
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/@cf/baai/bge-base-en-v1.5`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({ text: [text] }),
    });
    const data = await res.json();
    return data.result?.data?.[0] ?? [];
  }

  supportedTasks(): AITaskType[] {
    return ["tts", "llm", "translation", "embedding"];
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    throw new Error("Cloudflare AI does not support image analysis");
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }

  private mapVoice(voiceId: string): string {
    const voiceMap: Record<string, string> = {
      v1: "default",
      v2: "male-1",
      v3: "female-2",
      v4: "male-2",
      v5: "female-3",
    };
    return voiceMap[voiceId] ?? "default";
  }
}

export class NvidiaNIMProvider implements IAIProvider {
  readonly type: AIProviderType = "nvidia";
  readonly name = "NVIDIA NIM";
  private apiKey: string;
  private baseUrl = "https://integrate.api.nvidia.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/models`, {
        headers: this.headers(),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const model = request.voiceId || "nvidia/tts-fastpitch";
    const res = await fetch(`${this.baseUrl}/audio/speech`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model,
        input: request.text,
        voice: "english_us_female",
        speed: request.speed ?? 1.0,
      }),
    });

    if (!res.ok) {
      throw new Error(`NVIDIA TTS failed: ${res.status} ${await res.text()}`);
    }

    const audioBuffer = await res.arrayBuffer();
    return {
      audioData: audioBuffer,
      duration: Math.ceil(audioBuffer.byteLength / 16000),
      format: request.format ?? "mp3",
      provider: "nvidia",
      model,
    };
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || "meta/llama-3.1-8b-instruct";
    const messages = [];
    if (request.systemPrompt) {
      messages.push({ role: "system", content: request.systemPrompt });
    }
    messages.push({ role: "user", content: request.prompt });

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model,
        messages,
        max_tokens: request.maxTokens ?? 2048,
        temperature: request.temperature ?? 0.7,
        stream: false,
      }),
    });

    if (!res.ok) {
      throw new Error(`NVIDIA LLM failed: ${res.status} ${await res.text()}`);
    }

    const data = await res.json();
    const choice = data.choices?.[0];
    return {
      text: choice?.message?.content ?? "",
      tokensUsed: data.usage?.total_tokens ?? 0,
      provider: "nvidia",
      model,
    };
  }

  async embed(text: string): Promise<number[]> {
    const res = await fetch(`${this.baseUrl}/embeddings`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: "nvidia/nv-embed-v1",
        input: text,
        encoding_format: "float",
      }),
    });
    const data = await res.json();
    return data.data?.[0]?.embedding ?? [];
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        model: "google/deplot",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/png;base64,${imageBase64}` } },
          ],
        }],
        max_tokens: 2048,
      }),
    });
    if (!res.ok) throw new Error(`NVIDIA vision failed: ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  }

  supportedTasks(): AITaskType[] {
    return ["tts", "llm", "embedding"];
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };
  }
}

export class GeminiAIProvider implements IAIProvider {
  readonly type: AIProviderType = "gemini";
  readonly name = "Google Gemini";
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta/models";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/gemini-2.0-flash?key=${this.apiKey}`);
      return res.ok || res.status === 400;
    } catch {
      return false;
    }
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    throw new Error("Gemini does not support TTS directly. Use Cloudflare or NVIDIA for audio synthesis.");
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    const model = request.model || "gemini-2.0-flash";
    const contents: any[] = [];
    const parts: any[] = [];
    if (request.systemPrompt) {
      parts.push({ text: `[System Instructions]\n${request.systemPrompt}\n\n[User Request]\n${request.prompt}` });
    } else {
      parts.push({ text: request.prompt });
    }
    contents.push({ role: "user", parts });

    const res = await fetch(`${this.baseUrl}/${model}:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          maxOutputTokens: request.maxTokens ?? 2048,
          temperature: request.temperature ?? 0.7,
        },
      }),
    });

    if (!res.ok) throw new Error(`Gemini LLM failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const usageMeta = data.usageMetadata ?? {};
    return {
      text,
      tokensUsed: (usageMeta.promptTokenCount ?? 0) + (usageMeta.candidatesTokenCount ?? 0),
      provider: "gemini",
      model,
    };
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    const result = await this.generate({
      prompt: `Translate the following text from ${from} to ${to}. Return ONLY the translation, nothing else:\n\n${text}`,
      systemPrompt: "You are a professional translator. Provide accurate, natural translations. Return only the translated text.",
      maxTokens: 4000,
      temperature: 0.2,
    });
    return result.text;
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/gemini-2.0-flash:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { inline_data: { mime_type: "image/png", data: imageBase64 } },
            { text: prompt },
          ],
        }],
        generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
      }),
    });
    if (!res.ok) throw new Error(`Gemini vision failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }

  supportedTasks(): AITaskType[] {
    return ["llm", "translation", "vision", "image", "ocr"];
  }
}

export class AIProviderRegistry {
  private providers = new Map<AIProviderType, IAIProvider>();
  private defaultProvider: AIProviderType = "cloudflare";

  register(provider: IAIProvider): void {
    this.providers.set(provider.type, provider);
  }

  get(type?: AIProviderType): IAIProvider {
    const key = type ?? this.defaultProvider;
    const provider = this.providers.get(key);
    if (!provider) {
      throw new Error(`AI provider '${key}' not registered. Available: ${[...this.providers.keys()].join(", ")}`);
    }
    return provider;
  }

  setDefault(type: AIProviderType): void {
    if (!this.providers.has(type)) {
      throw new Error(`Cannot set default: provider '${type}' not registered`);
    }
    this.defaultProvider = type;
  }

  getAll(): IAIProvider[] {
    return [...this.providers.values()];
  }

  async getAvailable(): Promise<IAIProvider[]> {
    const checks = await Promise.all(
      this.getAll().map(async (p) => ({ provider: p, available: await p.isAvailable() }))
    );
    return checks.filter((c) => c.available).map((c) => c.provider);
  }

  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    try {
      return await this.get(request.provider).synthesize(request);
    } catch (err) {
      for (const provider of this.getAll()) {
        if (provider.type !== (request.provider ?? this.defaultProvider) && provider.supportedTasks().includes("tts")) {
          try {
            return await provider.synthesize({ ...request, provider: provider.type });
          } catch {
            continue;
          }
        }
      }
      throw err;
    }
  }

  async generate(request: LLMRequest): Promise<LLMResponse> {
    try {
      return await this.get(request.provider).generate(request);
    } catch (err) {
      for (const provider of this.getAll()) {
        if (provider.type !== (request.provider ?? this.defaultProvider) && provider.supportedTasks().includes("llm")) {
          try {
            return await provider.generate({ ...request, provider: provider.type });
          } catch {
            continue;
          }
        }
      }
      throw err;
    }
  }

  async analyzeImage(imageBase64: string, prompt: string): Promise<string> {
    for (const provider of this.getAll()) {
      if (provider.analyzeImage && provider.supportedTasks().includes("vision")) {
        try {
          return await provider.analyzeImage(imageBase64, prompt);
        } catch {
          continue;
        }
      }
    }
    throw new Error("No vision-capable AI provider available");
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    for (const provider of this.getAll()) {
      if (provider.translate) {
        try {
          return await provider.translate(text, from, to);
        } catch {
          continue;
        }
      }
    }
    const result = await this.generate({
      prompt: `Translate from ${from} to ${to}:\n${text}`,
      systemPrompt: "You are a professional translator. Return only the translation.",
      maxTokens: 4000,
      temperature: 0.2,
    });
    return result.text;
  }
}

let registry: AIProviderRegistry | null = null;

export function getProviderRegistry(): AIProviderRegistry {
  if (!registry) {
    registry = new AIProviderRegistry();
  }
  return registry;
}

export async function initializeProviders(
  configs: Array<{ type: AIProviderType; apiKey: string; accountId?: string }>
): Promise<AIProviderRegistry> {
  const reg = getProviderRegistry();
  for (const config of configs) {
    if (!config.apiKey) continue;
    switch (config.type) {
      case "cloudflare":
        if (config.accountId) {
          reg.register(new CloudflareAIProvider(config.apiKey, config.accountId));
        }
        break;
      case "nvidia":
        reg.register(new NvidiaNIMProvider(config.apiKey));
        break;
      case "gemini":
        reg.register(new GeminiAIProvider(config.apiKey));
        break;
    }
  }
  return reg;
}
