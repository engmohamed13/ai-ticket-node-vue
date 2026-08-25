import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { toErrorMessage } from '../services/apiError';
import { fetchCurrentUser, login as loginRequest, logout as logoutRequest } from '../services/auth.service';
import { TOKEN_STORAGE_KEY, USER_STORAGE_KEY } from '../config/storage';
import type { AuthUser, LoginPayload, Permission } from '../types';

const readStoredUser = (): AuthUser | null => {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    // Corrupt payload (hand-edited or a stale shape) — treat it as no session.
    localStorage.removeItem(USER_STORAGE_KEY);
    return null;
  }
};

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(null);
  const user = ref<AuthUser | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const restored = ref(false);

  const isAuthenticated = computed(() => token.value !== null);
  const permissions = computed<Permission[]>(() => user.value?.permissions ?? []);

  const can = (permission: Permission): boolean => permissions.value.includes(permission);

  const persist = (nextToken: string, nextUser: AuthUser): void => {
    localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextUser));
  };

  const clear = (): void => {
    token.value = null;
    user.value = null;
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
  };

  /** Rehydrate from localStorage. Idempotent — safe to call from every navigation. */
  const restore = (): void => {
    if (restored.value) return;
    restored.value = true;
    const storedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    const storedUser = readStoredUser();
    if (storedToken && storedUser) {
      token.value = storedToken;
      user.value = storedUser;
    } else {
      clear();
    }
  };

  const signIn = async (payload: LoginPayload): Promise<boolean> => {
    loading.value = true;
    error.value = null;
    try {
      const result = await loginRequest(payload);
      token.value = result.token;
      user.value = result.user;
      restored.value = true;
      persist(result.token, result.user);
      return true;
    } catch (cause) {
      clear();
      error.value = toErrorMessage(cause, 'Unable to sign in');
      return false;
    } finally {
      loading.value = false;
    }
  };

  const signOut = async (): Promise<void> => {
    try {
      // Best-effort: the backend logout is stateless, so a failure here changes nothing.
      await logoutRequest();
    } catch {
      // Intentionally ignored — the local session is cleared either way.
    } finally {
      clear();
      error.value = null;
    }
  };

  /** Re-read the role and permissions from the server; the token's copy can be stale. */
  const refreshCurrentUser = async (): Promise<void> => {
    if (!token.value) return;
    try {
      const current = await fetchCurrentUser();
      user.value = current;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(current));
    } catch (cause) {
      error.value = toErrorMessage(cause, 'Unable to refresh the current user');
    }
  };

  return {
    token,
    user,
    loading,
    error,
    isAuthenticated,
    permissions,
    can,
    clear,
    restore,
    signIn,
    signOut,
    refreshCurrentUser
  };
});
