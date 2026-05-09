import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import type { FranchiseDashboardRow } from '../shared/portal.types';
import {
  formatCurrency,
  formatPercent,
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
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 6,
    color: '#1a1a1a',
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
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    marginBottom: 12,
  },
  kpiCell: {
    width: '50%',
    paddingRight: 8,
    paddingBottom: 10,
    borderBottom: '1 solid #eee',
    marginBottom: 8,
  },
  kpiLabel: {
    fontSize: 8,
    color: GOLD,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  kpiValue: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 2,
  },
  kpiDelta: {
    fontSize: 8,
    color: MUTED,
  },
  kpiDesc: {
    fontSize: 7,
    color: MUTED,
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    marginTop: 4,
    marginBottom: 6,
    color: '#222',
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottom: '1 solid #ccc',
    paddingBottom: 4,
    marginBottom: 4,
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

const COL_FR = { width: '22%' };
const COL_RG = { width: '18%' };
const COL_RB = { width: '14%', textAlign: 'right' as const };
const COL_MC = { width: '14%', textAlign: 'right' as const };
const COL_EB = { width: '14%', textAlign: 'right' as const };
const COL_MG = { width: '10%', textAlign: 'right' as const };
const COL_ST = { width: '8%' };

export type DashboardPdfKpi = {
  label: string;
  value: string;
  description: string;
  delta: string;
};

export type DashboardPdfDocumentProps = {
  periodLabelDisplay: string;
  filterLines: string[];
  kpis: DashboardPdfKpi[];
  rankingRows: FranchiseDashboardRow[];
  generatedAtBrt: string;
  generatorLabel: string;
  /** Partir tabela em páginas (altura A4). */
  rowsFirstPage?: number;
  rowsNextPages?: number;
};

const DEFAULT_FIRST = 18;
const DEFAULT_NEXT = 28;

function Footer({
  generatedAtBrt,
  generatorLabel,
}: {
  generatedAtBrt: string;
  generatorLabel: string;
}) {
  return (
    <View style={styles.footer} fixed>
      <Text>
        Gerado em {generatedAtBrt} BRT · {generatorLabel}
      </Text>
      <Text style={styles.footerNote}>Dados oficiais — fonte: motor SQL Postgres</Text>
    </View>
  );
}

function KpiGrid({ kpis }: { kpis: DashboardPdfKpi[] }) {
  return (
    <View style={styles.kpiGrid}>
      {kpis.slice(0, 4).map((kpi) => (
        <View key={kpi.label} style={styles.kpiCell} wrap={false}>
          <Text style={styles.kpiLabel}>{kpi.label}</Text>
          <Text style={styles.kpiValue}>{kpi.value}</Text>
          <Text style={styles.kpiDelta}>Δ {kpi.delta}</Text>
          <Text style={styles.kpiDesc}>{kpi.description}</Text>
        </View>
      ))}
    </View>
  );
}

function RankingTableHeader() {
  return (
    <View style={styles.tableHeader}>
      <Text style={[styles.th, COL_FR]}>Franquia</Text>
      <Text style={[styles.th, COL_RG]}>Regional</Text>
      <Text style={[styles.th, COL_RB]}>RBV</Text>
      <Text style={[styles.th, COL_MC]}>MC2</Text>
      <Text style={[styles.th, COL_EB]}>EBITDA 2</Text>
      <Text style={[styles.th, COL_MG]}>Margem</Text>
      <Text style={[styles.th, COL_ST]}>St.</Text>
    </View>
  );
}

function RankingRow({ row }: { row: FranchiseDashboardRow }) {
  return (
    <View style={styles.row} wrap={false}>
      <Text style={[styles.td, COL_FR]}>
        {row.franchise_name} ({row.franchise_code})
      </Text>
      <Text style={[styles.td, COL_RG]}>{row.regional_name}</Text>
      <Text style={[styles.td, COL_RB]}>{formatCurrency(row.gross_revenue)}</Text>
      <Text style={[styles.td, COL_MC]}>{formatCurrency(row.mc2)}</Text>
      <Text style={[styles.td, COL_EB]}>{formatCurrency(row.ebitda_2)}</Text>
      <Text style={[styles.td, COL_MG]}>{formatPercent(row.ebitda2_pct)}</Text>
      <Text style={[styles.td, COL_ST]}>{formatStatusLabel(row.submission_status)}</Text>
    </View>
  );
}

export function DashboardPdfDocument({
  periodLabelDisplay,
  filterLines,
  kpis,
  rankingRows,
  generatedAtBrt,
  generatorLabel,
  rowsFirstPage = DEFAULT_FIRST,
  rowsNextPages = DEFAULT_NEXT,
}: DashboardPdfDocumentProps) {
  const firstSlice = rankingRows.slice(0, rowsFirstPage);
  const rest = rankingRows.slice(rowsFirstPage);
  const restChunks: FranchiseDashboardRow[][] = [];
  for (let i = 0; i < rest.length; i += rowsNextPages) {
    restChunks.push(rest.slice(i, i + rowsNextPages));
  }

  return (
    <Document title="Relatório Dashboard · febracis-dre" author="febracis-dre">
      <Page size="A4" style={styles.page}>
        <Text style={styles.brandMark}>FEBRACIS</Text>
        <Text style={styles.title}>Relatório Dashboard · febracis-dre</Text>
        <Text style={styles.subtitle}>Período ativo: {periodLabelDisplay}</Text>
        {filterLines.map((line) => (
          <Text key={line} style={styles.filterLine}>
            {line}
          </Text>
        ))}
        <KpiGrid kpis={kpis} />
        <Text style={styles.sectionTitle}>Radar executivo — ranking por EBITDA 2</Text>
        {rankingRows.length ? <RankingTableHeader /> : <Text style={styles.filterLine}>Sem linhas no recorte.</Text>}
        {firstSlice.map((row) => (
          <RankingRow key={row.submission_id} row={row} />
        ))}
        <Footer generatedAtBrt={generatedAtBrt} generatorLabel={generatorLabel} />
      </Page>

      {restChunks.map((chunk, idx) => (
        <Page key={`rank-${idx}`} size="A4" style={styles.page}>
          <Text style={styles.continued}>Relatório Dashboard · continuação ({idx + 2})</Text>
          <RankingTableHeader />
          {chunk.map((row) => (
            <RankingRow key={row.submission_id} row={row} />
          ))}
          <Footer generatedAtBrt={generatedAtBrt} generatorLabel={generatorLabel} />
        </Page>
      ))}
    </Document>
  );
}

/** Timestamp BRT para rodapé (mesmo texto que Excel). */
export function defaultPdfReportTimestamp(): string {
  return formatBrtReportTimestamp();
}
