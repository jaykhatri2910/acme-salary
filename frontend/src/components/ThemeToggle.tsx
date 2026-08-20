import * as React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../store/theme';

export const ThemeToggle: React.FC = () => {
  const { resolvedTheme, toggleTheme } = useThemeStore();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex items-center justify-center h-9 w-9 rounded-lg border border-border bg-card/60 hover:bg-secondary/80 text-foreground transition-all duration-200 cursor-pointer shadow-sm hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4 text-amber-400 transition-transform duration-200 rotate-0 scale-100" />
      ) : (
        <Moon className="h-4 w-4 text-indigo-600 transition-transform duration-200 rotate-0 scale-100" />
      )}
    </button>
  );
};
