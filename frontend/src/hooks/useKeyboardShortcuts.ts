import { useEffect } from 'react';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: () => void;
  description: string;
}

const registeredShortcuts: Shortcut[] = [];

export function registerShortcut(shortcut: Shortcut) {
  if (!registeredShortcuts.find(s => s.key === shortcut.key && s.ctrlKey === shortcut.ctrlKey)) {
    registeredShortcuts.push(shortcut);
  }
}

export function unregisterShortcut(key: string, ctrlKey?: boolean) {
  const idx = registeredShortcuts.findIndex(s => s.key === key && s.ctrlKey === ctrlKey);
  if (idx >= 0) registeredShortcuts.splice(idx, 1);
}

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts in inputs
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      ) {
        return;
      }

      for (const shortcut of registeredShortcuts) {
        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          e.ctrlKey === !!shortcut.ctrlKey &&
          e.shiftKey === !!shortcut.shiftKey &&
          e.altKey === !!shortcut.altKey
        ) {
          e.preventDefault();
          shortcut.handler();
          break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);
}

// Hook helper for individual components
export function useShortcut(
  key: string,
  handler: () => void,
  options?: { ctrlKey?: boolean; shiftKey?: boolean; altKey?: boolean }
) {
  useEffect(() => {
    registerShortcut({ key, handler, description: '', ...options });
    return () => unregisterShortcut(key, options?.ctrlKey);
  }, [key, handler, options?.ctrlKey, options?.shiftKey, options?.altKey]);
}
