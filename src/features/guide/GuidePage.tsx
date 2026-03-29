import {
  BadgeCheck,
  BookOpenText,
  Building2,
  Calculator,
  ClipboardCheck,
  Eye,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';
import { useAccessProfile } from '../auth/useAccessProfile';
import './GuidePage.css';

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
    title: 'Assistente guiado (chat)',
    description:
      'Na tela de Submissões, o assistente conversa no estilo de um chat moderno (paleta Febracis), com atalhos e compositor fixo. Com API configurada, respostas online; sem chave, modo guiado local.',
    icon: Sparkles,
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

const roleMatrix = [
  {
    role: 'System admin',
    scope: 'Rede inteira',
    can: 'Configura usuários, prepara ou zera demo, consulta todos os módulos e pode operar submissão.',
  },
  {
    role: 'Finance controller',
    scope: 'Rede ou escopo definido',
    can: 'Assume revisão, aprova, devolve para ajuste, acompanha auditoria e governança.',
  },
  {
    role: 'Regional manager',
    scope: 'Regional vinculada',
    can: 'Compara franquias da carteira, acompanha dashboards e enxerga submissões do escopo em modo de leitura.',
  },
  {
    role: 'Franchise user',
    scope: 'Coligada vinculada',
    can: 'Preenche a DRE da própria unidade, salva rascunho, envia para revisão e acompanha retorno.',
  },
  {
    role: 'Viewer',
    scope: 'Rede, regional ou coligada',
    can: 'Modo leitura: Dashboard e Guia. O menu oculta Submissões e demais módulos operacionais; URLs diretas exibem aviso de permissão.',
  },
];

const franchiseJourney = [
  'Seleciona a coligada, a competência e o evento.',
  'Cria ou reutiliza a versão corrente da submissão.',
  'Preenche somente as linhas de input da DRE — pode usar o assistente (Olá, atalhos ou texto livre; Enter envia, Shift+Enter quebra linha).',
  'Vê o preview de RBV, MC1, MC2 e EBITDA em tempo real.',
  'Salva rascunho, executa validações e envia para revisão.',
];

const reviewJourney = [
  'A controladoria abre a fila de submissões pendentes.',
  'Seleciona a unidade e analisa DRE, validações e histórico.',
  'Marca em revisão, aprova ou devolve para ajuste com justificativa.',
  'O status oficial da submissão muda e o dashboard consome a nova leitura.',
];

const formulas = [
  'deductions_total = soma de todas as deduções',
  'mc1 = gross_revenue - deductions_total',
  'event_expenses_total = soma das despesas de evento',
  'marketing_total = soma das despesas de marketing',
  'default_net = default_gross - default_recovery',
  'mc2 = mc1 - event_expenses_total - variable_expenses - marketing_total - default_net',
  'ebitda_1 = mc2 - people - cto - utilities_services - general_expenses',
  'ebitda_2 = ebitda_1 - taxes',
];

const mondayDemoScript = [
  {
    title: '1. Abrir a visão do produto',
    description:
      'Entrar pelo login e contextualizar que o portal organiza a coleta da DRE, a revisão e a leitura executiva.',
  },
  {
    title: '2. Mostrar a governança de acesso',
    description:
      'Entrar em Configurações e explicar que o admin cria usuários, define papel e prende o acesso ao código da coligada correto.',
  },
  {
    title: '3. Simular a jornada da franquia',
    description:
      'Abrir Submissões, selecionar coligada, competência e evento, mostrar o assistente (thread + compositor), editar linhas da DRE e destacar o preview automático.',
  },
  {
    title: '4. Simular a jornada da controladoria',
    description:
      'Abrir Aprovações, assumir revisão, aprovar ou devolver para ajuste e explicar a trilha de governança.',
  },
  {
    title: '5. Fechar no dashboard',
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
            Este material resume o objetivo do produto, a lógica da DRE, o modelo de acesso e a
            narrativa recomendada para a apresentação.
          </p>
        </div>

        <div className="guide-hero__panel glass">
          <div className="guide-hero__panel-header">
            <Sparkles size={16} />
            <span>Tese central</span>
          </div>
          <p className="guide-hero__panel-text">
            O dado nasce na franquia, passa pela controladoria e chega ao executivo como leitura
            oficial. O portal existe para padronizar esse caminho com governança, cálculo e trilha
            de auditoria.
          </p>
        </div>
      </section>

      <div className="page-grid page-grid--wide">
        {platformPillars.map((pillar) => {
          const Icon = pillar.icon;
          return (
            <article key={pillar.title} className="card guide-card">
              <div className="card__body">
                <div className="guide-card__icon">
                  <Icon size={18} />
                </div>
                <h3 className="guide-card__title">{pillar.title}</h3>
                <p className="guide-card__text">{pillar.description}</p>
              </div>
            </article>
          );
        })}
      </div>

      <div className="page-grid page-grid--wide">
        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Matriz de acesso</h3>
              <p className="card__subtitle">
                O papel define o que a pessoa pode fazer. O escopo define onde ela pode fazer.
              </p>
            </div>
            <BookOpenText size={18} />
          </div>
          <div className="card__body card__body--compact">
            <div className="table-shell">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Perfil</th>
                    <th>Escopo</th>
                    <th>Capacidade principal</th>
                  </tr>
                </thead>
                <tbody>
                  {roleMatrix.map((row) => (
                    <tr key={row.role}>
                      <td>{row.role}</td>
                      <td>{row.scope}</td>
                      <td>{row.can}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Regra mais importante</h3>
              <p className="card__subtitle">O dashboard é a ponta final do processo.</p>
            </div>
            <BadgeCheck size={18} />
          </div>
          <div className="card__body">
            <div className="list-stack">
              <div className="list-row">
                <div>
                  <div className="list-row__title">1. Entrada</div>
                  <div className="list-row__meta">
                    A unidade informa a DRE na tela de Submissões.
                  </div>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <div className="list-row__title">2. Motor de cálculo</div>
                  <div className="list-row__meta">
                    Funções SQL recalculam MC1, MC2, EBITDA 1, EBITDA 2 e percentuais.
                  </div>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <div className="list-row__title">3. Workflow</div>
                  <div className="list-row__meta">
                    A controladoria valida, aprova ou devolve para ajuste.
                  </div>
                </div>
              </div>
              <div className="list-row">
                <div>
                  <div className="list-row__title">4. Dashboard</div>
                  <div className="list-row__meta">
                    As views oficiais refletem o resultado consolidado por escopo.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="page-grid page-grid--wide">
        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Jornada da franquia</h3>
              <p className="card__subtitle">O que o franqueado faz dentro da plataforma.</p>
            </div>
            <Building2 size={18} />
          </div>
          <div className="card__body">
            <ol className="guide-list">
              {franchiseJourney.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Jornada da controladoria</h3>
              <p className="card__subtitle">Como a governança fecha o ciclo operacional.</p>
            </div>
            <ShieldCheck size={18} />
          </div>
          <div className="card__body">
            <ol className="guide-list">
              {reviewJourney.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="page-grid page-grid--wide">
        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Lógica da DRE</h3>
              <p className="card__subtitle">
                Estas são as fórmulas principais que o sistema recalcula automaticamente.
              </p>
            </div>
            <Calculator size={18} />
          </div>
          <div className="card__body">
            <div className="guide-formulas">
              {formulas.map((formula) => (
                <div key={formula} className="guide-formulas__item">
                  <code>{formula}</code>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Roteiro da demo de segunda-feira</h3>
              <p className="card__subtitle">
                Ordem recomendada para explicar o produto com clareza.
              </p>
            </div>
            <ClipboardCheck size={18} />
          </div>
          <div className="card__body">
            <div className="list-stack">
              {mondayDemoScript.map((step) => (
                <div key={step.title} className="list-row">
                  <div>
                    <div className="list-row__title">{step.title}</div>
                    <div className="list-row__meta">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
