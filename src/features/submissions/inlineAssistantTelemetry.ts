/** Stub U14 — substituir por ingestão real (audit_log / analytics) quando existir rota. */
export function logInlineAssistantAccepted(payload: {
  submissionId: string;
  lineCode: string;
  value: number;
  source: 'accept' | 'refine';
}) {
  if (import.meta.env.DEV) {
    console.debug('[inline-assistant]', payload);
  }
}
