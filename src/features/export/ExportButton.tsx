import React, { useRef, useState } from 'react';
import { ChevronDown, Download, Loader2 } from 'lucide-react';
import type { AccessProfile } from '../auth/auth.types';
import type { DashboardSnapshot, FranchiseDashboardRow, PendingReviewRow } from '../shared/portal.types';
import type { ExecutiveKpiItem } from '../dashboard/ExecutiveKpiGrid';
import { formatPeriodLabel } from '../../utils/formatters';
import { downloadBlob } from './downloadBlob';
import { logExportAudit } from './logExportAudit';
import {
  approvalsExportBasename,
  dashboardExportBasename,
  formatBrtReportTimestamp,
} from './exportFilenames';
import { formatFiltersForPdfHeader } from './dashboardExportModel';
import './ExportButton.css';

type DashboardProps = {
  variant: 'dashboard';
  kpis: ExecutiveKpiItem[];
  rankingRows: FranchiseDashboardRow[];
  filtersSnapshot: Record<string, unknown>;
  periodLabelDisplay: string;
  snapshot: DashboardSnapshot;
  holdingActivePeriodLabel: string | null;
  accessProfile: AccessProfile;
};

type ApprovalsProps = {
  variant: 'approvals';
  rows: PendingReviewRow[];
  generatorLabel: string;
};

export type ExportButtonProps = DashboardProps | ApprovalsProps;

function getGeneratorLabel(accessProfile: AccessProfile): string {
  const p = accessProfile.profile;
  if (!p) {
    return 'Usuário';
  }
  return `${p.full_name} · ${p.email}`;
}

export function ExportButton(props: ExportButtonProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [busy, setBusy] = useState(false);

  const closeMenu = () => {
    if (detailsRef.current) {
      detailsRef.current.open = false;
    }
  };

  const handlePick = async (format: 'pdf' | 'xlsx') => {
    if (busy) {
      return;
    }
    setBusy(true);
    closeMenu();
    try {
      if (props.variant === 'dashboard') {
        const generatorLabel = getGeneratorLabel(props.accessProfile);
        const ts = formatBrtReportTimestamp();
        const base = dashboardExportBasename(props.snapshot, props.holdingActivePeriodLabel);

        if (format === 'pdf') {
          const { pdf } = await import('@react-pdf/renderer');
          const { DashboardPdfDocument, defaultPdfReportTimestamp } = await import('./PdfDashboardReport');

          const doc = React.createElement(DashboardPdfDocument, {
            periodLabelDisplay: props.periodLabelDisplay,
            filterLines: formatFiltersForPdfHeader(props.filtersSnapshot),
            kpis: props.kpis.slice(0, 4).map((k) => ({
              label: k.label,
              value: k.value,
              description: k.percent,
              delta: k.trend,
            })),
            rankingRows: props.rankingRows,
            generatedAtBrt: defaultPdfReportTimestamp(),
            generatorLabel,
          });

          const blob = await pdf(doc as unknown as Parameters<typeof pdf>[0]).toBlob();

          downloadBlob(blob, `${base}.pdf`);

          await logExportAudit('dashboard_pdf', {
            ...props.filtersSnapshot,
            exportFormat: 'pdf',
            periodLabel: props.periodLabelDisplay,
          });
        } else {
          const { buildDashboardExcelBuffer } = await import('./ExcelDashboardReport');
          const buffer = buildDashboardExcelBuffer({
            kpis: props.kpis.slice(0, 4).map((k) => ({
              label: k.label,
              value: k.value,
              delta: k.trend,
              description: k.percent,
            })),
            rankingRows: props.rankingRows,
            meta: {
              periodLabel: props.periodLabelDisplay,
              filters: props.filtersSnapshot,
              timestampBrt: ts,
              userLabel: generatorLabel,
            },
          });

          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          downloadBlob(blob, `${base}.xlsx`);

          await logExportAudit('dashboard_xlsx', {
            ...props.filtersSnapshot,
            exportFormat: 'xlsx',
            periodLabel: props.periodLabelDisplay,
          });
        }
      } else {
        const ts = formatBrtReportTimestamp();
        const base = approvalsExportBasename();

        if (format === 'pdf') {
          const { pdf } = await import('@react-pdf/renderer');
          const { ApprovalsPdfDocument, defaultApprovalsPdfTimestamp } = await import('./PdfApprovalsQueue');

          const doc = React.createElement(ApprovalsPdfDocument, {
            filterLines: ['Filtros: visão completa da fila (sem filtros adicionais no UI).'],
            rows: props.rows,
            generatedAtBrt: defaultApprovalsPdfTimestamp(),
            generatorLabel: props.generatorLabel,
          });

          const blob = await pdf(doc as unknown as Parameters<typeof pdf>[0]).toBlob();

          downloadBlob(blob, `${base}.pdf`);

          await logExportAudit('approvals_pdf', {
            exportFormat: 'pdf',
            rowCount: props.rows.length,
          });
        } else {
          const { buildApprovalsExcelBuffer } = await import('./ExcelApprovalsReport');
          const buffer = buildApprovalsExcelBuffer({
            rows: props.rows,
            meta: {
              filters: { view: 'full_queue' },
              timestampBrt: ts,
              userLabel: props.generatorLabel,
            },
          });

          const blob = new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          });
          downloadBlob(blob, `${base}.xlsx`);

          await logExportAudit('approvals_xlsx', {
            exportFormat: 'xlsx',
            rowCount: props.rows.length,
          });
        }
      }
    } catch (err) {
      console.error('[febracis-dre] export', err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <details ref={detailsRef} className="export-button">
      <summary
        className={`export-button__summary btn btn--secondary${busy ? ' export-button__summary--busy' : ''}`}
        aria-disabled={busy}
      >
        {busy ? (
          <Loader2 className="export-button__icon export-button__icon--spin" size={16} aria-hidden />
        ) : (
          <Download size={16} aria-hidden />
        )}
        {busy ? 'Gerando…' : 'Exportar'}
        <ChevronDown size={14} className="export-button__chevron" aria-hidden />
      </summary>
      <div className="export-button__menu" role="menu">
        <button type="button" className="export-button__item" role="menuitem" disabled={busy} onClick={() => void handlePick('pdf')}>
          PDF
        </button>
        <button type="button" className="export-button__item" role="menuitem" disabled={busy} onClick={() => void handlePick('xlsx')}>
          Excel
        </button>
      </div>
    </details>
  );
}

/** Rótulo de competência para relatório (mesmo critério visual do dashboard). */
export function formatDashboardPeriodDisplay(
  snapshot: DashboardSnapshot,
  holdingActivePeriodLabel: string | null,
): string {
  const raw =
    holdingActivePeriodLabel ??
    snapshot.latestFranchise?.period_label ??
    snapshot.latestRegional?.period_label ??
    snapshot.latestNetwork?.period_label ??
    null;
  return formatPeriodLabel(raw);
}
