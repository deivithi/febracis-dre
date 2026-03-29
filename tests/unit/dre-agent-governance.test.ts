import { describe, expect, it } from 'vitest';
import {
  canAssistantMutateSubmission,
  resolveAssistantInteractionMode,
} from '../../src/features/submissions/agentPermissions';
import {
  buildFlowCheckpoint,
  parseFlowCheckpointFromState,
  stripCalculatedMetricClaimsFromAnswer,
  validateAssistantFieldUpdates,
} from '../../src/features/submissions/dreAssistant';
import type { DreInputCatalogLine } from '../../src/features/shared/portal.types';

function mockLine(code: string, name = 'Campo'): DreInputCatalogLine {
  return {
    id: `id-${code}`,
    section_code: 'sec',
    section_name: 'Seção',
    section_order: 1,
    line_code: code,
    line_name: name,
    description: '',
    line_order: 1,
    input_mode: 'currency',
    value_currency: null,
    notes: null,
  };
}

describe('canAssistantMutateSubmission / resolveAssistantInteractionMode', () => {
  it('permite mutação para franchise_user em rascunho', () => {
    expect(canAssistantMutateSubmission(['franchise_user'], 'draft')).toBe(true);
    expect(resolveAssistantInteractionMode(['franchise_user'], 'draft')).toBe('full');
  });

  it('permite mutação para system_admin em rascunho', () => {
    expect(canAssistantMutateSubmission(['system_admin'], 'draft')).toBe(true);
    expect(resolveAssistantInteractionMode(['system_admin'], 'draft')).toBe('full');
  });

  it('bloqueia regional_manager mesmo em rascunho (explain_only)', () => {
    expect(canAssistantMutateSubmission(['regional_manager'], 'draft')).toBe(false);
    expect(resolveAssistantInteractionMode(['regional_manager'], 'draft')).toBe('explain_only');
  });

  it('bloqueia franchise_user quando submissão não é editável', () => {
    expect(canAssistantMutateSubmission(['franchise_user'], 'submitted')).toBe(false);
    expect(resolveAssistantInteractionMode(['franchise_user'], 'submitted')).toBe('explain_only');
  });
});

describe('validateAssistantFieldUpdates', () => {
  const known = new Set(['gross_revenue', 'deductions_total']);

  it('remove lineCode desconhecido e valor não finito', () => {
    const out = validateAssistantFieldUpdates(
      [
        { lineCode: 'gross_revenue', valueCurrency: 100, label: 'RBV' },
        { lineCode: 'unknown', valueCurrency: 50, label: 'X' },
        { lineCode: 'deductions_total', valueCurrency: Number.NaN, label: 'Y' },
        { lineCode: 'deductions_total', valueCurrency: 2e17, label: 'Z' },
      ],
      known,
    );
    expect(out).toEqual([{ lineCode: 'gross_revenue', valueCurrency: 100, label: 'RBV' }]);
  });
});

describe('stripCalculatedMetricClaimsFromAnswer', () => {
  it('remove bloco com MC1 e valor monetário', () => {
    const raw =
      'Segue o valor.\n\nMC1: R$ 10.000,00\n\nPróximo campo: deduções.';
    const cleaned = stripCalculatedMetricClaimsFromAnswer(raw);
    expect(cleaned).not.toMatch(/MC1:\s*R\$/);
    expect(cleaned).toMatch(/deduções/i);
  });

  it('mantém texto sem valores calculados de métrica', () => {
    const text = 'O MC1 é recalculado pelo sistema após salvar.';
    expect(stripCalculatedMetricClaimsFromAnswer(text)).toContain('MC1');
  });
});

describe('parseFlowCheckpointFromState', () => {
  it('retorna null para estado inválido', () => {
    expect(parseFlowCheckpointFromState(null)).toBeNull();
    expect(parseFlowCheckpointFromState({})).toBeNull();
    expect(
      parseFlowCheckpointFromState({
        flow_checkpoint: { phase: 'invalid', last_user_intent: 'other' },
      }),
    ).toBeNull();
  });

  it('parseia objeto válido', () => {
    const cp = parseFlowCheckpointFromState({
      flow_checkpoint: {
        phase: 'collecting',
        line_code: 'gross_revenue',
        filled_count: 2,
        total_inputs: 10,
        last_user_intent: 'off_topic',
      },
    });
    expect(cp).toEqual({
      phase: 'collecting',
      line_code: 'gross_revenue',
      filled_count: 2,
      total_inputs: 10,
      last_user_intent: 'off_topic',
    });
  });
});

describe('buildFlowCheckpoint', () => {
  const lines = [mockLine('a'), mockLine('b')];

  it('marca last_user_intent off_topic para piada', () => {
    const cp = buildFlowCheckpoint({
      lines,
      currentValues: { a: '', b: '' },
      focusLineCode: 'a',
      userMessage: 'me conte uma piada',
      explainOnly: false,
    });
    expect(cp.last_user_intent).toBe('off_topic');
    expect(cp.phase).toBe('collecting');
  });

  it('fase explain_only quando explainOnly true', () => {
    const cp = buildFlowCheckpoint({
      lines,
      currentValues: { a: '1', b: '2' },
      focusLineCode: 'b',
      userMessage: 'oi',
      explainOnly: true,
    });
    expect(cp.phase).toBe('explain_only');
  });
});
