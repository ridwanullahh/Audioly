import * as SQLite from "expo-sqlite";

const DB_NAME = "audioly.db";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeSchema(db);
  }
  return db;
}

async function initializeSchema(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT,
      role TEXT NOT NULL DEFAULT 'free',
      plan_id TEXT DEFAULT 'free',
      password_hash TEXT NOT NULL,
      preferences TEXT DEFAULT '{}',
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT,
      title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'uploaded',
      document_type TEXT DEFAULT 'other',
      language TEXT DEFAULT 'en',
      word_count INTEGER DEFAULT 0,
      estimated_duration REAL DEFAULT 0,
      metadata TEXT DEFAULT '{}',
      structure TEXT DEFAULT '{}',
      content TEXT DEFAULT '',
      file_path TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      document_id TEXT REFERENCES documents(id) ON DELETE SET NULL,
      status TEXT NOT NULL DEFAULT 'draft',
      narration_mode TEXT NOT NULL DEFAULT 'straight',
      voice_id TEXT,
      language TEXT DEFAULT 'en',
      output_format TEXT DEFAULT 'mp3',
      quality TEXT DEFAULT '128kbps',
      narration_plan TEXT,
      progress REAL DEFAULT 0,
      settings TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audio_files (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      filename TEXT NOT NULL,
      format TEXT NOT NULL DEFAULT 'mp3',
      quality TEXT DEFAULT '128kbps',
      duration REAL DEFAULT 0,
      file_size INTEGER DEFAULT 0,
      file_path TEXT NOT NULL,
      cover_art TEXT,
      chapter_markers TEXT DEFAULT '[]',
      metadata TEXT DEFAULT '{}',
      is_downloaded INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS voices (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      gender TEXT NOT NULL,
      accent TEXT DEFAULT '',
      language TEXT NOT NULL,
      language_code TEXT NOT NULL,
      tone TEXT DEFAULT 'warm',
      category TEXT DEFAULT 'narration',
      provider TEXT NOT NULL,
      provider_model_id TEXT NOT NULL,
      sample_url TEXT,
      is_system INTEGER DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS voice_clones (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      quality_score TEXT DEFAULT 'fair',
      sample_count INTEGER DEFAULT 0,
      language TEXT DEFAULT 'en',
      is_training INTEGER DEFAULT 0,
      consent_given INTEGER DEFAULT 0,
      is_shared INTEGER DEFAULT 0,
      model_data TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_favorite_voices (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      voice_id TEXT NOT NULL REFERENCES voices(id) ON DELETE CASCADE,
      PRIMARY KEY (user_id, voice_id)
    );

    CREATE TABLE IF NOT EXISTS playlists (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      audio_ids TEXT DEFAULT '[]',
      is_public INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookmarks (
      id TEXT PRIMARY KEY,
      audio_id TEXT NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      timestamp REAL NOT NULL,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT DEFAULT 'system',
      is_read INTEGER DEFAULT 0,
      data TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_provider_configs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      name TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT NOT NULL,
      account_id TEXT,
      is_enabled INTEGER DEFAULT 1,
      supported_tasks TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      provider_id TEXT NOT NULL REFERENCES ai_provider_configs(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      task_type TEXT NOT NULL,
      model_id TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      cost_per_unit REAL DEFAULT 0,
      unit TEXT DEFAULT 'character'
    );

    CREATE TABLE IF NOT EXISTS api_keys (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      key_hash TEXT NOT NULL,
      permissions TEXT DEFAULT '[]',
      last_used TEXT,
      expires_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      audio_id TEXT NOT NULL REFERENCES audio_files(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      password_hash TEXT,
      expires_at TEXT,
      view_count INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS webhooks (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      url TEXT NOT NULL,
      events TEXT DEFAULT '[]',
      secret TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS usage_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      characters INTEGER DEFAULT 0,
      audio_seconds REAL DEFAULT 0,
      provider TEXT,
      model TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pronunciation_dictionary (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      word TEXT NOT NULL,
      phonetic TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      admin_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      target_type TEXT,
      target_id TEXT,
      details TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);
    CREATE INDEX IF NOT EXISTS idx_documents_project ON documents(project_id);
    CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);
    CREATE INDEX IF NOT EXISTS idx_audio_user ON audio_files(user_id);
    CREATE INDEX IF NOT EXISTS idx_audio_project ON audio_files(project_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);
    CREATE INDEX IF NOT EXISTS idx_usage_user ON usage_logs(user_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_voice_clones_user ON voice_clones(user_id);

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      parent_id TEXT,
      audio_ids TEXT DEFAULT '[]',
      color TEXT DEFAULT '#3B82F6',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS feature_flags (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT DEFAULT '',
      is_enabled INTEGER DEFAULT 1,
      applies_to TEXT DEFAULT '["free","pro","business","admin"]',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blog_posts (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      excerpt TEXT DEFAULT '',
      cover_image TEXT,
      author_id TEXT REFERENCES users(id),
      is_published INTEGER DEFAULT 0,
      published_at TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS docs_pages (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      content TEXT DEFAULT '',
      excerpt TEXT DEFAULT '',
      author_id TEXT REFERENCES users(id),
      is_published INTEGER DEFAULT 0,
      published_at TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS support_tickets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      subject TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      priority TEXT DEFAULT 'medium',
      assigned_to TEXT,
      response TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referral_codes (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      code TEXT UNIQUE NOT NULL,
      uses_count INTEGER DEFAULT 0,
      credits_earned INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_feedback (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      audio_id TEXT REFERENCES audio_files(id) ON DELETE CASCADE,
      rating INTEGER DEFAULT 3,
      section_index INTEGER,
      comment TEXT,
      is_resolved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS trash_items (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      item_type TEXT NOT NULL,
      item_id TEXT NOT NULL,
      item_name TEXT DEFAULT '',
      deleted_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS crash_logs (
      id TEXT PRIMARY KEY,
      message TEXT NOT NULL,
      stack TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_folders_user ON folders(user_id);
    CREATE INDEX IF NOT EXISTS idx_trash_user ON trash_items(user_id, expires_at);
    CREATE INDEX IF NOT EXISTS idx_feedback_project ON user_feedback(project_id);
    CREATE INDEX IF NOT EXISTS idx_tickets_user ON support_tickets(user_id);
  `);
}

export async function seedSystemVoices(database: SQLite.SQLiteDatabase) {
  const existing = await database.getFirstAsync<{ count: number }>(
    "SELECT COUNT(*) as count FROM voices WHERE is_system = 1"
  );
  if (existing && existing.count > 0) return;

  const systemVoices = [
    { id: "v1", name: "Aria", gender: "female", accent: "American", language: "English", languageCode: "en-US", tone: "warm", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v2", name: "James", gender: "male", accent: "American", language: "English", languageCode: "en-US", tone: "authoritative", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v3", name: "Sofia", gender: "female", accent: "British", language: "English", languageCode: "en-GB", tone: "formal", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v4", name: "Oliver", gender: "male", accent: "British", language: "English", languageCode: "en-GB", tone: "calm", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v5", name: "Amara", gender: "female", accent: "Nigerian", language: "English", languageCode: "en-NG", tone: "energetic", category: "conversational", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v6", name: "Kofi", gender: "male", accent: "Nigerian", language: "English", languageCode: "en-NG", tone: "warm", category: "conversational", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v7", name: "Fatima", gender: "female", accent: "Arabic", language: "Arabic", languageCode: "ar-SA", tone: "calm", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v8", name: "Ahmad", gender: "male", accent: "Arabic", language: "Arabic", languageCode: "ar-SA", tone: "formal", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v9", name: "Marie", gender: "female", accent: "French", language: "French", languageCode: "fr-FR", tone: "warm", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v10", name: "Pierre", gender: "male", accent: "French", language: "French", languageCode: "fr-FR", tone: "authoritative", category: "narration", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v11", name: "Lucia", gender: "female", accent: "Spanish", language: "Spanish", languageCode: "es-ES", tone: "energetic", category: "conversational", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v12", name: "Priya", gender: "female", accent: "Indian", language: "English", languageCode: "en-IN", tone: "warm", category: "narration", provider: "nvidia", modelId: "nvidia/tts-fastpitch" },
    { id: "v13", name: "Raj", gender: "male", accent: "Indian", language: "English", languageCode: "en-IN", tone: "calm", category: "narration", provider: "nvidia", modelId: "nvidia/tts-fastpitch" },
    { id: "v14", name: "Aisha", gender: "female", accent: "Swahili", language: "Swahili", languageCode: "sw-KE", tone: "warm", category: "conversational", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v15", name: "Zara", gender: "female", accent: "Australian", language: "English", languageCode: "en-AU", tone: "energetic", category: "character", provider: "cloudflare", modelId: "@cf/myshell-ai/melotts" },
    { id: "v16", name: "Chen", gender: "male", accent: "Neutral", language: "English", languageCode: "en-US", tone: "calm", category: "character", provider: "nvidia", modelId: "nvidia/tts-fastpitch" },
  ];

  for (const v of systemVoices) {
    await database.runAsync(
      `INSERT OR IGNORE INTO voices (id, name, gender, accent, language, language_code, tone, category, provider, provider_model_id, is_system)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [v.id, v.name, v.gender, v.accent, v.language, v.languageCode, v.tone, v.category, v.provider, v.modelId]
    );
  }
}

export async function seedPlans(database: SQLite.SQLiteDatabase) {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS plans (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tier TEXT NOT NULL,
      character_limit INTEGER NOT NULL,
      audio_minute_limit INTEGER NOT NULL,
      storage_limit INTEGER NOT NULL,
      clone_slots INTEGER DEFAULT 0,
      price REAL DEFAULT 0,
      features TEXT DEFAULT '[]'
    );

    INSERT OR IGNORE INTO plans VALUES
      ('free', 'Free Listener', 'free', 50000, 30, 500, 0, 0, '["System voices", "MP3 output", "Basic player"]'),
      ('pro', 'Pro Creator', 'pro', 500000, 300, 10000, 3, 19.99, '["All voices", "Voice cloning", "All formats", "Multi-voice narration", "Priority processing"]'),
      ('business', 'Business', 'business', 2000000, 1200, 50000, 10, 49.99, '["Everything in Pro", "Team workspace", "API access", "Custom branding", "Webhooks", "Dedicated support"]');
  `);
}

export async function seedFeatureFlags(database: SQLite.SQLiteDatabase) {
  const existing = await database.getFirstAsync<{ count: number }>("SELECT COUNT(*) as count FROM feature_flags");
  if (existing && existing.count > 0) return;

  const flags = [
    { name: "voice_cloning", desc: "Enable voice cloning feature for users" },
    { name: "podcast_mode", desc: "Enable podcast-style dialogue narration" },
    { name: "multi_voice", desc: "Enable multi-voice narration per document" },
    { name: "background_audio", desc: "Enable background ambient sounds" },
    { name: "sharing", desc: "Enable sharing and publishing features" },
    { name: "api_access", desc: "Enable developer API key generation" },
    { name: "webhooks", desc: "Enable webhook integrations" },
    { name: "rss_feed", desc: "Enable podcast RSS feed generation" },
    { name: "offline_mode", desc: "Enable offline download and playback" },
    { name: "ai_agent", desc: "Enable AI agent proactive suggestions" },
    { name: "referral_program", desc: "Enable referral program" },
    { name: "dark_mode", desc: "Enable dark mode theme" },
    { name: "beta_features", desc: "Enable experimental beta features" },
  ];

  for (const f of flags) {
    await database.runAsync(
      "INSERT OR IGNORE INTO feature_flags (id, name, description, is_enabled) VALUES (?, ?, ?, ?)",
      [`ff_${f.name}`, f.name, f.desc, f.name === "dark_mode" || f.name === "sharing" || f.name === "offline_mode" ? 1 : 0]
    );
  }
}

export async function resetDatabase(): Promise<void> {
  if (db) {
    await db.execAsync(`
      DROP TABLE IF EXISTS audit_logs;
      DROP TABLE IF EXISTS pronunciation_dictionary;
      DROP TABLE IF EXISTS usage_logs;
      DROP TABLE IF EXISTS webhooks;
      DROP TABLE IF EXISTS share_links;
      DROP TABLE IF EXISTS api_keys;
      DROP TABLE IF EXISTS ai_models;
      DROP TABLE IF EXISTS ai_provider_configs;
      DROP TABLE IF EXISTS notifications;
      DROP TABLE IF EXISTS bookmarks;
      DROP TABLE IF EXISTS playlists;
      DROP TABLE IF EXISTS user_favorite_voices;
      DROP TABLE IF EXISTS voice_clones;
      DROP TABLE IF EXISTS voices;
      DROP TABLE IF EXISTS audio_files;
      DROP TABLE IF EXISTS projects;
      DROP TABLE IF EXISTS documents;
      DROP TABLE IF EXISTS plans;
      DROP TABLE IF EXISTS users;
    `);
    await initializeSchema(db);
  }
}
