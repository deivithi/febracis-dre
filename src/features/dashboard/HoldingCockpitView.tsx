import type { ColumnDef } from '@tanstack/react-table';
import { ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../../components/ui/card';
import { DataTable } from '../../components/ui/DataTable';
import './DashboardPage.css';
import type { DerivedHoldingView, HoldingFilterState } from './holdingDerivations';
import type { FranchiseDashboardRow } from '../shared/portal.types';
import {
  formatCurrency,
  formatInteger,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
  getStatusVariant,
  toNumber,
} from '../../utils/formatters';
import { HoldingBento } from './components/HoldingBento';

function useIsViewportMax767() {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const apply = () => setNarrow(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return narrow;
}

function getTopFranchises(rows: FranchiseDashboardRow[]) {
  return [...rows]
    .sort((left, right) => toNumber(right.ebitda_2) - toNumber(left.ebitda_2))
    .slice(0, 5);
}

type Props = {
  derived: DerivedHoldingView | null;
  onPatchFilters: (patch: Partial<HoldingFilterState>) => void;
  /** Não renderiza o cartão de filtros (modo comparativo: filtros ficam no cabeçalho). */
  hideFilters?: boolean;
};

export function HoldingCockpitView({ derived, onPatchFilters, hideFilters = false }: Props) {
  const isMobile = useIsViewportMax767();

  const rankingColumns = useMemo<ColumnDef<FranchiseDashboardRow>[]>(
    () => [
      {
        id: 'franchise',
        header: 'Franquia',
        accessorFn: (r) => r.franchise_name,
        cell: ({ row }) => (
          <>
            <div className="list-row__title">{row.original.franchise_name}</div>
            <div className="list-row__meta">{row.original.franchise_code}</div>
          </>
        ),
      },
      {
        id: 'regional',
        header: 'Regional',
        accessorFn: (r) => r.regional_name,
      },
      {
        id: 'rbv',
        header: 'RBV',
        accessorFn: (r) => r.gross_revenue,
        meta: { tdClassName: 'align-right num-tabular' },
        cell: ({ row }) => <span className="num-tabular">{formatCurrency(row.original.gross_revenue)}</span>,
      },
      {
        id: 'mc2',
        header: 'MC2',
        accessorFn: (r) => r.mc2,
        meta: { tdClassName: 'align-right num-tabular' },
        cell: ({ row }) => <span className="num-tabular">{formatCurrency(row.original.mc2)}</span>,
      },
      {
        id: 'ebitda',
        header: 'EBITDA 2',
        accessorFn: (r) => r.ebitda_2,
        meta: { tdClassName: 'align-right num-tabular' },
        cell: ({ row }) => <span className="num-tabular">{formatCurrency(row.original.ebitda_2)}</span>,
      },
      {
        id: 'margem',
        header: 'Margem',
        accessorFn: (r) => r.ebitda2_pct,
        meta: { tdClassName: 'align-right num-tabular' },
        cell: ({ row }) => <span className="num-tabular">{formatPercent(row.original.ebitda2_pct)}</span>,
      },
      {
        id: 'status',
        header: 'Status',
        accessorFn: (r) => r.submission_status,
        cell: ({ row }) => (
          <span className={`status-badge status-badge--${getStatusVariant(row.original.submission_status)}`}>
            <span className="status-badge__dot" />
            {formatStatusLabel(row.original.submission_status)}
          </span>
        ),
      },
    ],
    [],
  );

  const sortedRankingRows = useMemo(() => {
    const rows = derived?.filteredRows ?? [];
    return [...rows].sort((left, right) => toNumber(right.ebitda_2) - toNumber(left.ebitda_2));
  }, [derived]);

  const queuePreview = useMemo(() => {
    const pending = derived?.filteredPendingReviews ?? [];
    return pending.slice(0, 3);
  }, [derived]);

  if (!derived) {
    return (
      <div className="dashboard__content page-stack">
        <Card variant="hero" className="card--accent">
          <div className="card__body">
            <div className="empty-state empty-state--spaced">
              <div className="empty-state__icon">
                <ClipboardList />
              </div>
              <h3 className="empty-state__title">Consolidado da rede ainda indisponível</h3>
              <p className="empty-state__description">
                O cockpit executivo aparece quando existir pelo menos uma competência com submissões
                registradas nas franquias do seu recorte. Enquanto isso, confira a fila de revisão ou o
                ambiente de demonstração nas configurações (se tiver permissão).
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  const {
    periodOptions,
    activePeriodLabel,
    regionalOptions,
    franchiseOptions,
    effectiveRegionalId,
    effectiveFranchiseId,
    filteredRows,
    filteredPendingReviews,
    summary,
  } = derived;

  const filterCard = (
    <Card
      variant="hero"
      className="card--accent dashboard-filters dashboard-filters--sticky"
      data-tour-id="holding-cockpit-filters"
    >
        <div className="card__header">
          <div>
            <h3 className="card__title">Cockpit executivo da rede</h3>
            <p className="card__subtitle">
              Filtre a competência, a regional e a unidade para sair da visão total e mergulhar na operação.
            </p>
          </div>
          <span className="badge badge--gold">{formatPeriodLabel(activePeriodLabel)}</span>
        </div>
        <div className="card__body dashboard-filters__body">
          <label className="form-group">
            <span className="form-label">Competência</span>
            <select
              className="form-select"
              value={activePeriodLabel}
              onChange={(event) => onPatchFilters({ selectedPeriodLabel: event.target.value })}
            >
              {periodOptions.map((periodLabel) => (
                <option key={periodLabel} value={periodLabel}>
                  {formatPeriodLabel(periodLabel)}
                </option>
              ))}
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">Regional</span>
            <select
              className="form-select"
              value={effectiveRegionalId}
              onChange={(event) => {
                onPatchFilters({ selectedRegionalId: event.target.value, selectedFranchiseId: 'all' });
              }}
            >
              <option value="all">Toda a rede</option>
              {regionalOptions.map((regional) => (
                <option key={regional.id} value={regional.id}>
                  {regional.name}
                </option>
              ))}
            </select>
          </label>

          <label className="form-group">
            <span className="form-label">Unidade</span>
            <select
              className="form-select"
              value={effectiveFranchiseId}
              onChange={(event) => onPatchFilters({ selectedFranchiseId: event.target.value })}
            >
              <option value="all">Todas as unidades</option>
              {franchiseOptions.map((franchise) => (
                <option key={franchise.id} value={franchise.id}>
                  {franchise.code} • {franchise.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>
  );

  const rankingCard = (
    <Card variant="hero" className="card--accent" data-tour-id="holding-ranking">
      <div className="card__header">
        <div>
          <h3 className="card__title">Ranking e status por unidade</h3>
          <p className="card__subtitle">
            Ranking, margem e status oficial das unidades visíveis no filtro atual.
          </p>
        </div>
        <span className="badge badge--gold">{formatInteger(filteredRows.length)} unidades</span>
      </div>
      <div className="card__body">
        {filteredRows.length === 0 ? (
          <div className="empty-state empty-state--compact">
            <div className="empty-state__icon">
              <ClipboardList />
            </div>
            <h3 className="empty-state__title">Nenhuma unidade neste recorte</h3>
            <p className="empty-state__description">
              Ajuste os filtros de competência, regional ou unidade. Se a competência ainda não tiver submissões
              registadas, os dados aparecem aqui após o primeiro envio ou rascunho salvo no escopo visível.
            </p>
          </div>
        ) : (
          <DataTable<FranchiseDashboardRow>
            columns={rankingColumns}
            data={sortedRankingRows}
            getRowId={(row) => row.submission_id}
            stickyHeader
            virtualize={false}
            paginated
            pageSize={8}
            initialSort={[{ id: 'ebitda', desc: true }]}
          />
        )}
      </div>
    </Card>
  );

  const statusCard = (
    <Card variant="kpi" className="card--dense">
      <div className="card__header card__header--dense">
        <h3 className="card__title">Status do recorte</h3>
      </div>
      <div className="card__body card__body--dense-static">
        <div className="detail-list detail-list--tight">
          <div className="detail-list__item">
            <span className="detail-list__label">Franquias</span>
            <span className="detail-list__value num-tabular">{formatInteger(summary.totalFranchises)}</span>
          </div>
          <div className="detail-list__item">
            <span className="detail-list__label">Regionais</span>
            <span className="detail-list__value num-tabular">{formatInteger(summary.totalRegionals)}</span>
          </div>
          <div className="detail-list__item">
            <span className="detail-list__label">Aprovadas</span>
            <span className="detail-list__value num-tabular">{formatInteger(summary.approvedCount)}</span>
          </div>
          <div className="detail-list__item">
            <span className="detail-list__label">Pendentes</span>
            <span className="detail-list__value num-tabular">{formatInteger(summary.pendingCount)}</span>
          </div>
          <div className="detail-list__item">
            <span className="detail-list__label">Melhor margem</span>
            <span className="detail-list__value num-tabular">{formatPercent(summary.maxMarginPct)}</span>
          </div>
        </div>
      </div>
    </Card>
  );

  const topCard = (
    <Card variant="default" className="card--dense">
      <div className="card__header card__header--dense">
        <h3 className="card__title">Top 5 EBITDA 2</h3>
      </div>
      <div className="card__body card__body--dense-static">
        <div className="list-stack list-stack--dense">
          {getTopFranchises(filteredRows).map((row) => (
            <div key={row.submission_id} className="list-row">
              <div>
                <div className="list-row__title">{row.franchise_name}</div>
                <div className="list-row__meta">{row.regional_name}</div>
              </div>
              <div className="list-row__value">
                <div className="num-tabular">{formatCurrency(row.ebitda_2)}</div>
                <div className="list-row__meta num-tabular">{formatPercent(row.ebitda2_pct)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );

  const queueCard = (
    <Card variant="inline" className="card--dense">
      <div className="card__header card__header--dense">
        <h3 className="card__title">Fila de revisão</h3>
        <span className="badge badge--warning">{formatInteger(filteredPendingReviews.length)}</span>
      </div>
      <div className="card__body card__body--dense-static">
        {filteredPendingReviews.length === 0 ? (
          <div className="inline-message inline-message--success inline-message--compact">
            Nenhuma unidade aguardando revisão neste recorte.
          </div>
        ) : (
          <div className="list-stack list-stack--dense">
            {queuePreview.map((row) => (
              <div key={row.submission_id} className="list-row">
                <div>
                  <div className="list-row__title">{row.franchise_name}</div>
                  <div className="list-row__meta competence-etiquette">{formatPeriodLabel(row.period_label)}</div>
                </div>
                <div className="list-row__value">
                  <div className="num-tabular">{formatCurrency(row.ebitda_2)}</div>
                  <div className="list-row__meta num-tabular">{formatInteger(row.open_issues_count)} pendências</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {filteredPendingReviews.length > 3 ? (
          <p className="holding-queue-hint muted">
            A mostrar 3 entradas.{' '}
            <Link className="link-inline" to="/app/workflow">
              Abrir fila completa no workflow
            </Link>
          </p>
        ) : filteredPendingReviews.length > 0 ? (
          <Link className="btn btn--secondary btn--small holding-queue-btn" to="/app/workflow">
            Abrir fluxo de aprovação
          </Link>
        ) : null}
      </div>
    </Card>
  );

  return (
    <div className="dashboard__content page-stack">
      {!hideFilters && isMobile ? (
        <details className="holding-filters-mobile">
          <summary>Filtros do cockpit</summary>
          {filterCard}
        </details>
      ) : null}
      {!hideFilters && !isMobile ? filterCard : null}

      <HoldingBento ranking={rankingCard} sidebarStatus={statusCard} sidebarTop={topCard} sidebarQueue={queueCard} />
    </div>
  );
}
