import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const applyTheme = (theme: Theme) => {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

const getInitialTheme = (): Theme => {
  const saved = localStorage.getItem('gc_theme') as Theme | null;
  if (saved === 'dark' || saved === 'light') return saved;
  if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
};

export const useThemeStore = create<ThemeState>(() => {
  const initialTheme = getInitialTheme();
  applyTheme(initialTheme);

  return {
    theme: initialTheme,
    setTheme: (theme) => {
      localStorage.setItem('gc_theme', theme);
      applyTheme(theme);
      useThemeStore.setState({ theme });
    },
    toggleTheme: () => {
      useThemeStore.setState((state) => {
        const newTheme: Theme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('gc_theme', newTheme);
        applyTheme(newTheme);
        return { theme: newTheme };
      });
    },
  };
});
