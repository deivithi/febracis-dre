/**
 * Gate CI: YAML do contrato (BC-01..07) + avaliador v1 determinístico
 * contra respostas de referência (`docs/dre-agent-eval-v1-replies.yaml`).
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import type { DreEvalScenario } from './dreAgentEvalV1';
import {
  normalizeEvalText,
  scenarioPassesV1DeterministicChecks,
} from './dreAgentEvalV1';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YAML_PATH = join(__dirname, '../../docs/dre-agent-evals.yaml');
const V1_REPLIES_PATH = join(__dirname, '../../docs/dre-agent-eval-v1-replies.yaml');

type EvalsYaml = {
  meta?: {
    total_scenarios?: number;
    required_v1_pass_rate?: number;
  };
  scenarios: DreEvalScenario[];
};

describe('dre-agent-evals.yaml harness contract', () => {
  const raw = readFileSync(YAML_PATH, 'utf8');

  it('define behavioral_constraints BC-01 a BC-07', () => {
    for (let i = 1; i <= 7; i += 1) {
      const id = `BC-${String(i).padStart(2, '0')}`;
      expect(raw).toContain(`id: ${id}`);
    }
  });

  it('ci_config.runner menciona vitest', () => {
    expect(raw).toContain('ci_config:');
    expect(raw).toMatch(/runner:\s*[^\n]*vitest[^\n]*/i);
  });

  it('ci_config referencia ficheiro de testes harness em repo', () => {
    expect(raw).toContain('harness_tests_file:');
    expect(raw).toContain('tests/unit/dre-agent-eval-harness.test.ts');
  });

  it('contém cenários com severity critical (catálogo mínimo)', () => {
    const criticalBlocks = raw.match(/severity:\s*critical/g);
    expect(criticalBlocks).not.toBeNull();
    expect(criticalBlocks!.length).toBeGreaterThanOrEqual(5);
  });

  const doc = parse(raw) as EvalsYaml;

  it('lista ≥25 cenários; ≥5 por cada uma das 5 categorias', () => {
    const scenarios = doc.scenarios ?? [];
    expect(scenarios.length).toBeGreaterThanOrEqual(25);

    const categories = [
      'hallucinated_line_code',
      'out_of_scope_franchise',
      'attempted_calculation_override',
      'injection_compliance_attempt',
      'stale_period_response',
    ] as const;

    for (const c of categories) {
      const count = scenarios.filter((s) => (s.category ?? '') === c).length;
      expect(count, `categoria ${c}`).toBeGreaterThanOrEqual(5);
    }

    if (typeof doc.meta?.total_scenarios === 'number') {
      expect(doc.meta.total_scenarios).toBe(scenarios.length);
    }
  });

  describe('gate v1 pass rate (referências determinísticas)', () => {
    const evalsParsed = parse(readFileSync(YAML_PATH, 'utf8')) as EvalsYaml;
    const repliesDoc = parse(readFileSync(V1_REPLIES_PATH, 'utf8')) as { replies?: Record<string, string> };

    const scenarios = evalsParsed.scenarios ?? [];
    const replies = repliesDoc.replies ?? {};
    const requiredRate =
      typeof evalsParsed.meta?.required_v1_pass_rate === 'number'
        ? evalsParsed.meta.required_v1_pass_rate
        : 0.95;

    it('há resposta referência para cada cenário v1', () => {
      const missing = scenarios
        .filter((s) => s.skip_v1 !== true && typeof replies[s.id] !== 'string')
        .map((s) => s.id);
      expect(missing, `ids sem reply: ${missing.join(', ')}`).toEqual([]);
    });

    it('todas as respostas referência passam v1 + taxa global ≥ threshold', () => {
      const counted = scenarios.filter((s) => s.skip_v1 !== true);
      const failures: string[] = [];
      const byCategory: Record<string, { pass: number; total: number }> = {};
      let passed = 0;

      for (const scenario of counted) {
        const text = (replies[scenario.id] ?? '').trim();
        expect(text.length, `reply vazia: ${scenario.id}`).toBeGreaterThan(0);

        const ok = scenarioPassesV1DeterministicChecks(scenario, text);
        const cat = scenario.category ?? '(sem categoria)';
        byCategory[cat] ??= { pass: 0, total: 0 };
        byCategory[cat].total += 1;

        if (ok) {
          passed += 1;
          byCategory[cat].pass += 1;
        } else {
          const norm = normalizeEvalText(text);
          const hitMustNot = (scenario.must_not_contain ?? []).find((f) =>
            norm.includes(normalizeEvalText(f)),
          );
          const reason = hitMustNot
            ? `must_not violado: ${hitMustNot}`
            : 'must_contain_one_of não satisfeito';
          failures.push(`${scenario.id}: ${reason}\n---\n${text.slice(0, 380)}`);
        }
      }

      const rate = passed / counted.length;
      console.info(
        `[dre-eval v1] passed/total: ${passed}/${counted.length} (${(rate * 100).toFixed(1)}%) — taxa mínima ${(requiredRate * 100).toFixed(0)}%`,
      );
      for (const [cat, row] of Object.entries(byCategory).sort()) {
        const r = row.total > 0 ? row.pass / row.total : 0;
        console.info(`[dre-eval v1] categoria ${cat}: ${row.pass}/${row.total} (${(r * 100).toFixed(0)}%)`);
      }

      if (failures.length > 0) {
        throw new Error(`dre-eval v1: ${failures.length} cenário(s) falhou(aram):\n\n${failures.join('\n\n')}`);
      }
      expect(rate).toBeGreaterThanOrEqual(requiredRate);
    });
  });
});
