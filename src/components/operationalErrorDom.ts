import type { OperationalErrorProps } from './OperationalErrorScreen';

function escapeHtml(text: string) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Injeta HTML mínimo em #root quando o React ainda não montou (bootstrap / erro global).
 */
export function renderOperationalErrorToRoot(
  root: HTMLElement,
  { title, message, hint, detail }: OperationalErrorProps,
) {
  const hintHtml = hint
    ? `<p style="margin:0 0 .75rem;opacity:.85;font-size:.9rem">${escapeHtml(hint)}</p>`
    : '';
  const detailHtml = detail
    ? `<pre style="margin:1rem 0 0;padding:.75rem;background:#1e293b;border-radius:8px;overflow:auto;font-size:.8rem;white-space:pre-wrap;word-break:break-word">${escapeHtml(detail)}</pre>`
    : '';
  root.innerHTML = `<div style="font-family:system-ui,sans-serif;padding:2rem;max-width:42rem;line-height:1.5;color:#e2e8f0;background:#0f172a;min-height:100vh"><h1 style="font-size:1.15rem;margin:0 0 1rem">${escapeHtml(title)}</h1><p style="margin:0 0 .75rem">${escapeHtml(message)}</p>${hintHtml}${detailHtml}<p style="margin:1.25rem 0 0;opacity:.75;font-size:.85rem">Em desenvolvimento local, use <code style="background:#1e293b;padding:.1rem .35rem;border-radius:4px">.env.local</code> na raiz do projeto.</p></div>`;
}
