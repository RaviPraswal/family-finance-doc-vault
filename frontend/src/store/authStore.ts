import { create } from 'zustand';

/**
 * Sprint 7 T8 (SPEC P0-3, D-07): the session lives in an HttpOnly cookie the page cannot read.
 * The store keeps only who is signed in and when the session ends, loaded from /api/auth/session.
 * No token is ever written to localStorage.
 */
interface User {
  id?: string;
  name: string;
  email: string;
  role: string;
}

export type SessionStatus = 'unknown' | 'in' | 'out';

interface AuthState {
  user: User | null;
  expiresAt: number | null;
  status: SessionStatus;
  setSession: (user: User | null, expiresAt: number | null) => void;
  /** Local sign-out (e.g. after a 401); use endSession() to also clear the server cookie. */
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => {
  try { localStorage.removeItem('token'); } catch { /* storage may be unavailable */ } // drop tokens kept by older versions
  return {
    user: null,
    expiresAt: null,
    status: 'unknown',
    setSession: (user, expiresAt) => set({ user, expiresAt, status: user ? 'in' : 'out' }),
    logout: () => set({ user: null, expiresAt: null, status: 'out' }),
  };
});

/** Asks the server who is signed in (the cookie travels with the request). */
export async function loadSession(): Promise<void> {
  try {
    const res = await fetch('/api/auth/session', { credentials: 'same-origin' });
    if (!res.ok) {
      useAuthStore.getState().logout();
      return;
    }
    const s = await res.json();
    useAuthStore.getState().setSession({ name: s.name, email: s.email, role: s.role }, s.expiresAt ?? null);
  } catch {
    useAuthStore.getState().logout();
  }
}

/** Signs out everywhere: the server clears the cookie, the page forgets the user. */
export async function endSession(): Promise<void> {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    useAuthStore.getState().logout();
  }
}
