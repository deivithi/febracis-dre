import { describe, expect, it } from 'vitest';
import {
  bubbleCoversAssistantStepHint,
  buildFlowCheckpoint,
  classifyDreUserIntent,
  isGuidedFlowContinuationMessage,
  runLocalAssistantTurn,
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

describe('isGuidedFlowContinuationMessage / classifyDreUserIntent', () => {
  it('trata “vamos continuar?” como fluxo guiado, não off-topic', () => {
    expect(isGuidedFlowContinuationMessage('Vamos continuar?')).toBe(true);
    expect(classifyDreUserIntent('Vamos continuar?')).toBe('dre_on_topic');
  });

  it('reconhece confirmações curtas', () => {
    expect(isGuidedFlowContinuationMessage('ok')).toBe(true);
    expect(isGuidedFlowContinuationMessage('beleza')).toBe(true);
    expect(classifyDreUserIntent('próximo passo')).toBe('dre_on_topic');
  });
});

describe('buildFlowCheckpoint — continuidade', () => {
  const lines = [mockLine('a', 'Taxa com Cartões'), mockLine('b', 'Outro')];

  it('marca last_user_intent como other para continuar (não off_topic)', () => {
    const cp = buildFlowCheckpoint({
      lines,
      currentValues: { a: '', b: '' },
      focusLineCode: 'a',
      userMessage: 'vamos seguir',
      explainOnly: false,
    });
    expect(cp.last_user_intent).toBe('other');
  });
});

describe('bubbleCoversAssistantStepHint', () => {
  it('detecta quando a bolha já traz o mesmo passo sugerido', () => {
    const bubble =
      'Voltando à DRE deste período. Seguimos com «Taxa com Cartões»: Qual o valor informado para Taxa com Cartões neste mês?';
    const step = 'Qual o valor informado para Taxa com Cartões neste mês?';
    expect(bubbleCoversAssistantStepHint(bubble, step)).toBe(true);
  });
});

describe('runLocalAssistantTurn — continuação em modo full', () => {
  const catalog: DreInputCatalogLine[] = [
    mockLine('fee_cards', 'Taxa com Cartões'),
    mockLine('other', 'Outra linha'),
  ];

  it('responde com roteiro guiado sem ramo off-topic', () => {
    const r = runLocalAssistantTurn({
      message: 'Vamos continuar?',
      lines: catalog,
      currentValues: {},
      currentLineCode: 'fee_cards',
      explainOnly: false,
    });
    expect(r.mode).toBe('fallback');
    expect(r.answer.toLowerCase()).not.toMatch(/fora do escopo/);
    expect(r.focusLineCode).toBe('fee_cards');
    expect(r.nextPrompt).toBeTruthy();
  });
});
