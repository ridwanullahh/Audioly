import { getDatabase, seedSystemVoices, seedPlans, seedFeatureFlags } from "@/db/database";
import { initializeProviders, AIProviderRegistry, getProviderRegistry } from "@/lib/ai-providers";
import * as SecureStore from "expo-secure-store";
import type { AIProviderType, Document, Project, AudioFile, Voice, VoiceClone, Notification as AppNotification, Bookmark, Playlist, UsageStats } from "@/types";

let initialized = false;

export async function initializeApp(): Promise<void> {
  if (initialized) return;
  const db = await getDatabase();
  await seedSystemVoices(db);
  await seedPlans(db);
  await seedFeatureFlags(db);

  const cfKey = await SecureStore.getItemAsync("cf_api_key");
  const cfAccount = await SecureStore.getItemAsync("cf_account_id");
  const nvKey = await SecureStore.getItemAsync("nv_api_key");
  const geminiKey = await SecureStore.getItemAsync("gemini_api_key");

  const configs: Array<{ type: AIProviderType; apiKey: string; accountId?: string }> = [];
  if (cfKey && cfAccount) configs.push({ type: "cloudflare", apiKey: cfKey, accountId: cfAccount });
  if (nvKey) configs.push({ type: "nvidia", apiKey: nvKey });
  if (geminiKey) configs.push({ type: "gemini", apiKey: geminiKey });

  await initializeProviders(configs);
  initialized = true;
}

export class DocumentService {
  static async create(doc: Partial<Document>): Promise<Document> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO documents (id, user_id, title, original_filename, file_type, file_size, status, document_type, language, word_count, estimated_duration, metadata, structure, content, file_path, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, doc.userId ?? "", doc.title ?? "Untitled", doc.originalFilename ?? "", doc.fileType ?? "txt", doc.fileSize ?? 0, "uploaded", doc.documentType ?? "other", doc.language ?? "en", doc.wordCount ?? 0, doc.estimatedDuration ?? 0, JSON.stringify(doc.metadata ?? {}), JSON.stringify(doc.structure ?? {}), doc.content ?? "", doc.filePath ?? "", now, now]
    );
    return { id, ...doc, status: "uploaded", createdAt: now, updatedAt: now } as Document;
  }

  static async getByUser(userId: string): Promise<Document[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM documents WHERE user_id = ? ORDER BY created_at DESC", [userId])) as any[];
  }

  static async getById(id: string): Promise<Document | null> {
    const db = await getDatabase();
    return (await db.getFirstAsync("SELECT * FROM documents WHERE id = ?", [id])) as any;
  }

  static async updateStatus(id: string, status: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE documents SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
  }

  static async update(id: string, updates: Partial<Document>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.title) { fields.push("title = ?"); values.push(updates.title); }
    if (updates.status) { fields.push("status = ?"); values.push(updates.status); }
    if (updates.documentType) { fields.push("document_type = ?"); values.push(updates.documentType); }
    if (updates.wordCount !== undefined) { fields.push("word_count = ?"); values.push(updates.wordCount); }
    if (updates.estimatedDuration !== undefined) { fields.push("estimated_duration = ?"); values.push(updates.estimatedDuration); }
    if (updates.content) { fields.push("content = ?"); values.push(updates.content); }
    if (updates.structure) { fields.push("structure = ?"); values.push(JSON.stringify(updates.structure)); }
    if (updates.metadata) { fields.push("metadata = ?"); values.push(JSON.stringify(updates.metadata)); }
    fields.push("updated_at = datetime('now')");
    values.push(id);
    await db.runAsync(`UPDATE documents SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM documents WHERE id = ?", [id]);
  }
}

export class ProjectService {
  static async create(project: Partial<Project>): Promise<Project> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO projects (id, user_id, name, document_id, status, narration_mode, voice_id, language, output_format, quality, narration_plan, progress, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, project.userId ?? "", project.name ?? "New Project", project.documentId ?? "", "draft", project.narrationMode ?? "straight", project.voiceId ?? "", project.language ?? "en", project.outputFormat ?? "mp3", project.quality ?? "128kbps", project.narrationPlan ? JSON.stringify(project.narrationPlan) : "", 0, now, now]
    );
    return { id, ...project, status: "draft", progress: 0, createdAt: now, updatedAt: now } as Project;
  }

  static async getByUser(userId: string): Promise<Project[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC", [userId])) as any[];
  }

  static async getById(id: string): Promise<Project | null> {
    const db = await getDatabase();
    return (await db.getFirstAsync("SELECT * FROM projects WHERE id = ?", [id])) as any;
  }

  static async updateStatus(id: string, status: string, progress?: number): Promise<void> {
    const db = await getDatabase();
    const fields = ["status = ?", "updated_at = datetime('now')"];
    const values: any[] = [status];
    if (progress !== undefined) { fields.push("progress = ?"); values.push(progress); }
    values.push(id);
    await db.runAsync(`UPDATE projects SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM projects WHERE id = ?", [id]);
  }
}

