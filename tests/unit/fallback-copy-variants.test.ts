import { describe, expect, it } from 'vitest';
import type { DreInputCatalogLine } from '../../src/features/shared/portal.types';
import {
  ASSISTANT_FALLBACK_COPY_VARIANTS,
  buildFallbackCopySeed,
  pickFallbackCopy,
  runLocalAssistantTurn,
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

describe('ASSISTANT_FALLBACK_COPY_VARIANTS', () => {
  it('cada intent mantém pelo menos 2 variantes (pools 2–3)', () => {
    for (const [, lines] of Object.entries(ASSISTANT_FALLBACK_COPY_VARIANTS)) {
      expect(lines.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('ui_realign_banner e explain_continue_anchor_focus variam entre sementes', () => {
    const setUi = new Set<string>();
    const setAnchor = new Set<string>();
    for (let i = 0; i < 30; i++) {
      setUi.add(
        pickFallbackCopy('ui_realign_banner', `line|step|${i}`, { step: `Passo ${i}` }),
      );
      setAnchor.add(
        pickFallbackCopy('explain_continue_anchor_focus', `u${i}`, { field: 'Taxa com Cartões' }),
      );
    }
    expect(setUi.size).toBeGreaterThan(1);
    expect(setAnchor.size).toBeGreaterThan(1);
  });
});

describe('pickFallbackCopy', () => {
  it('é determinístico para a mesma semente e intent', () => {
    const a = pickFallbackCopy('explain_off_topic', 'seed-a|x', { realign: 'VOLTA' });
    const b = pickFallbackCopy('explain_off_topic', 'seed-a|x', { realign: 'VOLTA' });
    expect(a).toBe(b);
    expect(a).toContain('VOLTA');
  });

  it('pode variar entre sementes diferentes (variantes)', () => {
    const variants = new Set<string>();
    for (let i = 0; i < 40; i++) {
      variants.add(
        pickFallbackCopy('explain_off_topic', `user${i}|off_topic|line`, {
          realign: 'OK',
        }),
      );
    }
    expect(variants.size).toBeGreaterThan(1);
  });

  it('buildFallbackCopySeed inclui intent e line_code na chave', () => {
    const s1 = buildFallbackCopySeed('oi', 't', 'a');
    const s2 = buildFallbackCopySeed('oi', 't', 'b');
    expect(s1).not.toBe(s2);
  });
});

describe('runLocalAssistantTurn explain_only — pergunta curta sobre campo', () => {
  const catalog: DreInputCatalogLine[] = [
    line({ section_code: 'rbv', section_name: 'RBV', line_code: 'gross_revenue', line_name: 'Receita Bruta' }),
  ];

  it('"o que representa?" prioriza explicação do campo em foco (não bloco off_topic genérico)', () => {
    const r = runLocalAssistantTurn({
      message: 'o que representa?',
      lines: catalog,
      currentValues: {},
      currentLineCode: 'gross_revenue',
      explainOnly: true,
    });
    expect(r.mode).toBe('fallback');
    expect(r.answer.length).toBeGreaterThan(60);
    expect(r.answer.toLowerCase()).toContain('total bruto');
    expect(r.focusLineCode).toBe('gross_revenue');
  });
});
