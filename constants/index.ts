export const APP_NAME = "Audioly";
export const APP_TAGLINE = "Turn any document into natural audio";

export const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];

export const SUPPORTED_FILE_TYPES = {
  documents: [".pdf", ".docx", ".doc", ".txt", ".rtf", ".odt"],
  presentations: [".pptx", ".ppt", ".key"],
  spreadsheets: [".xlsx", ".csv"],
  ebooks: [".epub", ".mobi", ".azw3"],
  images: [".jpg", ".jpeg", ".png"],
  markdown: [".md", ".html"],
  subtitles: [".srt", ".vtt"],
};

export const ALL_FILE_EXTENSIONS = Object.values(SUPPORTED_FILE_TYPES).flat();

export const OUTPUT_FORMATS = [
  { value: "mp3", label: "MP3", description: "Standard, compatible" },
  { value: "m4a", label: "M4A", description: "Apple format" },
  { value: "m4b", label: "M4B", description: "Audiobook with chapters" },
  { value: "wav", label: "WAV", description: "High quality" },
  { value: "ogg", label: "OGG", description: "Open source" },
] as const;

export const QUALITY_OPTIONS = [
  { value: "64kbps", label: "64 kbps", description: "Small file" },
  { value: "128kbps", label: "128 kbps", description: "Standard" },
  { value: "192kbps", label: "192 kbps", description: "High" },
  { value: "320kbps", label: "320 kbps", description: "Studio" },
] as const;

export const NARRATION_MODES = [
  { value: "straight", label: "Straight Narration", icon: "book-outline" },
  { value: "multi-voice", label: "Multi-Voice", icon: "people-outline" },
  { value: "podcast", label: "Podcast Style", icon: "mic-outline" },
  { value: "summary", label: "Summary", icon: "list-outline" },
  { value: "chapter-by-chapter", label: "Chapter by Chapter", icon: "layers-outline" },
  { value: "highlight", label: "Highlight Only", icon: "color-highlight-outline" },
  { value: "speed-read", label: "Speed Read", icon: "flash-outline" },
] as const;

export const LANGUAGES = [
  { code: "en-US", label: "English (US)" },
  { code: "en-GB", label: "English (UK)" },
  { code: "en-NG", label: "English (Nigerian)" },
  { code: "en-AU", label: "English (Australian)" },
  { code: "en-IN", label: "English (Indian)" },
  { code: "en-ZA", label: "English (South African)" },
  { code: "fr-FR", label: "French" },
  { code: "ar-SA", label: "Arabic" },
  { code: "es-ES", label: "Spanish" },
  { code: "pt-BR", label: "Portuguese" },
  { code: "sw-KE", label: "Swahili" },
  { code: "ha-NG", label: "Hausa" },
  { code: "yo-NG", label: "Yoruba" },
  { code: "ig-NG", label: "Igbo" },
] as const;

export const PLAN_LIMITS = {
  free: { characters: 50000, minutes: 30, storage: 500, clones: 0 },
  pro: { characters: 500000, minutes: 300, storage: 10000, clones: 3 },
  business: { characters: 2000000, minutes: 1200, storage: 50000, clones: 10 },
} as const;
