import { memo, useId, useMemo } from 'react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatSparkPeriodTooltip, formatSparkTooltipValue, toNumber } from '../../utils/formatters';
import type { KpiHistoryPoint } from '../../features/shared/portal.types';
import './Sparkline.css';

export type SparklineColorMode = 'gold' | 'success' | 'danger' | 'auto';

const STROKE_GOLD = '#F0B73E';
const STROKE_SUCCESS = '#10B981';
const STROKE_DANGER = '#EF4444';
const STROKE_NEUTRAL = '#94A3B8';

type ChartRow = {
  ix: number;
  y: number;
  tooltipLabel: string;
  rawValue: number;
};

function resolveStroke(mode: SparklineColorMode, ys: number[]): string {
  if (mode === 'gold') {
    return STROKE_GOLD;
  }
  if (mode === 'success') {
    return STROKE_SUCCESS;
  }
  if (mode === 'danger') {
    return STROKE_DANGER;
  }
  if (ys.length < 2) {
    return STROKE_GOLD;
  }
  const first = ys[0] ?? 0;
  const last = ys[ys.length - 1] ?? 0;
  if (last > first) {
    return STROKE_SUCCESS;
  }
  if (last < first) {
    return STROKE_DANGER;
  }
  return STROKE_NEUTRAL;
}

type SparklineTooltipProps = {
  active?: boolean;
  payload?: Array<{ payload: ChartRow }>;
  valueFormat: 'currency' | 'integer';
};

function SparkTooltipBody({ active, payload, valueFormat }: SparklineTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }
  const row = payload[0].payload;
  return (
    <div className="sparkline-tooltip">
      {row.tooltipLabel}: {formatSparkTooltipValue(row.rawValue, valueFormat)}
    </div>
  );
}

export type SparklineProps = {
  series: KpiHistoryPoint[];
  color: SparklineColorMode;
  height?: number;
  width?: number;
  valueFormat: 'currency' | 'integer';
  accessibilityTitle?: string;
};

function SparklineInner({ series, color, height = 32, width = 80, valueFormat, accessibilityTitle }: SparklineProps) {
  const gradientId = `spark-fill-${useId().replace(/:/g, '')}`;

  const chartData = useMemo((): ChartRow[] => {
    return series.map((point, ix) => ({
      ix,
      y: toNumber(point.value),
      tooltipLabel: formatSparkPeriodTooltip(point.period_year, point.period_month),
      rawValue: toNumber(point.value),
    }));
  }, [series]);

  const ys = useMemo(() => chartData.map((row) => row.y), [chartData]);
  const stroke = resolveStroke(color, ys);
  const title = accessibilityTitle ?? `Série temporal com ${series.length} pontos`;

  return (
    <div
      className="sparkline-shell"
      style={{ width, height, ['--sparkline-height' as string]: `${height}px` }}
      role="img"
      aria-label={title}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 2, right: 2, left: 2, bottom: 2 }}
          accessibilityLayer={false}
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.12} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            content={<SparkTooltipBody valueFormat={valueFormat} />}
            cursor={{ stroke: stroke, strokeDasharray: '3 3', strokeOpacity: 0.35 }}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke={stroke}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            fillOpacity={1}
            dot={(dotProps) => {
              const { cx, cy, index } = dotProps as { cx?: number; cy?: number; index?: number };
              if (index !== chartData.length - 1) {
                return null;
              }
              if (cx == null || cy == null) {
                return null;
              }
              return <circle cx={cx} cy={cy} r={1.5} fill={stroke} stroke={stroke} />;
            }}
            isAnimationActive={false}
            activeDot={{ r: 3, fill: stroke }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export const Sparkline = memo(SparklineInner);
