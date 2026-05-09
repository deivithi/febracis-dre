export type MatrixAccent = 'gold' | 'blue';

export interface RoleMatrixRow {
  role: string;
  scope: string;
  can: string;
  accent: MatrixAccent;
}

export type GuideRoleKey =
  | 'system_admin'
  | 'finance_controller'
  | 'regional_manager'
  | 'franchise_user'
  | 'viewer';

export interface GuideRoleProfile {
  roleKey: GuideRoleKey;
  title: string;
  scopePill: string;
  primaryAction: string;
  bullets: string[];
  /** Popover: antiga coluna «Capacidade principal» + recortes RLS/rotas da documentação interna. */
  technicalDetails: string[];
}

export const guideRoleProfiles: GuideRoleProfile[] = [
  {
    roleKey: 'system_admin',
    title: 'System admin',
    scopePill: 'Rede inteira',
    primaryAction: 'Configura usuários e prepara o ambiente',
    bullets: [
      'Cria contas e amarra papel à coligada correta.',
      'Consulta todos os módulos e pode operar submissão em suporte.',
      'Prepara ou zera cenários demo sem ruído operacional.',
    ],
    technicalDetails: [
      'Texto original (matriz): configura usuários, prepara ou zera demo, consulta todos os módulos e pode operar submissão.',
      'Rotas SPA: Configurações e demais áreas administrativas sem teto de escopo singular.',
      'RLS (`002_rls`): `is_admin()` libera escritas privilegiadas em catálogo, reporting periods e superfícies admin.',
    ],
  },
  {
    roleKey: 'finance_controller',
    title: 'Finance controller',
    scopePill: 'Rede ou escopo',
    primaryAction: 'Aprova ou devolve DREs com parecer',
    bullets: [
      'Centraliza revisão dentro do escopo atribuído.',
      'Assumir revisão, aprovar ou devolver com justificativa.',
      'Acompanha auditoria e governança alinhadas ao mesmo recorte.',
    ],
    technicalDetails: [
      'Texto original (matriz): assume revisão, aprova, devolve para ajuste, acompanha auditoria e governança.',
      'SPA: fluxo típico em `/app/workflow` — filas de aprovação coerentes com o papel.',
      'RLS: `can_manage_review()` habilita UPDATE em submissions acessíveis e leitura de audit_log onde aplicável.',
    ],
  },
  {
    roleKey: 'regional_manager',
    title: 'Regional manager',
    scopePill: 'Regional vinculada',
    primaryAction: 'Compara franquias da carteira em modo leitura',
    bullets: [
      'KPIs e submissões visíveis só para a regional vinculada.',
      'Compara unidades sem editar valores da DRE no fluxo franquia.',
      'Assistente responde em orientação, sem gravar linhas por conversa.',
    ],
    technicalDetails: [
      'Texto original (matriz): compara franquias da carteira, acompanha dashboards e enxerga submissões do escopo em modo leitura; painel DRE só orientação.',
      'RLS: leitura via `can_access_franchise(franchise_id)` para franquias dentro do desenho regional.',
      'Escrita de valores na submission permanece com `franchise_user` + `can_operate_submission`.',
    ],
  },
  {
    roleKey: 'franchise_user',
    title: 'Franchise user',
    scopePill: 'Coligada vinculada',
    primaryAction: 'Preenche e envia a DRE da própria unidade',
    bullets: [
      'Edição circunscrita à coligada vinculada ao login.',
      'Rascunho, validações e envio para revisão no mesmo fluxo.',
      'Acompanha retorno da controladoria até fechamento.',
    ],
    technicalDetails: [
      'Texto original (matriz): preenche a DRE da própria unidade, salva rascunho, envia para revisão e acompanha retorno.',
      'RLS: INSERT/UPDATE `submissions` e linhas de input exigem `can_operate_submission(franchise_id)` ativo.',
      'SPA: `/app/submissions` e assistente respeitam bloqueio quando submission está fora do estado editável.',
    ],
  },
  {
    roleKey: 'viewer',
    title: 'Viewer',
    scopePill: 'Conforme atribuição',
    primaryAction: 'Lê dashboard e guia institucional',
    bullets: [
      'Dashboard executivo liberado em modo leitura.',
      'Guia e narrativa institucional sempre acessíveis.',
      'Menu omite módulos operacionais; URL direta mostra aviso de permissão.',
    ],
    technicalDetails: [
      'Texto original (matriz): modo leitura — Dashboard e Guia; menu oculta Submissões; URLs diretas exibem aviso de permissão.',
      'SPA: `ProtectedRoute` esconde rotas operacionais; deep links caem em `/app/forbidden` quando papel não cobre rota.',
      'RLS: leituras condicionadas a `can_access_franchise` sem privilegiar INSERT/UPDATE de submission.',
    ],
  },
];

/** Mantido para TTS / leitura linear (`guideReadingText`) — derivado dos cartões G05. */
export const roleMatrix: RoleMatrixRow[] = guideRoleProfiles.map((p, i) => ({
  role: p.title,
  scope: p.scopePill,
  can: `${p.primaryAction} ${p.bullets.join(' ')}`,
  accent: i % 2 === 0 ? 'gold' : 'blue',
}));

/** G09 · Passos title + subtitle para checklist da jornada da franquia (Maria). */
export interface JourneyChecklistStep {
  title: string;
  subtitle: string;
}

