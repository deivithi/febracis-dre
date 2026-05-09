import {
  BadgeCheck,
  BookOpenText,
  Building2,
  Calculator,
  ClipboardCheck,
  Eye,
  Landmark,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAccessProfile } from '../auth/useAccessProfile';
import { GuideDemoScriptTrail } from './GuideDemoScriptTrail';
import { GuideLearningTrail } from './GuideLearningTrail';
import './GuidePage.css';

type MatrixAccent = 'gold' | 'blue';

interface RoleMatrixRow {
  role: string;
  scope: string;
  can: string;
  accent: MatrixAccent;
}

const platformPillars = [
  {
    title: 'Cadastro e escopo',
    description:
      'O admin cria usuários, define o papel e prende o acesso ao código da coligada, regional ou rede.',
    icon: Users,
  },
  {
    title: 'Coleta oficial da DRE',
    description:
      'A franquia preenche apenas as linhas editáveis. O cálculo nasce na submissão, não no dashboard.',
    icon: Building2,
  },
  {
    title: 'Orientação na submissão',
    description:
      'Em Submissões, o painel orienta o preenchimento com comandos estáveis e histórico por submissão. Quem edita pode registrar valores pela conversa; só leitura permanece em modo orientação. Com API: motor online; sem chave: modo guiado local determinístico.',
    icon: BookOpenText,
  },
  {
    title: 'Revisão e governança',
    description:
      'A controladoria assume a revisão, aprova ou devolve. Cada transição alimenta histórico e auditoria.',
    icon: ClipboardCheck,
  },
  {
    title: 'Visões executivas',
    description:
      'O dashboard consome apenas saídas oficiais: DRE calculada, KPIs consolidados e status validados.',
    icon: Eye,
  },
];

const roleMatrix: RoleMatrixRow[] = [
  {
    role: 'System admin',
    scope: 'Rede inteira',
    can: 'Configura usuários, prepara ou zera demo, consulta todos os módulos e pode operar submissão.',
    accent: 'gold',
  },
  {
    role: 'Finance controller',
    scope: 'Rede ou escopo definido',
    can: 'Assume revisão, aprova, devolve para ajuste, acompanha auditoria e governança.',
    accent: 'blue',
  },
  {
    role: 'Regional manager',
    scope: 'Regional vinculada',
    can: 'Compara franquias da carteira, acompanha dashboards e enxerga submissões do escopo em modo de leitura; o painel DRE responde só em orientação (sem aplicar valores por conversa).',
    accent: 'gold',
  },
  {
    role: 'Franchise user',
    scope: 'Coligada vinculada',
    can: 'Preenche a DRE da própria unidade, salva rascunho, envia para revisão e acompanha retorno.',
    accent: 'blue',
  },
  {
    role: 'Viewer',
    scope: 'Rede, regional ou coligada',
    can: 'Modo leitura: Dashboard e Guia. O menu oculta Submissões e demais módulos operacionais; URLs diretas exibem aviso de permissão.',
    accent: 'gold',
  },
];

const franchiseJourney = [
  'Seleciona a coligada, a competência e o evento.',
  'Cria ou reutiliza a versão corrente da submissão.',
  'Preenche somente as linhas de input da DRE — pode usar o painel de orientação (Olá, atalhos ou texto livre; Enter envia, Shift+Enter quebra linha).',
  'Vê o preview de RBV, MC1, MC2 e EBITDA em tempo real.',
  'Salva rascunho, executa validações e envia para revisão.',
];

const reviewJourney = [
  'A controladoria abre a fila de submissões pendentes.',
  'Seleciona a unidade e analisa DRE, validações e histórico.',
  'Marca em revisão, aprova ou devolve para ajuste com justificativa.',
  'O status oficial da submissão muda e o dashboard consome a nova leitura.',
];

type FormulaVariant = 'gold' | 'blue';

interface GuideFormula {
  id: string;
  label: string;
  expression: string;
  variant: FormulaVariant;
}