export class AudioService {
  static async create(audio: Partial<AudioFile>): Promise<AudioFile> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO audio_files (id, project_id, user_id, filename, format, quality, duration, file_size, file_path, cover_art, chapter_markers, metadata, is_downloaded, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, audio.projectId ?? "", audio.userId ?? "", audio.filename ?? "audio.mp3", audio.format ?? "mp3", audio.quality ?? "128kbps", audio.duration ?? 0, audio.fileSize ?? 0, audio.filePath ?? "", audio.coverArt ?? "", JSON.stringify(audio.chapterMarkers ?? []), JSON.stringify(audio.metadata ?? {}), 0, now]
    );
    return { id, ...audio, createdAt: now } as AudioFile;
  }

  static async getByUser(userId: string): Promise<AudioFile[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM audio_files WHERE user_id = ? ORDER BY created_at DESC", [userId])) as any[];
  }

  static async getByProject(projectId: string): Promise<AudioFile[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM audio_files WHERE project_id = ?", [projectId])) as any[];
  }

  static async getById(id: string): Promise<AudioFile | null> {
    const db = await getDatabase();
    return (await db.getFirstAsync("SELECT * FROM audio_files WHERE id = ?", [id])) as any;
  }

  static async getAll(): Promise<AudioFile[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM audio_files ORDER BY created_at DESC")) as any[];
  }

  static async save(audio: AudioFile): Promise<void> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync("SELECT 1 FROM audio_files WHERE id = ?", [audio.id]);
    if (existing) {
      await db.runAsync(
        `UPDATE audio_files SET filename = ?, duration = ?, file_size = ?, file_path = ?, is_downloaded = ?, updated_at = datetime('now') WHERE id = ?`,
        [audio.filename, audio.duration, audio.fileSize, audio.filePath, audio.isDownloaded ? 1 : 0, audio.id]
      );
    } else {
      await db.runAsync(
        `INSERT INTO audio_files (id, project_id, user_id, filename, format, quality, duration, file_size, file_path, cover_art, chapter_markers, metadata, is_downloaded, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [audio.id, audio.projectId ?? "", audio.userId ?? "", audio.filename, audio.format ?? "mp3", audio.quality ?? "128kbps", audio.duration, audio.fileSize, audio.filePath, audio.coverArt ?? "", JSON.stringify(audio.chapterMarkers ?? []), JSON.stringify(audio.metadata ?? {}), audio.isDownloaded ? 1 : 0, audio.createdAt ?? new Date().toISOString()]
      );
    }
  }

  static async update(id: string, updates: Partial<AudioFile>): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = [];
    const values: any[] = [];
    if (updates.filename) { fields.push("filename = ?"); values.push(updates.filename); }
    if (updates.duration !== undefined) { fields.push("duration = ?"); values.push(updates.duration); }
    if (updates.fileSize !== undefined) { fields.push("file_size = ?"); values.push(updates.fileSize); }
    if (updates.filePath !== undefined) { fields.push("file_path = ?"); values.push(updates.filePath); }
    if (updates.isDownloaded !== undefined) { fields.push("is_downloaded = ?"); values.push(updates.isDownloaded ? 1 : 0); }
    if (updates.chapterMarkers) { fields.push("chapter_markers = ?"); values.push(JSON.stringify(updates.chapterMarkers)); }
    if (updates.metadata) { fields.push("metadata = ?"); values.push(JSON.stringify(updates.metadata)); }
    if (updates.coverArt) { fields.push("cover_art = ?"); values.push(updates.coverArt); }
    if (fields.length === 0) return;
    values.push(id);
    await db.runAsync(`UPDATE audio_files SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM audio_files WHERE id = ?", [id]);
  }
}

