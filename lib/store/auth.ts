import { create } from "zustand";
import type { User, UserRole } from "@/types";
import * as SecureStore from "expo-secure-store";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  restore: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => void;
  hasRole: (...roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const token = btoa(`${email}:${Date.now()}:${password}`);
      const user: User = {
        id: crypto.randomUUID(),
        email,
        name: email.split("@")[0],
        role: "free",
        planId: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: { theme: "system", language: "en", playbackSpeed: 1.0, notifications: true },
      };
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  register: async (name: string, email: string, password: string) => {
    set({ isLoading: true });
    try {
      const token = btoa(`${email}:${Date.now()}:registered`);
      const user: User = {
        id: crypto.randomUUID(),
        email,
        name,
        role: "free",
        planId: "free",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: { theme: "system", language: "en", playbackSpeed: 1.0, notifications: true },
      };
      await SecureStore.setItemAsync(TOKEN_KEY, token);
      await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_KEY);
    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
  },

  restore: async () => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      const userJson = await SecureStore.getItemAsync(USER_KEY);
      if (token && userJson) {
        const user = JSON.parse(userJson) as User;
        set({ user, token, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch {
      set({ isLoading: false });
    }
  },

  updateProfile: (updates: Partial<User>) => {
    const current = get().user;
    if (!current) return;
    const updated = { ...current, ...updates, updatedAt: new Date().toISOString() };
    SecureStore.setItemAsync(USER_KEY, JSON.stringify(updated));
    set({ user: updated });
  },

  hasRole: (...roles: UserRole[]) => {
    const user = get().user;
    return user ? roles.includes(user.role) : false;
  },
}));
