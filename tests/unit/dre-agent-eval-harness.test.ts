/**
 * Gate CI mínimo: presença do contrato YAML (BC-01..07, runner vitest, cenários critical).
 * Não executa os 50 cenários contra o LLM — ver roadmap PRD §9-bis harness completo.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const __dirname = dirname(fileURLToPath(import.meta.url));
const YAML_PATH = join(__dirname, '../../docs/dre-agent-evals.yaml');

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

  it('mantém bloco scenarios com ids canónicos (HLC / OSF / …)', () => {
    expect(raw).toContain('id: HLC-001');
    expect(raw).toContain('id: OSF-001');
    expect(raw).toMatch(/total_scenarios:\s*50/);
  });
});
