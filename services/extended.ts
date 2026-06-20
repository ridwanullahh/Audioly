import { getDatabase } from "@/db/database";
import type { Folder, ShareLink, Webhook, FeatureFlag, BlogPost, SupportTicket, ReferralCode, UserFeedback, PronunciationEntry, TranscriptSegment } from "@/types";

export class FolderService {
  static async create(folder: Partial<Folder>): Promise<Folder> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO folders (id, user_id, name, parent_id, audio_ids, color, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, folder.userId ?? "", folder.name ?? "New Folder", folder.parentId ?? "", JSON.stringify(folder.audioIds ?? []), folder.color ?? "#3B82F6", now, now]
    );
    return { id, ...folder, audioIds: folder.audioIds ?? [], color: folder.color ?? "#3B82F6", createdAt: now, updatedAt: now } as Folder;
  }

  static async getByUser(userId: string): Promise<Folder[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM folders WHERE user_id = ? ORDER BY name", [userId])) as any[];
  }

  static async addAudio(folderId: string, audioId: string): Promise<void> {
    const db = await getDatabase();
    const folder = await db.getFirstAsync<any>("SELECT audio_ids FROM folders WHERE id = ?", [folderId]);
    if (!folder) return;
    const ids = JSON.parse(folder.audio_ids || "[]");
    if (!ids.includes(audioId)) {
      ids.push(audioId);
      await db.runAsync("UPDATE folders SET audio_ids = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify(ids), folderId]);
    }
  }

  static async removeAudio(folderId: string, audioId: string): Promise<void> {
    const db = await getDatabase();
    const folder = await db.getFirstAsync<any>("SELECT audio_ids FROM folders WHERE id = ?", [folderId]);
    if (!folder) return;
    const ids = JSON.parse(folder.audio_ids || "[]").filter((id: string) => id !== audioId);
    await db.runAsync("UPDATE folders SET audio_ids = ?, updated_at = datetime('now') WHERE id = ?", [JSON.stringify(ids), folderId]);
  }

  static async rename(id: string, name: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE folders SET name = ?, updated_at = datetime('now') WHERE id = ?", [name, id]);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM folders WHERE id = ?", [id]);
  }
}

export class ShareService {
  static async createLink(audioId: string, userId: string, options: { password?: string; expiresAt?: string } = {}): Promise<ShareLink> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const token = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO share_links (id, audio_id, user_id, token, password_hash, expires_at, view_count, is_active, created_at) VALUES (?, ?, ?, ?, ?, ?, 0, 1, ?)`,
      [id, audioId, userId, token, options.password ?? "", options.expiresAt ?? "", now]
    );
    return { id, audioId, userId, token, password: options.password, expiresAt: options.expiresAt, viewCount: 0, isActive: true, createdAt: now };
  }

  static async getByUser(userId: string): Promise<ShareLink[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM share_links WHERE user_id = ? ORDER BY created_at DESC", [userId])) as any[];
  }

  static async incrementView(token: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE share_links SET view_count = view_count + 1 WHERE token = ?", [token]);
  }

  static async deactivate(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE share_links SET is_active = 0 WHERE id = ?", [id]);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM share_links WHERE id = ?", [id]);
  }

  static generateRSS(userId: string, audioItems: Array<{ title: string; description: string; audioUrl: string; duration: number; pubDate: string }>): string {
    const items = audioItems.map((item) => `
    <item>
      <title>${escapeXml(item.title)}</title>
      <description>${escapeXml(item.description)}</description>
      <enclosure url="${item.audioUrl}" type="audio/mpeg" />
      <itunes:duration>${Math.floor(item.duration)}</itunes:duration>
      <pubDate>${item.pubDate}</pubDate>
    </item>`).join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>Audioly Library</title>
    <description>Personal audiobook library from Audioly</description>
    <language>en</language>
    ${items}
  </channel>
</rss>`;
  }

  static generateEmbedCode(token: string, width = 400, height = 120): string {
    return `<iframe src="https://audioly.app/embed/${token}" width="${width}" height="${height}" frameborder="0" allow="autoplay" style="border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,0.1)"></iframe>`;
  }
}

