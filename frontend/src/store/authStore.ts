import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  setToken: (token: string | null) => void;
  setUser: (user: User | null) => void;
  logout: () => void;
}

function decodeToken(token: string | null): User | null {
  if (!token) return null;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    const payload = JSON.parse(jsonPayload);
    return {
      id: payload.id,
      name: payload.name,
      email: payload.sub,
      role: payload.role
    };
  } catch (e) {
    console.error('Failed to decode JWT token', e);
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => {
  const initialToken = localStorage.getItem('token');
  const initialUser = decodeToken(initialToken);

  return {
    token: initialToken,
    user: initialUser,
    setToken: (token) => {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
      set({ token, user: decodeToken(token) });
    },
    setUser: (user) => set({ user }),
    logout: () => {
      localStorage.removeItem('token');
      set({ token: null, user: null });
    },
  };
});
