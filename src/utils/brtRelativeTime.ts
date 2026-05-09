import { BRAZIL_IANA_TIMEZONE } from './brazilTimezone';

export function formatAbsoluteBrt(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: BRAZIL_IANA_TIMEZONE,
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

export function formatRelativeTimeBrt(iso: string): string {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (!Number.isFinite(minutes) || minutes < 1) {
    return 'agora';
  }
  if (minutes < 60) {
    return `há ${minutes} min`;
  }
  const hours = Math.round(minutes / 60);
  if (hours < 48) {
    return `há ${hours} h`;
  }
  return formatAbsoluteBrt(iso);
}
