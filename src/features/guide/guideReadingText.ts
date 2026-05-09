import { JOURNEY_STEPS } from './journeyContent';
import { demoPresentationSteps, formulas, franchiseJourney, reviewJourney, roleMatrix } from './guide-data';

/** Corpus de leitura dos pilares (espelha textos da secção G06; evita import Rolldown sensível a caminho). */
const GUIDE_PILLARS_READING_SNIPPETS = [
  'Cadastro e escopo Cada usuária enxerga apenas o que pode operar — segurança por desenho.',
  'Coleta oficial da DRE Padronização da entrada elimina divergência entre franquias.',
  'Orientação na submissão Assistente IA reduz erro humano no preenchimento.',
  'Revisão e governança Trilha de aprovação institucional com parecer auditável.',
  'Visões executivas Cockpit consolidado consome apenas dados oficialmente aprovados.',
] as const;
const HERO_BLOCK = `
Como explicar o sistema com segurança
Este material resume o objetivo do produto, a lógica da DRE, o modelo de acesso e a narrativa recomendada
para a apresentação.
O dado nasce na franquia, passa pela controladoria e chega ao executivo como leitura oficial. O portal
existe para padronizar esse caminho com governança, cálculo e trilha de auditoria.
`.trim();

const FLOW_BLOCK = `
COMO O DADO FLUI
Do preenchimento à decisão executiva, em 4 movimentos auditáveis
Maria franqueada Motor SQL Carlos controladoria Roberto holding submissão motor SQL aprovação dashboard cockpit KPIs.
`.trim();

function journeyCorpus(): string {
  const parts: string[] = [];
  for (const step of JOURNEY_STEPS) {
    parts.push(step.title, step.shortDescription, ...step.summaryBullets);
  }
  return parts.join(' ');
}

function matrixCorpus(): string {
  return roleMatrix.map((r) => `${r.role} ${r.scope} ${r.can}`).join(' ');
}

function formulasCorpus(): string {
  return formulas.map((f) => `${f.label} ${f.expression}`).join(' ');
}

function demoCorpus(): string {
  return demoPresentationSteps.map((s) => `${s.title} ${s.description}`).join(' ');
}

/** Texto agregado do Guia visível (hero, fluxo, trilha, pilares, matriz, jornadas, demo, fórmulas). */
export const GUIDE_READING_CORPUS = [
  HERO_BLOCK,
  FLOW_BLOCK,
  journeyCorpus(),
  GUIDE_PILLARS_READING_SNIPPETS.join(' '),
  matrixCorpus(),
  franchiseJourney.join(' '),
  reviewJourney.join(' '),
  demoCorpus(),
  formulasCorpus(),
].join('\n');
