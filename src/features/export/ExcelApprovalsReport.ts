import * as XLSX from 'xlsx';
import type { PendingReviewRow } from '../shared/portal.types';
import {
  formatDateTime,
  formatStatusLabel,
  toNumber,
} from '../../utils/formatters';

const BRL_FMT = '"R$" #,##0.00';

export function buildApprovalsExcelBuffer(params: {
  rows: PendingReviewRow[];
  meta: {
    filters: Record<string, unknown>;
    timestampBrt: string;
    userLabel: string;
  };
}): ArrayBuffer {
  const { rows, meta } = params;
  const wb = XLSX.utils.book_new();

  const headers = [
    'Franquia',
    'Código',
    'Regional',
    'Competência',
    'Status',
    'Receita',
    'EBITDA 2',
    'Margem %',
    'Pontos abertos',
    'Enviada em',
  ];

  const aoa: (string | number)[][] = [
    headers,
    ...rows.map((row) => [
      row.franchise_name,
      row.franchise_code,
      row.regional_name,
      row.period_label,
      formatStatusLabel(row.submission_status),
      toNumber(row.gross_revenue),
      toNumber(row.ebitda_2),
      toNumber(row.ebitda2_pct),
      toNumber(row.open_issues_count),
      row.submitted_at ? formatDateTime(row.submitted_at) : '—',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 26 },
    { wch: 10 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 20 },
  ];

  const ref = ws['!ref'];
  if (ref) {
    const range = XLSX.utils.decode_range(ref);
    for (let r = 1; r <= range.e.r; r++) {
      for (const c of [5, 6] as const) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        if (cell && cell.t === 'n') {
          cell.z = BRL_FMT;
        }
      }
    }
  }

  XLSX.utils.book_append_sheet(wb, ws, 'Fila');

  const metaAoA: (string | number)[][] = [
    ['Campo', 'Valor'],
    ['Gerado em (BRT)', meta.timestampBrt],
    ['Usuário', meta.userLabel],
    ['Filtros (JSON)', JSON.stringify(meta.filters, null, 0)],
    [
      'Nota',
      'Parecer livre da controladoria não é persistido na fila; não incluído nesta exportação.',
    ],
  ];
  const metaWs = XLSX.utils.aoa_to_sheet(metaAoA);
  metaWs['!cols'] = [{ wch: 22 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(wb, metaWs, 'Metadados');

  return XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
}
