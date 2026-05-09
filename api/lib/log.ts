import { randomUUID } from 'node:crypto';

export type ApiLogContext = {
  route: string;
  requestId: string;
};

export function logContext(
  route: string,
  headers: Record<string, string | string[] | undefined>,
): ApiLogContext {
  const forwarded = headers['x-request-id'] ?? headers['x-vercel-id'];
  const headerId = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  const requestId =
    typeof headerId === 'string' && headerId.trim().length > 0 ? headerId.trim() : randomUUID();
  return { route, requestId };
}

export function logJson(entry: Record<string, unknown>): void {
  const next: Record<string, unknown> = { ...entry };
  const lat = next.latencyMs;
  if (typeof lat === 'number' && lat > 30_000) {
    next.level = 'error';
    next.event = next.event ?? 'slow_request';
    next.slow = true;
  }
  console.log(JSON.stringify(next));
}
