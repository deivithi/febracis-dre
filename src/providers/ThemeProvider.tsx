import { ThemeProvider as NextThemesProvider } from 'next-themes';
import type { ReactNode } from 'react';
import { FEBRACIS_THEME_STORAGE_KEY } from '../lib/theme';

export { FEBRACIS_THEME_STORAGE_KEY };

/** Wrapper fino: classe `light` / `dark` no elemento raiz HTML, default sistema, persistência via next-themes. */
export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      storageKey={FEBRACIS_THEME_STORAGE_KEY}
      themes={['light', 'dark']}
    >
      {children}
    </NextThemesProvider>
  );
}
