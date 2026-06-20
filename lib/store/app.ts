import { create } from "zustand";

interface AppState {
  theme: "light" | "dark" | "system";
  language: string;
  isOnline: boolean;
  sidebarOpen: boolean;
  activeModal: string | null;
  toasts: Toast[];

  setTheme: (theme: "light" | "dark" | "system") => void;
  setLanguage: (lang: string) => void;
  setOnline: (online: boolean) => void;
  toggleSidebar: () => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "info" | "warning";
  duration?: number;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "system",
  language: "en",
  isOnline: true,
  sidebarOpen: false,
  activeModal: null,
  toasts: [],

  setTheme: (theme) => set({ theme }),
  setLanguage: (language) => set({ language }),
  setOnline: (isOnline) => set({ isOnline }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),

  addToast: (toast) =>
    set((s) => ({
      toasts: [...s.toasts, { ...toast, id: crypto.randomUUID() }],
    })),
  removeToast: (id) =>
    set((s) => ({
      toasts: s.toasts.filter((t) => t.id !== id),
    })),
}));
