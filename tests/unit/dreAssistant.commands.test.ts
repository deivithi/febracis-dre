import { describe, expect, it } from 'vitest';
import type { DreInputCatalogLine } from '../../src/features/shared/portal.types';
import {
  parseAgentCommand,
  runDeterministicCommand,
  getPhaseProgress,
} from '../../src/features/submissions/dreAssistant';

const line = (over: Partial<DreInputCatalogLine> & Pick<DreInputCatalogLine, 'line_code' | 'line_name'>): DreInputCatalogLine => ({
  id: `id-${over.line_code}`,
  section_code: over.section_code ?? 'rbv',
  section_name: over.section_name ?? 'Receita Bruta',
  section_order: over.section_order ?? 1,
  line_code: over.line_code,
  line_name: over.line_name,
  description: over.description ?? null,
  line_order: over.line_order ?? 1,
  input_mode: over.input_mode ?? 'currency',
  value_currency: null,
  notes: null,
});

describe('parseAgentCommand', () => {
  it('reconhece cmd:start sem argumentos', () => {
    expect(parseAgentCommand('cmd:start')).toEqual({ kind: 'cmd', name: 'start', args: [] });
    expect(parseAgentCommand('  Cmd:Start  ')).toEqual({ kind: 'cmd', name: 'start', args: [] });
  });

  it('reconhece cmd:propose_value com line e valor', () => {
    expect(parseAgentCommand('cmd:propose_value gross_revenue 50000')).toEqual({
      kind: 'cmd',
      name: 'propose_value',
      args: ['gross_revenue', '50000'],
    });
  });

  it('texto livre retorna kind free', () => {
    expect(parseAgentCommand('Olá humano')).toEqual({ kind: 'free', raw: 'Olá humano' });
  });

  it('comando desconhecido cai em free', () => {
    expect(parseAgentCommand('cmd:foobar')).toEqual({ kind: 'free', raw: 'cmd:foobar' });
  });
});

describe('runDeterministicCommand', () => {
  const catalog: DreInputCatalogLine[] = [
    line({ section_code: 'rbv', section_name: 'RBV', line_code: 'gross_revenue', line_name: 'Receita Bruta' }),
    line({
      section_code: 'deductions',
      section_name: 'Deducoes',
      section_order: 2,
      line_code: 'discounts_returns',
      line_name: 'Descontos',
    }),
  ];

  it('start posiciona primeira linha vazia', () => {
    const cmd = parseAgentCommand('cmd:start') as Extract<ReturnType<typeof parseAgentCommand>, { kind: 'cmd' }>;
    const { result, sessionPatch } = runDeterministicCommand({
      cmd,
      lines: catalog,
      currentValues: {},
      currentLineCode: null,
      explainOnly: false,
      skippedLineCodes: [],
      proposedValueFromSession: null,
      drePhaseFromSession: null,
    });
    expect(result.focusLineCode).toBe('gross_revenue');
    expect(result.fieldUpdates).toHaveLength(0);
    expect(sessionPatch.dre_phase).toBe(1);
  });

  it('explain_field não aplica atualizações', () => {
    const cmd = parseAgentCommand('cmd:explain_field') as Extract<
      ReturnType<typeof parseAgentCommand>,
      { kind: 'cmd' }
    >;
    const { result } = runDeterministicCommand({
      cmd,
      lines: catalog,
      currentValues: {},
      currentLineCode: 'gross_revenue',
      explainOnly: true,
      skippedLineCodes: [],
      proposedValueFromSession: null,
      drePhaseFromSession: 1,
    });
    expect(result.fieldUpdates).toHaveLength(0);
    expect(result.answer.length).toBeGreaterThan(20);
    expect(result.focusLineCode).toBeTruthy();
  });

  it('propose_value retorna requiresFieldConfirmation e sessão pendente', () => {
    const cmd = parseAgentCommand('cmd:propose_value gross_revenue 1500') as Extract<
      ReturnType<typeof parseAgentCommand>,
      { kind: 'cmd' }
    >;
    const { result, sessionPatch } = runDeterministicCommand({
      cmd,
      lines: catalog,
      currentValues: {},
      currentLineCode: 'gross_revenue',
      explainOnly: false,
      skippedLineCodes: [],
      proposedValueFromSession: null,
      drePhaseFromSession: null,
    });
    expect(result.requiresFieldConfirmation).toBe(true);
    expect(sessionPatch.proposed_value?.line_code).toBe('gross_revenue');
    expect(sessionPatch.proposed_value?.amount).toBe(1500);
    expect(sessionPatch.acceptance_state).toBe('pending');
  });

  it('confirm_value aplica após proposta pendente', () => {
    const cmd = parseAgentCommand('cmd:confirm_value') as Extract<
      ReturnType<typeof parseAgentCommand>,
      { kind: 'cmd' }
    >;
    const { result } = runDeterministicCommand({
      cmd,
      lines: catalog,
      currentValues: {},
      currentLineCode: 'gross_revenue',
      explainOnly: false,
      skippedLineCodes: [],
      proposedValueFromSession: { line_code: 'gross_revenue', amount: 2000 },
      drePhaseFromSession: 1,
    });
    expect(result.requiresFieldConfirmation).not.toBe(true);
    expect(result.fieldUpdates.some((item) => item.lineCode === 'gross_revenue' && item.valueCurrency === 2000)).toBe(
      true,
    );
  });

  it('reject_value mantém formulário sem atualizações', () => {
    const cmd = parseAgentCommand('cmd:reject_value') as Extract<
      ReturnType<typeof parseAgentCommand>,
      { kind: 'cmd' }
    >;
    const { result, sessionPatch } = runDeterministicCommand({
      cmd,
      lines: catalog,
      currentValues: {},
      currentLineCode: 'gross_revenue',
      explainOnly: false,
      skippedLineCodes: [],
      proposedValueFromSession: { line_code: 'gross_revenue', amount: 9 },
      drePhaseFromSession: null,
    });
    expect(result.fieldUpdates).toHaveLength(0);
    expect(sessionPatch.proposed_value).toBe(null);
    expect(sessionPatch.acceptance_state).toBe('none');
  });

  it('phase_summary atualiza dre_phase guardado na sessão', () => {
    const cmd = parseAgentCommand('cmd:phase_summary 2') as Extract<
      ReturnType<typeof parseAgentCommand>,
      { kind: 'cmd' }
    >;
    const { result, sessionPatch } = runDeterministicCommand({
      cmd,
      lines: catalog,
      currentValues: {},
      currentLineCode: 'gross_revenue',
      explainOnly: true,
      skippedLineCodes: [],
      proposedValueFromSession: null,
      drePhaseFromSession: null,
    });
    expect(sessionPatch.dre_phase).toBe(2);
    expect(result.answer).toContain('Deduções');
    expect(result.mode).toBe('fallback');
  });
});

describe('getPhaseProgress', () => {
  const catalog = [
    line({ section_code: 'marketing', section_name: 'Mkt', line_code: 'marketing_digital', line_name: 'Digital' }),
    line({ section_code: 'marketing', section_name: 'Mkt', line_code: 'marketing_gifts', line_name: 'Brindes' }),
  ];

  it('considera campo preenchido e linha marcada como pulada', () => {
    const skipped = new Set<string>();
    skipped.add('marketing_gifts');

    expect(
      getPhaseProgress(
        5,
        catalog,
        { marketing_digital: '100', marketing_gifts: '' },
        skipped,
      ),
    ).toEqual({ filled: 2, total: Math.max(2, 1) });
  });
});
