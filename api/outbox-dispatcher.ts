import { createClient } from '@supabase/supabase-js';
import {
  deliverOutboxEvent,
  isAuthorizedCronRequest,
  OUTBOX_DEFAULT_BATCH,
  OUTBOX_MAX_BATCH,
  type OutboxEventRow,
} from './outboxDispatcherLogic.js';

interface OutboxApiRequest {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  query?: Record<string, string | string[] | undefined>;
}

interface OutboxApiResponse {
  status: (code: number) => {
    json: (body: unknown) => unknown;
  };
}

const supabaseUrl = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET ?? process.env.OUTBOX_DISPATCHER_CRON_SECRET;
const webhookUrl = process.env.OUTBOX_WEBHOOK_URL;

function json(res: OutboxApiResponse, status: number, body: unknown) {
  return res.status(status).json(body);
}

function getBatchLimit(req: OutboxApiRequest): number {
  const raw = req.query?.limit;
  const value = Array.isArray(raw) ? raw[0] : raw;
  const parsed = typeof value === 'string' ? Number.parseInt(value, 10) : OUTBOX_DEFAULT_BATCH;
  if (Number.isNaN(parsed)) {
    return OUTBOX_DEFAULT_BATCH;
  }
  return Math.min(OUTBOX_MAX_BATCH, Math.max(1, parsed));
}

function getAuthorizationHeader(req: OutboxApiRequest): string | undefined {
  const header = req.headers.authorization;
  return Array.isArray(header) ? header[0] : header;
}

export default async function handler(req: OutboxApiRequest, res: OutboxApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return json(res, 405, { error: 'method_not_allowed' });
  }

  if (!isAuthorizedCronRequest(getAuthorizationHeader(req), cronSecret)) {
    return json(res, 401, { error: 'unauthorized' });
  }

  if (!supabaseUrl || !serviceRoleKey) {
    return json(res, 503, {
      error: 'misconfigured',
      message: 'SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para o dispatcher.',
    });
  }

  const limit = getBatchLimit(req);
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: claimed, error: claimError } = await supabase.rpc('fn_claim_outbox_events', {
    p_limit: limit,
  });

  if (claimError) {
    console.error(JSON.stringify({ outbox_dispatcher: 'claim_failed', error: claimError.message }));
    return json(res, 500, { error: 'claim_failed', message: claimError.message });
  }

  const events = (claimed ?? []) as OutboxEventRow[];
  let published = 0;
  let failed = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const event of events) {
    const delivery = await deliverOutboxEvent(event, webhookUrl);
    const { error: completeError } = await supabase.rpc('fn_complete_outbox_event', {
      p_event_id: event.id,
      p_success: delivery.ok,
      p_error: delivery.ok ? null : delivery.error,
    });

    if (completeError) {
      failed += 1;
      failures.push({ id: event.id, error: completeError.message });
      continue;
    }

    if (delivery.ok) {
      published += 1;
    } else {
      failed += 1;
      failures.push({ id: event.id, error: delivery.error });
    }
  }

  return json(res, 200, {
    claimed: events.length,
    published,
    failed,
    failures,
    mode: webhookUrl ? 'webhook' : 'log_only',
  });
}
