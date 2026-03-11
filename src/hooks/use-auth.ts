import { create } from "zustand";
import type { UserProfile } from "@/types/api";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setAuth: (token: string, refreshToken: string, user: UserProfile) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem("token"),
  refreshToken: localStorage.getItem("refresh_token"),
  user: (() => {
    try {
      const s = localStorage.getItem("user_info");
      return s ? (JSON.parse(s) as UserProfile) : null;
    } catch {
      return null;
    }
  })(),

  setAuth: (token, refreshToken, user) => {
    localStorage.setItem("token", token);
    localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("user_info", JSON.stringify(user));
    set({ token, refreshToken, user });
  },

  clearAuth: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user_info");
    set({ token: null, refreshToken: null, user: null });
  },
}));