export const franchiseJourneySteps: JourneyChecklistStep[] = [
  {
    title: 'Contexto operacional',
    subtitle: 'Seleciona a coligada, a competência e o evento.',
  },
  {
    title: 'Versão da submissão',
    subtitle: 'Cria ou reutiliza a versão corrente da submissão.',
  },
  {
    title: 'Preenchimento da DRE',
    subtitle:
      'Preenche somente as linhas de input — painel de orientação (Olá, atalhos ou texto livre; Enter envia, Shift+Enter quebra linha).',
  },
  {
    title: 'Preview em tempo real',
    subtitle: 'Vê RBV, MC1, MC2 e EBITDA conforme edita.',
  },
  {
    title: 'Validação e envio',
    subtitle: 'Salva rascunho, executa validações e envia para revisão.',
  },
  {
    title: 'Acompanhamento',
    subtitle: 'Acompanha status, parecer e ajusta se a controladoria devolver.',
  },
];

/** G09 · Passos da jornada da controladoria (Carlos). */
export const reviewJourneySteps: JourneyChecklistStep[] = [
  {
    title: 'Fila de trabalho',
    subtitle: 'A controladoria abre a fila de submissões pendentes.',
  },
  {
    title: 'Seleção e contexto',
    subtitle: 'Seleciona a unidade e confere competência, evento e histórico.',
  },
  {
    title: 'Análise integrada',
    subtitle: 'Analisa DRE, validações automáticas e trilha de versões.',
  },
  {
    title: 'Decisão formal',
    subtitle: 'Marca em revisão, aprova ou devolve para ajuste com justificativa.',
  },
  {
    title: 'Comunicação ao franqueado',
    subtitle: 'O franqueado vê status, parecer e próximos passos na própria submissão.',
  },
  {
    title: 'Leitura no dashboard',
    subtitle: 'O status oficial muda; o dashboard consome apenas leituras homologadas.',
  },
  {
    title: 'Governança e auditoria',
    subtitle: 'Pareceres e decisões ficam registrados para conferência e relatórios.',
  },
];

/** Texto plano agregado (guia / leitura / TTS). */
export const franchiseJourney = franchiseJourneySteps.map((s) => `${s.title}. ${s.subtitle}`);

export const reviewJourney = reviewJourneySteps.map((s) => `${s.title}. ${s.subtitle}`);

export type FormulaVariant = 'gold' | 'blue';

export interface GuideFormula {
  id: string;
  label: string;
  expression: string;
  variant: FormulaVariant;
}

export const formulas: GuideFormula[] = [
  {
    id: 'deductions_total',
    label: 'deductions_total',
    expression: 'soma de todas as deduções',
    variant: 'blue',
  },
  {
    id: 'mc1',
    label: 'mc1',
    expression: 'gross_revenue - deductions_total',
    variant: 'gold',
  },
  {
    id: 'event_expenses_total',
    label: 'event_expenses_total',
    expression: 'soma das despesas de evento',
    variant: 'blue',
  },
  {
    id: 'marketing_total',
    label: 'marketing_total',
    expression: 'soma das despesas de marketing',
    variant: 'gold',
  },
  {
    id: 'default_net',
    label: 'default_net',
    expression: 'default_gross - default_recovery',
    variant: 'blue',
  },
  {
    id: 'mc2',
    label: 'mc2',
    expression:
      'mc1 - event_expenses_total - variable_expenses - marketing_total - default_net',
    variant: 'gold',
  },
  {
    id: 'ebitda_1',
    label: 'ebitda_1',
    expression: 'mc2 - people - cto - utilities_services - general_expenses',
    variant: 'blue',
  },
  {
    id: 'ebitda_2',
    label: 'ebitda_2',
    expression: 'ebitda_1 - taxes',
    variant: 'gold',
  },
];

export const DEMO_ROADMAP_CTA_LABEL = 'Abrir esta tela →' as const;
export const DEMO_ROADMAP_STEP_TOTAL = 5 as const;

export interface DemoPresentationStep {
  step: number;
  title: string;
  description: string;
  href: string;
}

/** Roteiro G08 — cinco telas; rotas alinhadas a `App.tsx` e `navigation.ts`. */
export const demoPresentationSteps: DemoPresentationStep[] = [
  {
    step: 1,
    title: 'Abrir a visão do produto',
    description: 'Entrar pelo login e contextualizar o portal Febracis-DRE.',
    href: '/app/dashboard',
  },
  {
    step: 2,
    title: 'Mostrar a governança de acesso',
    description: 'Demonstrar como Configurações define papéis, escopos e segurança.',
    href: '/app/admin',
  },
  {
    step: 3,
    title: 'Simular a jornada da franquia',
    description: 'Selecionar coligada e competência, preencher linhas editáveis, ver preview do motor.',
    href: '/app/submissions',
  },
  {
    step: 4,
    title: 'Simular a jornada da controladoria',
    description: 'Assumir revisão na fila, aprovar ou devolver com parecer formal.',
    href: '/app/workflow',
  },
  {
    step: 5,
    title: 'Fechar no dashboard executivo',
    description: 'Mostrar como o cockpit consolida apenas o que passou pela governança.',
    href: '/app/dashboard',
  },
];
