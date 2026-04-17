import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  branchId: string | null;
}

export interface BranchConfig {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  wifi_bssids: string[];
}

interface AuthState {
  user: AuthUser | null;
  branch: BranchConfig | null;
  accessToken: string | null;
  hydrated: boolean;
  setAuth: (user: AuthUser, token: string, branch: BranchConfig | null) => Promise<void>;
  setBranch: (branch: BranchConfig) => Promise<void>;
  logout: () => Promise<void>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  branch: null,
  accessToken: null,
  hydrated: false,

  setAuth: async (user, token, branch) => {
    await AsyncStorage.multiSet([
      ['sa:access_token', token],
      ['sa:employee_id', user.id],
      ['sa:user', JSON.stringify(user)],
      ['sa:branch', branch ? JSON.stringify(branch) : ''],
    ]);
    set({ user, accessToken: token, branch });
  },

  setBranch: async (branch) => {
    await AsyncStorage.setItem('sa:branch', JSON.stringify(branch));
    set({ branch });
  },

  logout: async () => {
    await AsyncStorage.multiRemove([
      'sa:access_token', 'sa:employee_id', 'sa:user', 'sa:branch',
      'sa:cached_schedule', 'sa:cached_branch',
    ]);
    set({ user: null, accessToken: null, branch: null });
  },

  hydrate: async () => {
    try {
      const pairs = await AsyncStorage.multiGet(['sa:access_token', 'sa:user', 'sa:branch']);
      const token = pairs[0][1];
      const userRaw = pairs[1][1];
      const branchRaw = pairs[2][1];
      if (token && userRaw) {
        set({
          user: JSON.parse(userRaw) as AuthUser,
          accessToken: token,
          branch: branchRaw ? (JSON.parse(branchRaw) as BranchConfig) : null,
        });
      }
    } finally {
      set({ hydrated: true });
    }
  },
}));
