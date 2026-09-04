import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-[#5c24ff] dark:hover:text-[#a78bfa] transition-all cursor-pointer shadow-2xs active:scale-95 flex items-center justify-center"
      title={`Alternar para modo ${theme === 'light' ? 'escuro' : 'claro'}`}
    >
      {theme === 'light' ? (
        <Moon className="w-3.5 h-3.5 text-slate-700 hover:rotate-12 transition-transform" />
      ) : (
        <Sun className="w-3.5 h-3.5 text-amber-400 hover:rotate-45 transition-transform" />
      )}
    </button>
  );
};