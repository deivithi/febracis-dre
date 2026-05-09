import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import type { FebracisTheme } from '../../lib/theme';
import { pushThemeToProfile } from '../../lib/themePersistence';
import './ThemeToggle.css';

const OPTIONS: { value: FebracisTheme; label: string; Icon: typeof Sun }[] = [
  { value: 'system', label: 'Sistema', Icon: Monitor },
  { value: 'dark', label: 'Escuro', Icon: Moon },
  { value: 'light', label: 'Claro', Icon: Sun },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="theme-toggle theme-toggle--placeholder" aria-hidden />;
  }

  const active = (theme as FebracisTheme) ?? 'system';

  const handleSelect = (value: FebracisTheme) => {
    setTheme(value);
    void pushThemeToProfile(value);
  };

  return (
    <div className="theme-toggle" role="group" aria-label="Tema da interface">
      {OPTIONS.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          className={`theme-toggle__segment ${active === value ? 'theme-toggle__segment--active' : ''}`}
          onClick={() => handleSelect(value)}
          aria-pressed={active === value}
        >
          <Icon size={16} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