function escapeXml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export class WebhookService {
  static async create(webhook: Partial<Webhook>): Promise<Webhook> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const secret = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO webhooks (id, user_id, url, events, secret, is_active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)`,
      [id, webhook.userId ?? "", webhook.url ?? "", JSON.stringify(webhook.events ?? []), secret, now]
    );
    return { id, ...webhook, events: webhook.events ?? [], secret, isActive: true, createdAt: now } as Webhook;
  }

  static async getByUser(userId: string): Promise<Webhook[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM webhooks WHERE user_id = ?", [userId])) as any[];
  }

  static async toggle(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE webhooks SET is_active = NOT is_active WHERE id = ?", [id]);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM webhooks WHERE id = ?", [id]);
  }
}

export class FeedbackService {
  static async create(feedback: Partial<UserFeedback>): Promise<UserFeedback> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO user_feedback (id, user_id, project_id, audio_id, rating, section_id, comment, is_resolved, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)`,
      [id, feedback.userId ?? "", feedback.projectId ?? "", feedback.audioId ?? "", feedback.rating ?? 3, feedback.sectionId ?? "", feedback.comment ?? "", now]
    );
    return { id, ...feedback, isResolved: false, createdAt: now } as UserFeedback;
  }

  static async getByProject(projectId: string): Promise<UserFeedback[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM user_feedback WHERE project_id = ? ORDER BY created_at DESC", [projectId])) as any[];
  }

  static async resolve(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE user_feedback SET is_resolved = 1 WHERE id = ?", [id]);
  }
}

export class PronunciationService {
  static async add(entry: Partial<PronunciationEntry>): Promise<PronunciationEntry> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO pronunciation_dictionary (id, user_id, word, phonetic, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, entry.userId ?? "", (entry.word ?? "").toLowerCase(), entry.phonetic ?? "", now]
    );
    return { id, ...entry, createdAt: now } as PronunciationEntry;
  }

  static async getByUser(userId: string): Promise<PronunciationEntry[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM pronunciation_dictionary WHERE user_id = ? ORDER BY word", [userId])) as any[];
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM pronunciation_dictionary WHERE id = ?", [id]);
  }

  static applyPronunciations(text: string, entries: PronunciationEntry[]): string {
    let result = text;
    for (const entry of entries) {
      const regex = new RegExp(`\\b${entry.word}\\b`, "gi");
      result = result.replace(regex, entry.phonetic);
    }
    return result;
  }
}

export class FeatureFlagService {
  static async getAll(): Promise<FeatureFlag[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM feature_flags ORDER BY name")) as any[];
  }

  static async toggle(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE feature_flags SET is_enabled = NOT is_enabled, updated_at = datetime('now') WHERE id = ?", [id]);
  }

  static async isEnabled(name: string): Promise<boolean> {
    const db = await getDatabase();
    const flag = await db.getFirstAsync<any>("SELECT is_enabled FROM feature_flags WHERE name = ?", [name]);
    return flag?.is_enabled === 1;
  }
}

export class BlogService {
  static async create(post: Partial<BlogPost>): Promise<BlogPost> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = (post.title ?? "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await db.runAsync(
      `INSERT INTO blog_posts (id, title, slug, content, excerpt, cover_image, author_id, is_published, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, post.title ?? "", slug, post.content ?? "", post.excerpt ?? "", post.coverImage ?? "", post.authorId ?? "", 0, JSON.stringify(post.tags ?? []), now, now]
    );
    return { id, ...post, slug, isPublished: false, tags: post.tags ?? [], createdAt: now, updatedAt: now } as BlogPost;
  }

  static async getAll(publishedOnly = false): Promise<BlogPost[]> {
    const db = await getDatabase();
    const query = publishedOnly ? "SELECT * FROM blog_posts WHERE is_published = 1 ORDER BY created_at DESC" : "SELECT * FROM blog_posts ORDER BY created_at DESC";
    return (await db.getAllAsync(query)) as any[];
  }

  static async publish(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE blog_posts SET is_published = 1, published_at = datetime('now'), updated_at = datetime('now') WHERE id = ?", [id]);
  }

  static async unpublish(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE blog_posts SET is_published = 0, updated_at = datetime('now') WHERE id = ?", [id]);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM blog_posts WHERE id = ?", [id]);
  }
}

export class DocsService {
  static async create(doc: Partial<BlogPost>): Promise<BlogPost> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const slug = (doc.title ?? "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    await db.runAsync(
      `INSERT INTO docs_pages (id, title, slug, content, excerpt, author_id, is_published, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, doc.title ?? "", slug, doc.content ?? "", doc.excerpt ?? "", doc.authorId ?? "", 0, JSON.stringify(doc.tags ?? []), now, now]
    );
    return { id, ...doc, slug, isPublished: false, tags: doc.tags ?? [], createdAt: now, updatedAt: now } as BlogPost;
  }

  static async getAll(): Promise<BlogPost[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM docs_pages ORDER BY title")) as any[];
  }

  static async publish(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE docs_pages SET is_published = 1, published_at = datetime('now') WHERE id = ?", [id]);
  }

  static async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM docs_pages WHERE id = ?", [id]);
  }
}

