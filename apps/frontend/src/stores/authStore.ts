import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AuthState = {
  token: string | null;
  email: string | null;
  name: string | null;
  userId: string | null;
  isSignedIn: boolean;
  setAuth: (token: string, email: string, name: string, userId?: string) => void;
  clearAuth: () => void;
  setIsSignedIn: (val: boolean) => void;
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      email: null,
      name: null,
      userId: null,
      isSignedIn: false,
      setAuth: (token, email, name, userId) => set({ token, email, name, userId: userId || null }),
      clearAuth: () => set({ token: null, email: null, name: null, userId: null, isSignedIn: false }),
      setIsSignedIn: (val) => set({ isSignedIn: val }),
    }),
    { name: "auth-storage" }
  )
);
