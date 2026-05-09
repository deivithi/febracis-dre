import type { BreadcrumbSegment } from '../components/layout/Breadcrumb';

/** Encurtar headline longo do escopo no breadcrumb (mobile/desktop). */
export function abbreviateBreadcrumbLabel(text: string, maxChars = 44): string {
  const t = text.trim();
  if (t.length <= maxChars) {
    return t;
  }
  return `${t.slice(0, Math.max(1, maxChars - 1))}…`;
}

export function submissionStatusToBreadcrumbBadgeTone(
  status: string | undefined,
): BreadcrumbSegment['badgeTone'] | undefined {
  if (!status) {
    return undefined;
  }
  if (status === 'approved') {
    return 'success';
  }
  if (['under_review', 'submitted', 'pending_adjustment'].includes(status)) {
    return 'warning';
  }
  return 'muted';
}
