import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/themeStore';

interface ThemeToggleProps {
  floating?: boolean;
}

export default function ThemeToggle({ floating = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useThemeStore();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
      title={isDark ? 'Mode clair' : 'Mode sombre'}
      className={
        'inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700 ' +
        (floating ? 'fixed bottom-4 right-4 z-50' : '')
      }
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
      <span className="hidden sm:inline">{isDark ? 'Mode clair' : 'Mode sombre'}</span>
    </button>
  );
}
