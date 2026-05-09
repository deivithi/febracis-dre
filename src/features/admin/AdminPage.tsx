import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  DatabaseZap,
  RefreshCcw,
  Settings,
  ShieldCheck,
  Workflow,
} from 'lucide-react';
import {
  fetchAdminSnapshot,
  resetDemoEnvironment,
  seedDemoEnvironment,
} from '../shared/portal.api';
import type { AdminActionResult } from '../shared/portal.types';
import { AdminAccessPanel } from './AdminAccessPanel';
import { formatDateTime, formatInteger, formatStatusLabel } from '../../utils/formatters';
import './AdminPage.css';

const operationQueryKeys = [
  ['admin-snapshot'],
  ['dashboard'],
  ['submissions'],
  ['workflow'],
  ['franchises'],
  ['audit'],
] as const;

const operatingModel = [
  {
    title: '1. Cadastro e escopo',
    description:
      'Regionais, coligadas, perfis e papéis definem quem envia, quem revisa e quem enxerga cada camada do resultado.',
  },
  {
    title: '2. Coleta da DRE',
    description:
      'Cada unidade registra os inputs oficiais da competência e do evento. O cálculo não nasce no dashboard: ele nasce na submissão.',
  },
  {
    title: '3. Revisão e governança',
    description:
      'A controladoria valida, abre pendências, aprova ou devolve. Cada transição alimenta histórico, auditoria e status oficial.',
  },
  {
    title: '4. Views executivas',
    description:
      'Somente depois da revisão os dados consolidados abastecem as visões de franquia, regional, holding e controladoria.',
  },
];

function OperationFeedback({ result }: { result?: AdminActionResult }) {
  if (!result) {
    return null;
  }

  const details = [
    result.regionals ? `${result.regionals} regionais` : null,
    result.franchises ? `${result.franchises} franquias` : null,
    result.periods ? `${result.periods} competências` : null,
    result.current_submissions ? `${result.current_submissions} submissões atuais` : null,
    result.previous_submissions ? `${result.previous_submissions} submissões históricas` : null,
    result.deleted_submissions ? `${result.deleted_submissions} submissões removidas` : null,
  ].filter(Boolean);

  return (
    <div className="inline-message inline-message--success">
      <div className="admin-feedback">
        <strong>{result.message}</strong>
        {details.length > 0 && <span>{details.join(' • ')}</span>}
      </div>
    </div>
  );
}

