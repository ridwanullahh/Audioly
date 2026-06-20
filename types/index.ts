export type UserRole = "free" | "pro" | "business" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  planId: string;
  createdAt: string;
  updatedAt: string;
  preferences: UserPreferences;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  defaultVoiceId?: string;
  playbackSpeed: number;
  notifications: boolean;
}

export type DocumentStatus = "uploaded" | "parsing" | "parsed" | "error";
export type DocumentType =
  | "academic"
  | "novel"
  | "report"
  | "legal"
  | "blog"
  | "manual"
  | "textbook"
  | "presentation"
  | "news"
  | "other";

export interface Document {
  id: string;
  userId: string;
  projectId?: string;
  title: string;
  originalFilename: string;
  fileType: string;
  fileSize: number;
  status: DocumentStatus;
  documentType: DocumentType;
  language: string;
  wordCount: number;
  estimatedDuration: number;
  metadata: DocumentMetadata;
  structure: DocumentStructure;
  content: string;
  filePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMetadata {
  author?: string;
  pageCount?: number;
  description?: string;
  tags: string[];
}

export interface DocumentStructure {
  chapters: Chapter[];
  frontMatter: string[];
  backMatter: string[];
  hasTableOfContents: boolean;
  hasFootnotes: boolean;
  hasCitations: boolean;
}

export interface Chapter {
  id: string;
  title: string;
  level: number;
  startIndex: number;
  endIndex: number;
  wordCount: number;
  content: string;
}

export type ProjectStatus = "draft" | "processing" | "completed" | "archived" | "error";
export type NarrationMode =
  | "straight"
  | "multi-voice"
  | "podcast"
  | "summary"
  | "chapter-by-chapter"
  | "highlight"
  | "speed-read";

export interface Project {
  id: string;
  userId: string;
  name: string;
  documentId: string;
  status: ProjectStatus;
  narrationMode: NarrationMode;
  voiceId: string;
  language: string;
  outputFormat: AudioFormat;
  quality: AudioQuality;
  narrationPlan?: NarrationPlan;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface NarrationPlan {
  sections: NarrationSection[];
  totalEstimatedDuration: number;
  voiceAssignments: Record<string, string>;
}

export interface NarrationSection {
  id: string;
  chapterId: string;
  title: string;
  voiceId: string;
  estimatedDuration: number;
  pace: "slow" | "normal" | "fast";
  emotion?: "neutral" | "dramatic" | "calm" | "urgent" | "reflective";
  skip: boolean;
}

export type AudioFormat = "mp3" | "m4a" | "m4b" | "wav" | "ogg";
export type AudioQuality = "64kbps" | "128kbps" | "192kbps" | "320kbps";

export interface AudioFile {
  id: string;
  projectId: string;
  userId: string;
  filename: string;
  format: AudioFormat;
  quality: AudioQuality;
  duration: number;
  fileSize: number;
  filePath: string;
  coverArt?: string;
  chapterMarkers: ChapterMarker[];
  metadata: AudioMetadata;
  isDownloaded: boolean;
  createdAt: string;
}

export interface ChapterMarker {
  id: string;
  title: string;
  startTime: number;
  endTime: number;
  chapterId: string;
}

export interface AudioMetadata {
  title: string;
  author?: string;
  narrator?: string;
  genre?: string;
  description?: string;
  coverArtUrl?: string;
}

export interface Voice {
  id: string;
  name: string;
  gender: "male" | "female" | "neutral";
  accent: string;
  language: string;
  languageCode: string;
  tone: VoiceTone;
  category: "narration" | "conversational" | "character";
  provider: AIProviderType;
  providerModelId: string;
  sampleUrl?: string;
  isSystem: boolean;
  isFavorite: boolean;
}

export type VoiceTone = "warm" | "formal" | "energetic" | "calm" | "authoritative";

export interface VoiceClone {
  id: string;
  userId: string;
  name: string;
  qualityScore: "excellent" | "good" | "fair";
  sampleCount: number;
  language: string;
  isTraining: boolean;
  consentGiven: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Playlist {
  id: string;
  userId: string;
  name: string;
  description?: string;
  audioIds: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Bookmark {
  id: string;
  audioId: string;
  userId: string;
  timestamp: number;
  note?: string;
  createdAt: string;
}

export interface UsageStats {
  charactersProcessed: number;
  audioMinutesGenerated: number;
  storageUsed: number;
  apiCalls: number;
  cloneSlotsUsed: number;
  periodStart: string;
  periodEnd: string;
}

export interface Plan {
  id: string;
  name: string;
  tier: UserRole;
  characterLimit: number;
  audioMinuteLimit: number;
  storageLimit: number;
  cloneSlots: number;
  price: number;
  features: string[];
}

export type AIProviderType = "cloudflare" | "nvidia" | "gemini" | "custom";
export type AITaskType = "tts" | "llm" | "translation" | "embedding" | "ocr" | "vision" | "image";

export interface AIProviderConfig {
  id: string;
  type: AIProviderType;
  name: string;
  apiKey: string;
  baseUrl: string;
  accountId?: string;
  isEnabled: boolean;
  supportedTasks: AITaskType[];
  models: AIModel[];
}

export interface AIModel {
  id: string;
  providerId: string;
  name: string;
  taskType: AITaskType;
  modelId: string;
  isDefault: boolean;
  costPerUnit: number;
  unit: "character" | "token" | "second" | "request";
}

export interface TTSRequest {
  text: string;
  voiceId: string;
  speed?: number;
  pitch?: number;
  format?: AudioFormat;
  provider?: AIProviderType;
}

export interface TTSResponse {
  audioData: ArrayBuffer | string;
  duration: number;
  format: AudioFormat;
  provider: AIProviderType;
  model: string;
}

export interface LLMRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  provider?: AIProviderType;
  model?: string;
}

export interface LLMResponse {
  text: string;
  tokensUsed: number;
  provider: AIProviderType;
  model: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "conversion" | "voice" | "share" | "system" | "billing";
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

export interface APIKey {
  id: string;
  userId: string;
  name: string;
  key: string;
  permissions: string[];
  lastUsed?: string;
  expiresAt?: string;
  createdAt: string;
}

export interface ShareLink {
  id: string;
  audioId: string;
  userId: string;
  token: string;
  password?: string;
  expiresAt?: string;
  viewCount: number;
  isActive: boolean;
  createdAt: string;
}

export interface Webhook {
  id: string;
  userId: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

export interface ImageAnalysis {
  extractedText: string;
  contentType: "text-heavy" | "image-heavy" | "mixed" | "diagram" | "table" | "chart";
  language: string;
  confidence: number;
  tables: Array<{ rows: number; cols: number; data: string[][] }>;
  diagrams: string[];
  sections: Array<{ title: string; content: string }>;
}

export interface Folder {
  id: string;
  userId: string;
  name: string;
  parentId?: string;
  audioIds: string[];
  color: string;
  createdAt: string;
  updatedAt: string;
}

export interface FeatureFlag {
  id: string;
  name: string;
  description: string;
  isEnabled: boolean;
  appliesTo: UserRole[];
  updatedAt: string;
}

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  coverImage?: string;
  authorId: string;
  isPublished: boolean;
  publishedAt?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  message: string;
  status: "open" | "in-progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReferralCode {
  id: string;
  userId: string;
  code: string;
  usesCount: number;
  creditsEarned: number;
  isActive: boolean;
  createdAt: string;
}

export interface TranscriptSegment {
  text: string;
  speaker?: string;
  startTime: number;
  endTime: number;
  voiceId?: string;
}

export interface UserFeedback {
  id: string;
  userId: string;
  projectId: string;
  audioId: string;
  rating: number;
  sectionId?: string;
  comment?: string;
  isResolved: boolean;
  createdAt: string;
}

export interface PronunciationEntry {
  id: string;
  userId: string;
  word: string;
  phonetic: string;
  audioSampleUri?: string;
  createdAt: string;
}

export interface CoverArtOption {
  id: string;
  prompt: string;
  imageUrl?: string;
  isGenerated: boolean;
}
