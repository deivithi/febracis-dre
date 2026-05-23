import { describe, expect, it } from 'vitest';
import {
  buildOutboxDeliveryBody,
  computeOutboxBackoffSeconds,
  isAuthorizedCronRequest,
} from '../../api/outboxDispatcherLogic';

describe('isAuthorizedCronRequest', () => {
  it('aceita Bearer CRON_SECRET válido', () => {
    expect(isAuthorizedCronRequest('Bearer secret-123', 'secret-123')).toBe(true);
  });

  it('rejeita secret ausente ou header incorreto', () => {
    expect(isAuthorizedCronRequest('Bearer wrong', 'secret-123')).toBe(false);
    expect(isAuthorizedCronRequest(null, 'secret-123')).toBe(false);
    expect(isAuthorizedCronRequest('Bearer x', undefined)).toBe(false);
  });
});

describe('computeOutboxBackoffSeconds', () => {
  it('cresce exponencialmente com teto de 3600s', () => {
    expect(computeOutboxBackoffSeconds(1)).toBe(60);
    expect(computeOutboxBackoffSeconds(2)).toBe(120);
    expect(computeOutboxBackoffSeconds(10)).toBe(3600);
    expect(computeOutboxBackoffSeconds(99)).toBe(3600);
  });
});

describe('buildOutboxDeliveryBody', () => {
  it('propaga telemetry_event do payload', () => {
    const body = buildOutboxDeliveryBody({
      id: 'evt-1',
      event_type: 'submission.submitted',
      retry_count: 1,
      payload: {
        telemetry_event: 'submission_submitted_valid',
        submission_id: 'sub-1',
      },
    });

    expect(body.telemetry_event).toBe('submission_submitted_valid');
    expect(body.event_type).toBe('submission.submitted');
    expect(body.source).toBe('febracis-dre-outbox');
    expect(body.contract_version).toBe('1.0');
    expect(body.outbox_id).toBe('evt-1');
    expect(typeof body.dispatched_at).toBe('string');
  });
});
