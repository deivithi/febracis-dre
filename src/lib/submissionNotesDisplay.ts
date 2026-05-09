/**
 * Notas legadas do seed administrativo (demo) — em produção tratamos como vazio na UI
 * para o placeholder neutro aparecer (U06).
 */
export function sanitizeLegacySyntheticSubmissionNotes(raw: string | null | undefined): string {
  if (import.meta.env.VITE_APP_MODE === 'demo') {
    return raw ?? '';
  }
  const trimmed = (raw ?? '').trim();
  if (
    trimmed === 'Submissao demo gerada automaticamente.' ||
    trimmed === 'Submissão demo gerada automaticamente.'
  ) {
    return '';
  }
  return raw ?? '';
}