export class TicketService {
  static async create(ticket: Partial<SupportTicket>): Promise<SupportTicket> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO support_tickets (id, user_id, subject, message, status, priority, created_at, updated_at) VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`,
      [id, ticket.userId ?? "", ticket.subject ?? "", ticket.message ?? "", ticket.priority ?? "medium", now, now]
    );
    return { id, ...ticket, status: "open", createdAt: now, updatedAt: now } as SupportTicket;
  }

  static async getByUser(userId: string): Promise<SupportTicket[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM support_tickets WHERE user_id = ? ORDER BY created_at DESC", [userId])) as any[];
  }

  static async getAll(): Promise<SupportTicket[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM support_tickets ORDER BY created_at DESC LIMIT 100")) as any[];
  }

  static async updateStatus(id: string, status: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("UPDATE support_tickets SET status = ?, updated_at = datetime('now') WHERE id = ?", [status, id]);
  }
}

export class ReferralService {
  static async generate(userId: string): Promise<ReferralCode> {
    const db = await getDatabase();
    const id = crypto.randomUUID();
    const code = "AUD" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO referral_codes (id, user_id, code, uses_count, credits_earned, is_active, created_at) VALUES (?, ?, ?, 0, 0, 1, ?)`,
      [id, userId, code, now]
    );
    return { id, userId, code, usesCount: 0, creditsEarned: 0, isActive: true, createdAt: now };
  }

  static async getByUser(userId: string): Promise<ReferralCode | null> {
    const db = await getDatabase();
    return (await db.getFirstAsync("SELECT * FROM referral_codes WHERE user_id = ? AND is_active = 1", [userId])) as any;
  }

  static async redeem(code: string): Promise<boolean> {
    const db = await getDatabase();
    const ref = await db.getFirstAsync<any>("SELECT * FROM referral_codes WHERE code = ? AND is_active = 1", [code]);
    if (!ref) return false;
    await db.runAsync("UPDATE referral_codes SET uses_count = uses_count + 1, credits_earned = credits_earned + 100 WHERE id = ?", [ref.id]);
    return true;
  }
}

export class EncryptionService {
  static async encrypt(text: string, key: string): Promise<string> {
    const encoded = new TextEncoder().encode(text);
    const keyData = new TextEncoder().encode(key.padEnd(32, "0").slice(0, 32));
    const result = new Uint8Array(encoded.length);
    for (let i = 0; i < encoded.length; i++) {
      result[i] = encoded[i] ^ keyData[i % keyData.length];
    }
    return btoa(String.fromCharCode(...result));
  }

  static async decrypt(encrypted: string, key: string): Promise<string> {
    const decoded = Uint8Array.from(atob(encrypted), (c) => c.charCodeAt(0));
    const keyData = new TextEncoder().encode(key.padEnd(32, "0").slice(0, 32));
    const result = new Uint8Array(decoded.length);
    for (let i = 0; i < decoded.length; i++) {
      result[i] = decoded[i] ^ keyData[i % keyData.length];
    }
    return new TextDecoder().decode(result);
  }
}

export class TrashService {
  static async moveToTrash(userId: string, itemType: string, itemId: string): Promise<void> {
    const db = await getDatabase();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await db.runAsync(
      `INSERT INTO trash_items (id, user_id, item_type, item_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`,
      [crypto.randomUUID(), userId, itemType, itemId, expiresAt]
    );
  }

  static async getByUser(userId: string): Promise<any[]> {
    const db = await getDatabase();
    return (await db.getAllAsync("SELECT * FROM trash_items WHERE user_id = ? AND expires_at > datetime('now') ORDER BY created_at DESC", [userId])) as any[];
  }

  static async restore(id: string): Promise<any> {
    const db = await getDatabase();
    const item = await db.getFirstAsync<any>("SELECT * FROM trash_items WHERE id = ?", [id]);
    if (item) await db.runAsync("DELETE FROM trash_items WHERE id = ?", [id]);
    return item;
  }

  static async permanentDelete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM trash_items WHERE id = ?", [id]);
  }

  static async cleanupExpired(): Promise<void> {
    const db = await getDatabase();
    await db.runAsync("DELETE FROM trash_items WHERE expires_at < datetime('now')");
  }
}
