import { create } from 'zustand';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isInitialized: boolean;
  setAuth: (accessToken: string | null, user: User | null) => void;
  clearAuth: () => void;
  setInitialized: (isInitialized: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isInitialized: false,
  setAuth: (accessToken, user) => set({ accessToken, user }),
  clearAuth: () => set({ accessToken: null, user: null }),
  setInitialized: (isInitialized) => set({ isInitialized }),
}));

if (import.meta.env.DEV) {
  (window as any).__authStore = useAuthStore;
}
