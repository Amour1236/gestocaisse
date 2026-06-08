import { create } from 'zustand';

export const useThemeStore = create((set) => {
  // Déterminer le thème initial
  const getInitialTheme = () => {
    const saved = localStorage.getItem('gc_theme');
    if (saved) return saved;
    
    // Vérifier la préférence système
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  };

  const initialTheme = getInitialTheme();
  
  // Appliquer le thème initial
  if (initialTheme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }

  return {
    theme: initialTheme,
    setTheme: (theme) => {
      localStorage.setItem('gc_theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      set({ theme });
    },
    toggleTheme: () => {
      set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('gc_theme', newTheme);
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        return { theme: newTheme };
      });
    },
  };
});