export class PlanService {
  static async getAll(): Promise<any[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM plans ORDER BY price")) as any[];
  }

  static async getById(id: string): Promise<any> {
    const db = await getDatabase();
    return (await db.getFirstAsync("SELECT * FROM plans WHERE id = ?", [id])) as any;
  }
}

export class VoiceService {
  static async getAll(): Promise<Voice[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM voices WHERE is_active = 1 ORDER BY name")) as any[];
  }

  static async getById(id: string): Promise<Voice | null> {
    const db = await getDatabase();
    return (await db.getFirstAsync("SELECT * FROM voices WHERE id = ?", [id])) as any;
  }

  static async filter(filters: { gender?: string; language?: string; tone?: string; category?: string }): Promise<Voice[]> {
    const db = await getDatabase();
    const conditions: string[] = ["is_active = 1"];
    const values: any[] = [];
    if (filters.gender) { conditions.push("gender = ?"); values.push(filters.gender); }
    if (filters.language) { conditions.push("language_code LIKE ?"); values.push(`${filters.language}%`); }
    if (filters.tone) { conditions.push("tone = ?"); values.push(filters.tone); }
    if (filters.category) { conditions.push("category = ?"); values.push(filters.category); }
    return (await db.getAllAsync(`SELECT * FROM voices WHERE ${conditions.join(" AND ")} ORDER BY name`, values)) as any[];
  }

  static async toggleFavorite(userId: string, voiceId: string): Promise<boolean> {
    const db = await getDatabase();
    const existing = await db.getFirstAsync("SELECT 1 FROM user_favorite_voices WHERE user_id = ? AND voice_id = ?", [userId, voiceId]);
    if (existing) {
      await db.runAsync("DELETE FROM user_favorite_voices WHERE user_id = ? AND voice_id = ?", [userId, voiceId]);
      return false;
    } else {
      await db.runAsync("INSERT INTO user_favorite_voices (user_id, voice_id) VALUES (?, ?)", [userId, voiceId]);
      return true;
    }
  }

  static async getFavorites(userId: string): Promise<Voice[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT v.* FROM voices v INNER JOIN user_favorite_voices f ON v.id = f.voice_id WHERE f.user_id = ?", [userId])) as any[];
  }
}

export class VoiceCloneService {
  static async create(clone: Partial<VoiceClone>): Promise<VoiceClone> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO voice_clones (id, user_id, name, quality_score, sample_count, language, is_training, consent_given, is_shared, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, clone.userId ?? "", clone.name ?? "My Voice", "fair", 0, clone.language ?? "en", 1, clone.consentGiven ? 1 : 0, 0, now, now]
    );
    return { id, ...clone, qualityScore: "fair", isTraining: true, createdAt: now, updatedAt: now } as VoiceClone;
  }

  static async getByUser(userId: string): Promise<VoiceClone[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM voice_clones WHERE user_id = ? ORDER BY created_at DESC", [userId])) as any[];
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM voice_clones WHERE id = ?", [id]);
  }
}

export class PlaylistService {
  static async create(playlist: Partial<Playlist>): Promise<Playlist> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO playlists (id, user_id, name, description, audio_ids, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, playlist.userId ?? "", playlist.name ?? "New Playlist", playlist.description ?? "", JSON.stringify(playlist.audioIds ?? []), 0, now, now]
    );
    return { id, ...playlist, audioIds: playlist.audioIds ?? [], isPublic: false, createdAt: now, updatedAt: now } as Playlist;
  }

  static async getByUser(userId: string): Promise<Playlist[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM playlists WHERE user_id = ? ORDER BY created_at DESC", [userId])) as any[];
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM playlists WHERE id = ?", [id]);
  }
}

