import { describe, expect, it } from 'vitest';
import {
  buildAgentSituationPromptFragments,
  sanitizeUntrustedAgentTextSnippet,
  type DreAgentConversationContext,
} from '../../src/features/submissions/dreAgentContext.js';

describe('buildAgentSituationPromptFragments', () => {
  it('devolve lista vazia quando o contexto é null', () => {
    expect(buildAgentSituationPromptFragments(null)).toEqual([]);
  });

  it('inclui unidade e regra_contencao com dados mínimos', () => {
    const ctx: DreAgentConversationContext = {
      userFirstName: null,
      franchiseTradeName: 'Unidade Demo',
      regionalName: null,
      city: 'São Paulo',
      state: 'SP',
      periodYm: '2026-01',
      periodLabelPtBr: 'janeiro de 2026',
      submissionStatus: 'approved',
      dataHojeBrt: '2026-05-16',
      ymCivilReferencia: '2026-05',
    };

    const lines = buildAgentSituationPromptFragments(ctx);
    expect(lines.some((line) => line.startsWith('contexto_unidade:'))).toBe(true);
    expect(lines.some((line) => line.startsWith('data_hoje_brt:'))).toBe(true);
    expect(lines.some((line) => line.startsWith('regra_contencao:'))).toBe(true);
  });

  it('inclui bloco histórico quando há snapshots na mesma franquia', () => {
    const ctx: DreAgentConversationContext = {
      userFirstName: null,
      franchiseTradeName: null,
      regionalName: null,
      city: null,
      state: null,
      periodYm: null,
      periodLabelPtBr: null,
      submissionStatus: null,
      historicalSnapshots: [
        {
          periodYm: '2025-11',
          periodLabelPtBr: 'novembro de 2025',
          gross_revenue: 100,
          marketing_total_approx: 5,
          mc1: 10,
          mc2: null,
          ebitda_1: 8,
          ebitda_2: null,
        },
      ],
    };

    const lines = buildAgentSituationPromptFragments(ctx);
    expect(lines.some((line) => line.includes('referencia_historica_franquia'))).toBe(true);
  });

  it('regra_contencao menciona franchise_id e proíbe misturar unidades (anti-cross-franchise)', () => {
    const ctx: DreAgentConversationContext = {
      userFirstName: null,
      franchiseTradeName: 'Alpha',
      regionalName: null,
      city: null,
      state: null,
      periodYm: '2026-01',
      periodLabelPtBr: 'janeiro de 2026',
      submissionStatus: 'draft',
      dataHojeBrt: '2026-05-16',
      ymCivilReferencia: '2026-05',
    };

    const lines = buildAgentSituationPromptFragments(ctx);
    const containment = lines.find((line) => line.startsWith('regra_contencao:'));
    expect(containment).toBeTruthy();
    expect(containment!.toLowerCase()).toContain('franchise_id');
    expect(containment!.toLowerCase()).toContain('nunca misture');
  });

  it('sanitizeUntrustedAgentTextSnippet remove NUL e trunca', () => {
    const poison = `x\u0000y${'a'.repeat(600)}`;
    const safe = sanitizeUntrustedAgentTextSnippet(poison);
    expect(safe.includes('\u0000')).toBe(false);
    expect(safe.startsWith('xy')).toBe(true);
    expect(safe.length).toBeLessThanOrEqual(440);
  });
});
