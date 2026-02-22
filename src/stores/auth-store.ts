import { create } from 'zustand';
import type { UserProfile, AuthState } from '@types/auth';
import * as authService from '@services/auth';

interface AuthStore extends AuthState {
  login: (phone: string, code: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  loadCurrentUser: () => Promise<void>;
  updateProfile: (profile: Partial<UserProfile>) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  loadCurrentUser: async () => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: !!user, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (phone, code) => {
    set({ isLoading: true, error: null });
    const { user, error } = await authService.verifyOtp(phone, code);
    if (error) {
      set({ isLoading: false, error });
      return { error };
    }
    set({ user, isAuthenticated: true, isLoading: false, error: null });
    return { error: null };
  },

  logout: async () => {
    set({ isLoading: true });
    await authService.signOut();
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },

  updateProfile: (partial) => {
    const current = get().user;
    if (current) {
      set({ user: { ...current, ...partial } });
    }
  },
}));
