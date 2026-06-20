import { create } from "zustand";
import type { AudioFile, ChapterMarker } from "@/types";

type RepeatMode = "off" | "one" | "all";

interface PlayerState {
  currentAudio: AudioFile | null;
  queue: AudioFile[];
  queueIndex: number;
  isPlaying: boolean;
  isBuffering: boolean;
  duration: number;
  position: number;
  speed: number;
  volume: number;
  repeatMode: RepeatMode;
  sleepTimer: number | null;
  currentChapter: ChapterMarker | null;
  isMinimized: boolean;

  play: (audio?: AudioFile) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  seekTo: (position: number) => void;
  setSpeed: (speed: number) => void;
  setVolume: (volume: number) => void;
  setRepeatMode: (mode: RepeatMode) => void;
  setSleepTimer: (minutes: number | null) => void;
  setPosition: (position: number) => void;
  setDuration: (duration: number) => void;
  setBuffering: (buffering: boolean) => void;
  addToQueue: (audio: AudioFile) => void;
  removeFromQueue: (id: string) => void;
  clearQueue: () => void;
  playNext: () => void;
  playPrevious: () => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  setQueue: (audios: AudioFile[], startIndex?: number) => void;
  minimize: () => void;
  maximize: () => void;
  setCurrentChapter: (chapter: ChapterMarker | null) => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  currentAudio: null,
  queue: [],
  queueIndex: -1,
  isPlaying: false,
  isBuffering: false,
  duration: 0,
  position: 0,
  speed: 1.0,
  volume: 1.0,
  repeatMode: "off",
  sleepTimer: null,
  currentChapter: null,
  isMinimized: false,

  play: (audio) => {
    if (audio) {
      set({ currentAudio: audio, isPlaying: true, position: 0, isBuffering: true });
    } else {
      set({ isPlaying: true });
    }
  },

  pause: () => set({ isPlaying: false }),
  resume: () => set({ isPlaying: true }),
  stop: () => set({ isPlaying: false, position: 0, currentAudio: null, currentChapter: null }),

  seekTo: (position) => set({ position }),
  setSpeed: (speed) => set({ speed }),
  setVolume: (volume) => set({ volume }),
  setRepeatMode: (repeatMode) => set({ repeatMode }),
  setSleepTimer: (sleepTimer) => set({ sleepTimer }),
  setPosition: (position) => set({ position }),
  setDuration: (duration) => set({ duration }),
  setBuffering: (isBuffering) => set({ isBuffering }),

  addToQueue: (audio) => set((s) => ({ queue: [...s.queue, audio] })),
  removeFromQueue: (id) => set((s) => ({ queue: s.queue.filter((a) => a.id !== id) })),
  clearQueue: () => set({ queue: [], queueIndex: -1 }),

  playNext: () => {
    const { queue, queueIndex, repeatMode } = get();
    if (queue.length === 0) return;
    let next = queueIndex + 1;
    if (next >= queue.length) {
      if (repeatMode === "all") next = 0;
      else { set({ isPlaying: false }); return; }
    }
    set({ currentAudio: queue[next], queueIndex: next, isPlaying: true, position: 0 });
  },

  playPrevious: () => {
    const { queue, queueIndex, position } = get();
    if (position > 3) { set({ position: 0 }); return; }
    const prev = queueIndex - 1;
    if (prev < 0) { set({ position: 0 }); return; }
    set({ currentAudio: queue[prev], queueIndex: prev, isPlaying: true, position: 0 });
  },

  skipForward: (seconds = 30) => set((s) => ({ position: Math.min(s.position + seconds, s.duration) })),
  skipBackward: (seconds = 10) => set((s) => ({ position: Math.max(s.position - seconds, 0) })),

  setQueue: (audios, startIndex = 0) => {
    set({ queue: audios, queueIndex: startIndex, currentAudio: audios[startIndex] ?? null });
  },

  minimize: () => set({ isMinimized: true }),
  maximize: () => set({ isMinimized: false }),
  setCurrentChapter: (chapter) => set({ currentChapter: chapter }),
}));