export function AdminPage() {
  const queryClient = useQueryClient();
  const adminQuery = useQuery({
    queryKey: ['admin-snapshot'],
    queryFn: fetchAdminSnapshot,
  });

  const refreshPortalData = async () => {
    await Promise.all(
      operationQueryKeys.map((queryKey) =>
        queryClient.invalidateQueries({
          queryKey: [...queryKey],
        }),
      ),
    );
  };

  const prepareDemoMutation = useMutation({
    mutationFn: seedDemoEnvironment,
    onSuccess: refreshPortalData,
  });

  const resetDemoMutation = useMutation({
    mutationFn: resetDemoEnvironment,
    onSuccess: refreshPortalData,
  });

  const latestFeedback = useMemo(
    () => prepareDemoMutation.data ?? resetDemoMutation.data,
    [prepareDemoMutation.data, resetDemoMutation.data],
  );

  const currentError =
    prepareDemoMutation.error instanceof Error
      ? prepareDemoMutation.error.message
      : resetDemoMutation.error instanceof Error
        ? resetDemoMutation.error.message
        : null;

  if (adminQuery.isLoading) {
    return <div className="skeleton skeleton--card" />;
  }

  if (adminQuery.error || !adminQuery.data) {
    return (
      <div className="inline-message inline-message--danger">
        Não foi possível carregar o snapshot administrativo.
      </div>
    );
  }

  const snapshot = adminQuery.data;
  const isMutating = prepareDemoMutation.isPending || resetDemoMutation.isPending;

  const handleResetDemo = () => {
    if (!window.confirm('Deseja zerar apenas o ambiente de demonstração?')) {
      return;
    }

    resetDemoMutation.mutate();
  };

  return (
    <div className="page-stack">
      <section className="admin-hero card card--gold">
        <div className="admin-hero__copy">
          <span className="badge badge--gold">Sistema de verdade, não tela vazia</span>
          <h1 className="page-container__title">Configurações e sala de comando</h1>
          <p className="page-container__subtitle admin-hero__subtitle">
            Esta área controla o ambiente da demonstração e explica a lógica do produto:
            cadastro, escopo por coligada, coleta da DRE, revisão e consolidação executiva.
          </p>
        </div>

        <div className="admin-hero__panel glass">
          <div className="admin-hero__panel-header">
            <ShieldCheck size={18} aria-hidden />
            <span>Ambiente de demonstração</span>
          </div>
          <p className="admin-hero__panel-text">
            Use os botões abaixo para povoar a plataforma com dados consistentes de demo ou para
            limpar somente esse ambiente quando quiser recomeçar. A área de acessos usa o código
            da coligada para limitar a visibilidade correta por unidade.
          </p>
          <div className="admin-hero__actions">
            <button
              type="button"
              data-testid="admin-seed-demo"
              className="btn btn--gold"
              onClick={() => prepareDemoMutation.mutate()}
              disabled={isMutating}
            >
              <DatabaseZap size={18} />
              {prepareDemoMutation.isPending ? 'Preparando demo...' : 'Preparar ambiente demo'}
            </button>
            <button
              type="button"
              data-testid="admin-reset-demo"
              className="btn btn--secondary"
              onClick={handleResetDemo}
              disabled={isMutating}
            >
              <RefreshCcw size={18} />
              {resetDemoMutation.isPending ? 'Zerando demo...' : 'Zerar demonstração'}
            </button>
          </div>
        </div>
      </section>

      {currentError && <div className="inline-message inline-message--danger">{currentError}</div>}
      <OperationFeedback result={latestFeedback} />

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Franquias</span>
            <div className="kpi-card__icon">
              <Settings />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(snapshot.franchises.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Unidades cadastradas</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Regionais</span>
            <div className="kpi-card__icon">
              <Workflow />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(snapshot.regionals.length)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">Estrutura territorial ativa</span>
          </div>
        </div>

        <div className="kpi-card kpi-card--gold">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Submissões</span>
            <div className="kpi-card__icon">
              <DatabaseZap />
            </div>
          </div>
          <div className="kpi-card__value kpi-card__value--gold">
            {formatInteger(snapshot.submissionsCount)}
          </div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">
              {formatInteger(snapshot.currentSubmissionCount)} correntes na view oficial
            </span>
          </div>
        </div>

        <div className="kpi-card kpi-card--warning">
          <div className="kpi-card__header">
            <span className="kpi-card__label">Fila de revisão</span>
            <div className="kpi-card__icon">
              <AlertTriangle />
            </div>
          </div>
          <div className="kpi-card__value">{formatInteger(snapshot.pendingReviewsCount)}</div>
          <div className="kpi-card__footer">
            <span className="kpi-card__percent">
              {formatInteger(snapshot.periodCount)} competências cadastradas
            </span>
          </div>
        </div>
      </div>

      <div className="page-grid page-grid--wide">
        <div className="card">
          <div className="card__header">
            <div>
              <h3 className="card__title">Como o sistema funciona</h3>
              <p className="card__subtitle">
                Esta é a narrativa oficial do produto para a apresentação.
              </p>
            </div>
          </div>
          <div className="card__body">
            <div className="admin-flow">
              {operatingModel.map((step) => (
                <article key={step.title} className="admin-flow__step">
                  <h4 className="admin-flow__title">{step.title}</h4>
                  <p className="admin-flow__description">{step.description}</p>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="dashboard__side">
          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Leitura operacional atual</h3>
            </div>
            <div className="card__body">
              <div className="detail-list">
                <div className="detail-list__item">
                  <span className="detail-list__label">Usuários</span>
                  <span className="detail-list__value">{formatInteger(snapshot.userCount)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Papéis</span>
                  <span className="detail-list__value">{formatInteger(snapshot.roles.length)}</span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Competências abertas</span>
                  <span className="detail-list__value">
                    {formatInteger(snapshot.openPeriods.length)}
                  </span>
                </div>
                <div className="detail-list__item">
                  <span className="detail-list__label">Submissões correntes</span>
                  <span className="detail-list__value">
                    {formatInteger(snapshot.currentSubmissionCount)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card__header">
              <h3 className="card__title">Uso recomendado até a demo</h3>
            </div>
            <div className="card__body">
              <div className="list-stack">
                <div className="list-row">
                  <div>
                    <div className="list-row__title">1. Preparar ambiente demo</div>
                    <div className="list-row__meta">
                      Cria regionais, coligadas, competências, eventos e submissões prontas.
                    </div>
                  </div>
                </div>
                <div className="list-row">
                  <div>
                    <div className="list-row__title">2. Validar coligada, Dashboard e Aprovações</div>
                    <div className="list-row__meta">
                      Confirma o isolamento por código da coligada, a leitura executiva e a fila
                      de revisão com dados reais.
                    </div>
                  </div>
                </div>
                <div className="list-row">
                  <div>
                    <div className="list-row__title">3. Repetir com zerar demo</div>
                    <div className="list-row__meta">
                      Permite recomeçar a apresentação sem lixo operacional entre os testes.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AdminAccessPanel snapshot={snapshot} />

      <div className="page-grid page-grid--wide">
        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Competências abertas</h3>
          </div>
          <div className="card__body card__body--compact">
            {snapshot.openPeriods.length === 0 ? (
              <div className="inline-message">
                Nenhuma competência aberta ou reaberta neste momento.
              </div>
            ) : (
              <div className="table-shell">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Competência</th>
                      <th>Status</th>
                      <th>Prazo de envio</th>
                      <th>Prazo de ajuste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.openPeriods.map((period) => (
                      <tr key={period.id}>
                        <td>{period.label}</td>
                        <td>{formatStatusLabel(period.status)}</td>
                        <td>{formatDateTime(period.submission_deadline_at)}</td>
                        <td>{formatDateTime(period.adjustment_deadline_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card__header">
            <h3 className="card__title">Papéis configurados</h3>
          </div>
          <div className="card__body">
            <div className="list-stack">
              {snapshot.roles.map((role) => (
                <div key={role.id} className="list-row">
                  <div>
                    <div className="list-row__title">{role.name}</div>
                    <div className="list-row__meta">{role.code}</div>
                  </div>
                  <div className="list-row__value text-right">
                    <div className="list-row__meta">{role.description ?? 'Sem descrição'}</div>
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