export class BookmarkService {
  static async create(bookmark: Partial<Bookmark>): Promise<Bookmark> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO bookmarks (id, audio_id, user_id, timestamp, note, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, bookmark.audioId ?? "", bookmark.userId ?? "", bookmark.timestamp ?? 0, bookmark.note ?? "", now]
    );
    return { id, ...bookmark, createdAt: now } as Bookmark;
  }

  static async getByAudio(audioId: string): Promise<Bookmark[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM bookmarks WHERE audio_id = ? ORDER BY timestamp", [audioId])) as any[];
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM bookmarks WHERE id = ?", [id]);
  }
}

export class NotificationService {
  static async create(notif: Partial<AppNotification>): Promise<AppNotification> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO notifications (id, user_id, title, message, type, is_read, data, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, notif.userId ?? "", notif.title ?? "", notif.message ?? "", notif.type ?? "system", 0, JSON.stringify(notif.data ?? {}), now]
    );
    return { id, ...notif, isRead: false, createdAt: now } as AppNotification;
  }

  static async getByUser(userId: string): Promise<AppNotification[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50", [userId])) as any[];
  }

  static async markRead(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
  }

  static async getUnreadCount(userId: string): Promise<number> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0", [userId]);
    return row?.count ?? 0;
  }
}

export class UsageService {
  static async log(userId: string, action: string, characters = 0, audioSeconds = 0, provider?: string, model?: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `INSERT INTO usage_logs (id, user_id, action, characters, audio_seconds, provider, model, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [crypto.randomUUID(), userId, action, characters, audioSeconds, provider ?? "", model ?? ""]
    );
  }

  static async getByUser(userId: string): Promise<UsageStats> {
    const periodStart = new Date();
    periodStart.setDate(1);
    return UsageService.getStats(userId, periodStart.toISOString());
  }

  static async getStats(userId: string, periodStart: string): Promise<UsageStats> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ chars: number; secs: number }>(
      `SELECT COALESCE(SUM(characters), 0) as chars, COALESCE(SUM(audio_seconds), 0) as secs FROM usage_logs WHERE user_id = ? AND created_at >= ?`,
      [userId, periodStart]
    );
    return {
      charactersProcessed: row?.chars ?? 0,
      audioMinutesGenerated: Math.ceil((row?.secs ?? 0) / 60),
      storageUsed: 0,
      apiCalls: 0,
      cloneSlotsUsed: 0,
      periodStart,
      periodEnd: new Date().toISOString(),
    };
  }
}

export class ProviderConfigService {
  static async saveConfig(type: AIProviderType, apiKey: string, accountId?: string): Promise<void> {
    const db = await getDatabase();
    const id = type;
    const nameMap: Record<string, string> = {
      cloudflare: "Cloudflare Workers AI",
      nvidia: "NVIDIA NIM",
      gemini: "Google Gemini",
      custom: "Custom Provider",
    };
    const baseUrl = type === "cloudflare"
      ? `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run`
      : type === "gemini"
        ? "https://generativelanguage.googleapis.com/v1beta/models"
        : "https://integrate.api.nvidia.com/v1";
    const taskMap: Record<string, string> = {
      cloudflare: '["tts","llm","translation","embedding"]',
      nvidia: '["tts","llm","embedding"]',
      gemini: '["llm","translation","vision","image","ocr"]',
      custom: '["llm"]',
    };

    await db.runAsync(
      `INSERT OR REPLACE INTO ai_provider_configs (id, type, name, api_key, base_url, account_id, is_enabled, supported_tasks, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))`,
      [id, type, nameMap[type] ?? type, apiKey, baseUrl, accountId ?? "", taskMap[type] ?? '["llm"]']
    );
    const storeKeyMap: Record<string, string> = { cloudflare: "cf", nvidia: "nv", gemini: "gemini", custom: "custom" };
    await SecureStore.setItemAsync(`${storeKeyMap[type] ?? type}_api_key`, apiKey);
    if (accountId) await SecureStore.setItemAsync("cf_account_id", accountId);
  }

  static async getConfigs(): Promise<Array<{ type: AIProviderType; apiKey: string; accountId?: string }>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync("SELECT * FROM ai_provider_configs WHERE is_enabled = 1") as any[];
    return rows.map((r: any) => ({ type: r.type as AIProviderType, apiKey: r.api_key, accountId: r.account_id }));
  }
}
