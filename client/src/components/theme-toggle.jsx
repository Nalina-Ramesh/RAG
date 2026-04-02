import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../state/theme-context';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="relative flex h-10 w-20 items-center rounded-full border border-white/20 bg-white/40 px-1 backdrop-blur dark:bg-slate-800/60"
      aria-label="Toggle Theme"
    >
      <motion.div
        animate={{ x: theme === 'dark' ? 40 : 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 20 }}
        className="absolute h-8 w-8 rounded-full bg-indigo-500 shadow-glow"
      />
      <Sun className="z-10 ml-1 h-4 w-4 text-amber-300" />
      <Moon className="z-10 ml-auto mr-1 h-4 w-4 text-slate-200" />
    </button>
  );
};

