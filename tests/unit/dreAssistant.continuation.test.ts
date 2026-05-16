import { describe, expect, it } from 'vitest';
import {
  bubbleCoversAssistantStepHint,
  bubbleLooksLikeGuidedWhereAmIAnswer,
  buildFlowCheckpoint,
  classifyDreUserIntent,
  composeGuidedWhereAmIAnswer,
  isGuidedFlowContinuationMessage,
  isGuidedFlowStatusQuestionMessage,
  runGuidedFlowStatusQuestionTurn,
  runLocalAssistantTurn,
  shouldUseDeterministicAssistantTurn,
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

describe('isGuidedFlowStatusQuestionMessage', () => {
  it('detecta pergunta pela etapa atual', () => {
    expect(isGuidedFlowStatusQuestionMessage('em qual etapa estamos?')).toBe(true);
    expect(isGuidedFlowStatusQuestionMessage('Em que fase estamos?')).toBe(true);
    expect(classifyDreUserIntent('em qual etapa estamos?')).toBe('dre_on_topic');
  });

  it('não confunde com texto longo demais', () => {
    const longText = `${'lorem '.repeat(80)} em qual etapa estamos`;
    expect(isGuidedFlowStatusQuestionMessage(longText)).toBe(false);
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

describe('bubbleLooksLikeGuidedWhereAmIAnswer', () => {
  const catalog: DreInputCatalogLine[] = [
    mockLine('fee_cards', 'Taxa com Cartões'),
    mockLine('other', 'Outra linha'),
  ];

  it('reconhece texto tipo composeGuidedWhereAmIAnswer', () => {
    const { answer } = composeGuidedWhereAmIAnswer({
      lines: catalog,
      currentValues: {},
      guidedLineCode: 'fee_cards',
    });
    expect(bubbleLooksLikeGuidedWhereAmIAnswer(answer)).toBe(true);
  });

  it('não confunde copy genérica de orientação/off-topic', () => {
    const generic =
      'Para eu ser mais útil, vamos pela planilha: o que preencher, onde e por quê. Se quiser, focamos em «Taxa com Cartões».';
    expect(bubbleLooksLikeGuidedWhereAmIAnswer(generic)).toBe(false);
  });
});

describe('runGuidedFlowStatusQuestionTurn / modo orientação', () => {
  const catalog: DreInputCatalogLine[] = [
    mockLine('fee_cards', 'Taxa com Cartões'),
    mockLine('other', 'Outra linha'),
  ];

  it('responde com fase numérica e nome do campo sem cair em off-topic genérico', () => {
    const r = runLocalAssistantTurn({
      message: 'em qual etapa estamos?',
      lines: catalog,
      currentValues: {},
      currentLineCode: 'fee_cards',
      explainOnly: true,
    });
    expect(r.mode).toBe('fallback');
    expect(r.answer).toMatch(/fase\s+1\b/i);
    expect(r.answer).toMatch(/Taxa com Cartões/);
    expect(r.answer.toLowerCase()).not.toMatch(/para eu ser mais util|planilha: o que preencher/);
    expect(shouldUseDeterministicAssistantTurn('qual fase estamos?')).toBe(true);
    const bare = runGuidedFlowStatusQuestionTurn({
      lines: catalog,
      currentValues: {},
      guidedLineCode: 'fee_cards',
    });
    expect(bare.turn.answer).toContain('Taxa com Cartões');
    expect(bare.drePhase).toBe(1);
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
