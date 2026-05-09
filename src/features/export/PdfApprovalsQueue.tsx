import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { PendingReviewRow } from '../shared/portal.types';
import {
  formatCurrency,
  formatDateTime,
  formatPercent,
  formatPeriodLabel,
  formatStatusLabel,
} from '../../utils/formatters';
import { formatBrtReportTimestamp } from './exportFilenames';

const GOLD = '#D4A93C';
const MUTED = '#555555';

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: '#111',
  },
  brandMark: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 9,
    color: MUTED,
    marginBottom: 10,
  },
  filterLine: {
    fontSize: 8,
    color: MUTED,
    marginBottom: 2,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #ccc',
    paddingBottom: 4,
    marginBottom: 4,
    marginTop: 8,
  },
  th: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: MUTED,
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderBottom: '0.5 solid #eee',
  },
  td: {
    fontSize: 7,
  },
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 40,
    right: 40,
    fontSize: 7,
    color: MUTED,
    borderTop: '0.5 solid #ddd',
    paddingTop: 6,
  },
  footerNote: {
    marginTop: 3,
    fontSize: 6,
    color: MUTED,
  },
  continued: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: GOLD,
    marginBottom: 8,
  },
});

const C_FR = { width: '20%' };
const C_RG = { width: '15%' };
const C_PE = { width: '11%' };
const C_RV = { width: '11%', textAlign: 'right' as const };
const C_EB = { width: '11%', textAlign: 'right' as const };
const C_MG = { width: '8%', textAlign: 'right' as const };
const C_PO = { width: '8%', textAlign: 'right' as const };
const C_DT = { width: '12%' };
const C_ST = { width: '14%' };

function Footer({ generatedAtBrt, generatorLabel }: { generatedAtBrt: string; generatorLabel: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Gerado em {generatedAtBrt} BRT · {generatorLabel}
      </Text>
      <Text style={styles.footerNote}>
        Dados oficiais — fonte: motor SQL Postgres. Parecer da controladoria digitado no painel não é persistido na
        linha da fila — não incluído neste relatório.
      </Text>
    </View>
  );
}

function TableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.th, C_FR]}>Franquia</Text>
      <Text style={[styles.th, C_RG]}>Regional</Text>
      <Text style={[styles.th, C_PE]}>Comp.</Text>
      <Text style={[styles.th, C_RV]}>Receita</Text>
      <Text style={[styles.th, C_EB]}>EBITDA 2</Text>
      <Text style={[styles.th, C_MG]}>Mg.%</Text>
      <Text style={[styles.th, C_PO]}>Pend.</Text>
      <Text style={[styles.th, C_DT]}>Enviada</Text>
      <Text style={[styles.th, C_ST]}>Status</Text>
    </View>
  );
}

function Row({ row }: { row: PendingReviewRow }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.td, C_FR]}>{row.franchise_name}</Text>
      <Text style={[styles.td, C_RG]}>{row.regional_name}</Text>
      <Text style={[styles.td, C_PE]}>{formatPeriodLabel(row.period_label)}</Text>
      <Text style={[styles.td, C_RV]}>{formatCurrency(row.gross_revenue)}</Text>
      <Text style={[styles.td, C_EB]}>{formatCurrency(row.ebitda_2)}</Text>
      <Text style={[styles.td, C_MG]}>{formatPercent(row.ebitda2_pct)}</Text>
      <Text style={[styles.td, C_PO]}>{row.open_issues_count}</Text>
      <Text style={[styles.td, C_DT]}>{formatDateTime(row.submitted_at)}</Text>
      <Text style={[styles.td, C_ST]}>{formatStatusLabel(row.submission_status)}</Text>
    </View>
  );
}

export type ApprovalsPdfDocumentProps = {
  filterLines: string[];
  rows: PendingReviewRow[];
  generatedAtBrt: string;
  generatorLabel: string;
  firstPageRows?: number;
  nextPageRows?: number;
};

const DEFAULT_FIRST = 18;
const DEFAULT_NEXT = 28;

export function ApprovalsPdfDocument({
  filterLines,
  rows,
  generatedAtBrt,
  generatorLabel,
  firstPageRows = DEFAULT_FIRST,
  nextPageRows = DEFAULT_NEXT,
}: ApprovalsPdfDocumentProps) {
  const first = rows.slice(0, firstPageRows);
  const rest = rows.slice(firstPageRows);
  const chunks: PendingReviewRow[][] = [];
  for (let i = 0; i < rest.length; i += nextPageRows) {
    chunks.push(rest.slice(i, i + nextPageRows));
  }

  return (
    <Document title="Relatório Fila de aprovações · febracis-dre" author="febracis-dre">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brandMark}>FEBRACIS</Text>
        <Text style={styles.title}>Relatório Fila de aprovações · febracis-dre</Text>
        <Text style={styles.subtitle}>Mesa de trabalho da controladoria</Text>
        {filterLines.map((line) => (
          <Text key={line} style={styles.filterLine}>
            {line}
          </Text>
        ))}
        {rows.length ? <TableHeader /> : <Text style={styles.filterLine}>Fila vazia.</Text>}
        {first.map((row) => (
          <Row key={row.submission_id} row={row} />
        ))}
        <Footer generatedAtBrt={generatedAtBrt} generatorLabel={generatorLabel} />
      </Page>

      {chunks.map((chunk, idx) => (
        <Page key={`ap-${idx}`} size="A4" style={styles.page}>
          <Text style={styles.continued}>Fila de aprovações · continuação ({idx + 2})</Text>
          <TableHeader />
          {chunk.map((row) => (
            <Row key={row.submission_id} row={row} />
          ))}
          <Footer generatedAtBrt={generatedAtBrt} generatorLabel={generatorLabel} />
        </Page>
      ))}
    </Document>
  );
}

export function defaultApprovalsPdfTimestamp(): string {
  return formatBrtReportTimestamp();
}
