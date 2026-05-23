/**
 * Lógica pura do relay outbox — testável sem Supabase/Vercel.
 */

export const OUTBOX_MAX_BATCH = 100;
export const OUTBOX_DEFAULT_BATCH = 25;

export interface OutboxEventRow {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  retry_count: number;
}

export function isAuthorizedCronRequest(
  authorizationHeader: string | null | undefined,
  cronSecret: string | undefined,
): boolean {
  if (!cronSecret || cronSecret.length === 0) {
    return false;
  }
  const expected = `Bearer ${cronSecret}`;
  return authorizationHeader === expected;
}

export function computeOutboxBackoffSeconds(retryCount: number): number {
  const capped = Math.min(Math.max(retryCount, 1), 10);
  return Math.min(3600, Math.max(30, 2 ** capped * 30));
}

export function buildOutboxDeliveryBody(event: OutboxEventRow): Record<string, unknown> {
  const telemetryEvent =
    typeof event.payload.telemetry_event === 'string'
      ? event.payload.telemetry_event
      : event.event_type;

  return {
    contract_version: '1.0',
    source: 'febracis-dre-outbox',
    outbox_id: event.id,
    event_type: event.event_type,
    telemetry_event: telemetryEvent,
    payload: event.payload,
    retry_count: event.retry_count,
    dispatched_at: new Date().toISOString(),
  };
}

export async function deliverOutboxEvent(
  event: OutboxEventRow,
  webhookUrl: string | undefined,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const body = buildOutboxDeliveryBody(event);

  if (!webhookUrl || webhookUrl.trim().length === 0) {
    console.info(JSON.stringify({ outbox_delivery: 'log_only', ...body }));
    return { ok: true };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Febracis-Contract-Version': '1.0',
        'X-Febracis-Outbox-Event': event.event_type,
        'X-Febracis-Outbox-Id': event.id,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const snippet = (await response.text()).slice(0, 500);
      return {
        ok: false,
        error: `webhook HTTP ${response.status}: ${snippet}`,
      };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}