const formulas: GuideFormula[] = [
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

const mondayDemoScript = [
  {
    stepNumber: 1,
    title: 'Abrir a visão do produto',
    description:
      'Entrar pelo login e contextualizar que o portal organiza a coleta da DRE, a revisão e a leitura executiva.',
  },
  {
    stepNumber: 2,
    title: 'Mostrar a governança de acesso',
    description:
      'Entrar em Configurações e explicar que o admin cria usuários, define papel e prende o acesso ao código da coligada correto.',
  },
  {
    stepNumber: 3,
    title: 'Simular a jornada da franquia',
      description:
      'Abrir Submissões, selecionar coligada, competência e evento, mostrar o painel de orientação (thread + compositor), editar linhas da DRE e destacar o preview automático.',
  },
  {
    stepNumber: 4,
    title: 'Simular a jornada da controladoria',
    description:
      'Abrir Aprovações, assumir revisão, aprovar ou devolver para ajuste e explicar a trilha de governança.',
  },
  {
    stepNumber: 5,
    title: 'Fechar no dashboard',
    description:
      'Mostrar que o dashboard não é o início da história: ele exibe a saída oficial consolidada por escopo.',
  },
];

export function GuidePage() {
  const accessQuery = useAccessProfile();
  const showViewerHint = accessQuery.data?.primaryRole?.code === 'viewer';

  return (
    <div className="page-stack guide-page">
      {showViewerHint ? (
        <div className="inline-message guide-page__viewer-banner" role="status">
          <strong>Modo leitura (viewer):</strong> utilize o <strong>Dashboard</strong> e este{' '}
          <strong>Guia</strong>. Submissões, aprovações e demais módulos operacionais exigem perfis com permissão
          explícita; o menu oculta o que não se aplica e atalhos diretos mostram uma página de acesso restrito.
        </div>
      ) : null}

      <section className="guide-hero card card--gold">
        <div className="guide-hero__copy">
          <span className="badge badge--gold">Guia oficial da plataforma</span>
          <h1 className="page-container__title">Como explicar o sistema com segurança</h1>
          <p className="page-container__subtitle guide-hero__subtitle">
            Este material resume o objetivo do produto, a lógica da DRE, o modelo de acesso e a narrativa recomendada
            para a apresentação.
          </p>
          <p className="guide-hero__cta">
            <a href="#trilha" className="guide-hero__cta-link">
              Começar a trilha (minicurso em 3 passos)
            </a>
          </p>
        </div>

        <div className="guide-hero__panel glass">
          <div className="guide-hero__panel-header">
            <Landmark size={16} aria-hidden />
            <span>Tese central</span>
          </div>
          <p className="guide-hero__panel-text">
            O dado nasce na franquia, passa pela controladoria e chega ao executivo como leitura oficial. O portal
            existe para padronizar esse caminho com governança, cálculo e trilha de auditoria.
          </p>
        </div>
      </section>

      <GuideLearningTrail showViewerHint={showViewerHint} />

      <section className="guide-pillars-section" aria-labelledby="guide-pillars-heading">
        <h2 id="guide-pillars-heading" className="guide-pillars-section__title">
          Pilares da plataforma
        </h2>
        <p className="guide-pillars-section__subtitle">
          Visão rápida — passe o cursor sobre cada item para ler o detalhe (ou consulte a trilha acima).
        </p>
        <div className="guide-pillars-strip" role="list">
          {platformPillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="guide-pillar-chip"
                role="listitem"
                title={pillar.description}
              >
                <span className="guide-pillar-chip__icon" aria-hidden>
                  <Icon size={18} />
                </span>
                <span className="guide-pillar-chip__label">{pillar.title}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section id="matriz-acesso" className="card">
        <div className="card__header">
          <div>
            <h2 className="card__title">Consulta rápida — matriz de acesso</h2>
            <p className="card__subtitle">
              O papel define o que a pessoa pode fazer. O escopo define onde ela pode fazer.
            </p>
          </div>
          <BookOpenText size={18} aria-hidden />
        </div>
        <div className="card__body card__body--compact">
          <div className="table-shell guide-matrix">
            <table className="data-table guide-matrix__table">
              <thead>
                <tr>
                  <th scope="col">Perfil</th>
                  <th scope="col">Escopo</th>
                  <th scope="col">Capacidade principal</th>
                </tr>
              </thead>
              <tbody>
                {roleMatrix.map((row) => (
                  <tr key={row.role} className={`guide-matrix__row guide-matrix__row--${row.accent}`}>
                    <td>
                      <span className="guide-matrix__role">{row.role}</span>
                    </td>
                    <td>{row.scope}</td>
                    <td>{row.can}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="guide-accordions card" aria-label="Detalhe das jornadas operacionais">
        <div className="card__header">
          <div>
            <h2 className="card__title">Jornadas em detalhe</h2>
            <p className="card__subtitle">Expandir para ver o passo a passo completo de cada lado do processo.</p>
          </div>
          <BadgeCheck size={18} aria-hidden />
        </div>
        <div className="card__body guide-accordions__body">
          <details className="guide-accordion">
            <summary className="guide-accordion__summary">
              <span className="guide-accordion__summary-inner">
                <Building2 size={18} aria-hidden />
                Jornada da franquia
              </span>
              <span className="guide-accordion__chevron" aria-hidden />
            </summary>
            <div className="guide-accordion__content">
              <p className="guide-accordion__intro">O que o franqueado faz dentro da plataforma.</p>
              <ol className="guide-list guide-list--rail">
                {franchiseJourney.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </details>

          <details className="guide-accordion">
            <summary className="guide-accordion__summary">
              <span className="guide-accordion__summary-inner">
                <ShieldCheck size={18} aria-hidden />
                Jornada da controladoria
              </span>
              <span className="guide-accordion__chevron" aria-hidden />
            </summary>
            <div className="guide-accordion__content">
              <p className="guide-accordion__intro">Como a governança fecha o ciclo operacional.</p>
              <ol className="guide-list guide-list--rail">
                {reviewJourney.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          </details>
        </div>
      </section>

      <div className="page-grid page-grid--wide">
        <section id="logica-dre" className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Lógica da DRE</h2>
              <p className="card__subtitle">
                Estas são as fórmulas principais que o sistema recalcula automaticamente.
              </p>
            </div>
            <Calculator size={18} aria-hidden />
          </div>
          <div className="card__body">
            <div className="guide-formulas">
              {formulas.map((formula) => (
                <div
                  key={formula.id}
                  className={`guide-formulas__item guide-formulas__item--${formula.variant}`}
                >
                  <div className="guide-formulas__label">{formula.label}</div>
                  <code className="guide-formulas__code">
                    {formula.label} = {formula.expression}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="roteiro-demo" className="card">
          <div className="card__header">
            <div>
              <h2 className="card__title">Roteiro da demo</h2>
              <p className="card__subtitle">Checklist na ordem recomendada para explicar o produto com clareza.</p>
            </div>
            <ClipboardCheck size={18} aria-hidden />
          </div>
          <div className="card__body card__body--demo-trail">
            <GuideDemoScriptTrail steps={mondayDemoScript} />
          </div>
        </section>
      </div>
    </div>
  );
}
