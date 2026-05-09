/**
 * Avaliador determinístico v1 para respostas do agente DRE (contrato YAML).
 * Usado por `dre-agent-eval-harness.test.ts`.
 */

export type DreEvalScenario = {
  id: string;
  category?: string;
  skip_v1?: boolean;
  must_not_contain?: string[];
  must_contain_one_of?: string[];
};

/** Normalização estável para comparação de texto (case / acentos / espaços). */
export function normalizeEvalText(text: string): string {
  const folded = text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
  return folded.replace(/\s+/g, ' ').trim();
}

/**
 * Passa se nenhum `must_not_contain` aparece e pelo menos um `must_contain_one_of` aparece
 * (quando as listas existem e não estão vazias).
 */
export function scenarioPassesV1DeterministicChecks(scenario: DreEvalScenario, replyText: string): boolean {
  const norm = normalizeEvalText(replyText);

  const mustNot = scenario.must_not_contain ?? [];
  for (const frag of mustNot) {
    if (norm.includes(normalizeEvalText(frag))) {
      return false;
    }
  }

  const mustOne = scenario.must_contain_one_of ?? [];
  if (mustOne.length === 0) {
    return true;
  }

  return mustOne.some((frag) => norm.includes(normalizeEvalText(frag)));
}
