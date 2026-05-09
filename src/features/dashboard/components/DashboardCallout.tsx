import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  ChevronDown,
  ClipboardList,
  FileText,
  MoreHorizontal,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { AccessProfile } from '../../auth/auth.types';
import { getActiveScopeHeadline } from '../../auth/access';
import type { DashboardSnapshot } from '../../shared/portal.types';
import { formatInteger, formatPeriodLabel } from '../../../utils/formatters';
import { Card } from '../../../components/ui/card';
import { CALLOUT_STORAGE } from './DashboardScopeShell';
import '../DashboardPage.css';

function getScopeNarrative(scope: string) {
  switch (scope) {
    case 'controladoria':
      return 'Fila, pendências e ritmo de fechamento — ação imediata quando algo depende de si.';
    case 'holding':
      return 'Consolidado da rede por competência — filtre regional e unidade no cockpit abaixo.';
    case 'regional':
      return 'Carteira da regional — compare margens e cubra envios em atraso.';
    default:
      return 'Último envio oficial, status na competência e próximos passos da sua unidade.';
  }
}

function getCurrentPeriodLabel(snapshot: DashboardSnapshot) {
  return (
    snapshot.latestFranchise?.period_label ??
    snapshot.latestRegional?.period_label ??
    snapshot.latestNetwork?.period_label ??
    null
  );
}

type Props = {
  accessProfile: AccessProfile;
  snapshot: DashboardSnapshot;
  isDashboardFetching: boolean;
};

/** Call-out colapsável (estado persistido em localStorage + 2º mount na sessão). */
export function DashboardCallout({ accessProfile, snapshot, isDashboardFetching }: Props) {
  const queryClient = useQueryClient();

  const sessionMountKey = 'febracis-dre.dashboardCallout.sessionMount';
  const [expanded, setExpanded] = useState(() => {
    try {
      const stored = localStorage.getItem(CALLOUT_STORAGE);
      if (stored === 'collapsed') return false;
      if (stored === 'expanded') return true;
    } catch {
      /* ignore */
    }
    const n = Number(sessionStorage.getItem(sessionMountKey) || '0');
    return n < 1;
  });

  useEffect(() => {
    try {
      const n = Number(sessionStorage.getItem(sessionMountKey) || '0') + 1;
      sessionStorage.setItem(sessionMountKey, String(n));
    } catch {
      /* ignore */
    }
  }, [sessionMountKey]);

  const persistExpanded = useCallback((next: boolean) => {
    setExpanded(next);
    try {
      localStorage.setItem(CALLOUT_STORAGE, next ? 'expanded' : 'collapsed');
    } catch {
      /* ignore */
    }
  }, []);

  const hasOperationalData =
    snapshot.currentSubmissions.length > 0 ||
    snapshot.pendingReviews.length > 0 ||
    snapshot.currentDre.length > 0;

  const currentPeriod = formatPeriodLabel(getCurrentPeriodLabel(snapshot));

  const primaryAction = accessProfile.isAdmin
    ? {
        to: '/app/admin',
        label: hasOperationalData ? 'Gerenciar ambiente demo' : 'Preparar ambiente demo',
        icon: ShieldCheck,
      }
    : {
        to: '/app/submissions',
        label: 'Abrir submissões',
        icon: FileText,
      };

  const pendingLabel =
    accessProfile.canManageReview || accessProfile.dashboardScope !== 'franchise'
      ? 'aguardando revisão'
      : 'pendências (fila interna)';

  const handleRefreshReadings = () => {
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const PrimaryIcon = primaryAction.icon;

  const summaryLine = useMemo(
    () =>
      `${getActiveScopeHeadline(accessProfile).slice(0, 120)}${getActiveScopeHeadline(accessProfile).length > 120 ? '…' : ''} · ${formatInteger(snapshot.currentSubmissions.length)} DREs em curso · ${formatInteger(snapshot.pendingReviews.length)} ${pendingLabel}.`,
    [accessProfile, pendingLabel, snapshot.currentSubmissions.length, snapshot.pendingReviews.length],
  );

  return (
    <Card as="section" variant="default" className="dashboard-callout">
      <button
        type="button"
        className="dashboard-callout__toggle"
        aria-expanded={expanded}
        onClick={() => persistExpanded(!expanded)}
      >
        <span className="dashboard-callout__toggle-label">Resumo operacional</span>
        <ChevronDown
          size={18}
          className={`dashboard-callout__chev${expanded ? ' dashboard-callout__chev--open' : ''}`}
          aria-hidden
        />
      </button>

      {!expanded ? (
        <p className="dashboard-callout__collapsed-text">{summaryLine}</p>
      ) : (
        <div className="dashboard-callout__body">
          <p className="dashboard-callout__narrative">{getScopeNarrative(accessProfile.dashboardScope)}</p>
          <div className="dashboard-callout__metrics">
            <div>
              <strong>{formatInteger(snapshot.currentSubmissions.length)}</strong>
              <span>DREs em andamento</span>
            </div>
            <div>
              <strong>{formatInteger(snapshot.pendingReviews.length)}</strong>
              <span>{pendingLabel}</span>
            </div>
            <div>
              <strong>{currentPeriod}</strong>
              <span>competência</span>
            </div>
          </div>

          {!hasOperationalData ? (
            <div className="inline-message dashboard-callout__hint">
              Ainda não há DREs no seu escopo. Quando a primeira submissão entrar, os números aparecem
              automaticamente.
            </div>
          ) : null}

          <div className="dashboard-callout__actions">
            <Link to={primaryAction.to} className="btn btn--gold btn--small">
              <PrimaryIcon size={16} />
              {primaryAction.label}
            </Link>
            <details className="dashboard-callout__more">
              <summary className="btn btn--secondary btn--small dashboard-callout__more-trigger">
                <MoreHorizontal size={16} aria-hidden />
                Mais ações
              </summary>
              <div className="dashboard-callout__more-menu">
                {accessProfile.canManageReview ? (
                  <Link to="/app/workflow" className="dashboard-callout__more-link">
                    <ClipboardList size={16} />
                    Fila de aprovações
                    <ArrowRight size={14} />
                  </Link>
                ) : (
                  <button
                    type="button"
                    className="dashboard-callout__more-link"
                    disabled={isDashboardFetching}
                    onClick={handleRefreshReadings}
                  >
                    <RefreshCw size={16} />
                    Atualizar leitura
                  </button>
                )}
              </div>
            </details>
          </div>
        </div>
      )}
    </Card>
  );
}
