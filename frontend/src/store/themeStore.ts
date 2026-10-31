import { create } from 'zustand';

type Theme = 'light' | 'dark';
/** The visual style. "classic" is the original look; "liquid" is Liquid Glass. Independent of light/dark. */
export type Skin = 'classic' | 'liquid';

interface ThemeState {
  theme: Theme;
  skin: Skin;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSkin: () => void;
  setSkin: (skin: Skin) => void;
}

function readSkin(): Skin {
  try {
    return localStorage.getItem('skin') === 'liquid' ? 'liquid' : 'classic';
  } catch {
    return 'classic';
  }
}

function saveSkin(skin: Skin) {
  try {
    localStorage.setItem('skin', skin);
  } catch {
    // Storage can be unavailable (private mode); the choice then lasts for this visit only.
  }
}

/** Adds or removes the class that switches every Liquid Glass style on. Classic styles are never changed. */
export function applySkin(skin: Skin, root: HTMLElement = document.documentElement) {
  root.classList.toggle('skin-liquid', skin === 'liquid');
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: (localStorage.getItem('theme') as Theme) || 'dark',
  skin: readSkin(),
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', next);
      return { theme: next };
    }),
  setTheme: (theme) => {
    localStorage.setItem('theme', theme);
    set({ theme });
  },
  toggleSkin: () =>
    set((state) => {
      const next: Skin = state.skin === 'liquid' ? 'classic' : 'liquid';
      saveSkin(next);
      return { skin: next };
    }),
  setSkin: (skin) => {
    saveSkin(skin);
    set({ skin });
  },
}));
