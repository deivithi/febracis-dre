import type { ReactNode } from 'react';

/** Escape HTML não é feito aqui — conteúdo vem de utilizadores confiáveis; expandir com markdown seguro quando necessário. */
export function renderBasicMarkdown(text: string): ReactNode {
  return text.trim() || '—';
}
