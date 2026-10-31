import { create } from 'zustand';

type Theme = 'light' | 'dark';
/**
 * The visual style, independent of light/dark: "classic" is the original look, "liquid" is Liquid Glass,
 * "royal" is royal blue, purple and magenta glass (Sprint 4).
 */
export type Skin = 'classic' | 'liquid' | 'royal';
export const SKINS: Skin[] = ['classic', 'liquid', 'royal'];
export const SKIN_LABELS: Record<Skin, string> = { classic: 'Classic', liquid: 'Liquid Glass', royal: 'Royal' };

/** The skin after this one, for a single "change look" button. */
export function nextSkin(skin: Skin): Skin {
  return SKINS[(SKINS.indexOf(skin) + 1) % SKINS.length];
}

interface ThemeState {
  theme: Theme;
  skin: Skin;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  toggleSkin: () => void;
  setSkin: (skin: Skin) => void;
}

export function readSkin(): Skin {
  try {
    const saved = localStorage.getItem('skin') as Skin | null;
    return saved && SKINS.includes(saved) ? saved : 'classic';
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

/** Sets the one class that switches a skin's styles on (skin-liquid or skin-royal). Classic has none. */
export function applySkin(skin: Skin, root: HTMLElement = document.documentElement) {
  root.classList.toggle('skin-liquid', skin === 'liquid');
  root.classList.toggle('skin-royal', skin === 'royal');
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
      const next = nextSkin(state.skin);
      saveSkin(next);
      return { skin: next };
    }),
  setSkin: (skin) => {
    saveSkin(skin);
    set({ skin });
  },
}));
