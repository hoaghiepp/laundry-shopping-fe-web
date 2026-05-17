import { ReportHoverTooltip } from '@/components/screens/store/report/ReportHoverTooltip';
import { formatCurrencyVND } from '@/utils/format';
import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export interface BarSeries {
  label: string;
  value: number;
  color: string;
  tooltip?: string;
  formatAsCurrency?: boolean;
}

export interface ChartSeries {
  name: string;
  color: string;
  values: number[];
  tooltips?: string[];
}

const DEFAULT_COLUMN_WIDTH = 80;
const COLUMN_GAP = 20;
const Y_AXIS_WIDTH = 48;
const X_AXIS_HEIGHT = 48;
const MAX_X_LABEL_CHARS = 10;

function chartScrollWidth(count: number, columnWidth: number) {
  if (count <= 0) return 0;
  return count * columnWidth + Math.max(0, count - 1) * COLUMN_GAP;
}

/** Short label for x-axis so each name stays centered under its column */
export function shortenCategoryLabel(name: string, maxLen = MAX_X_LABEL_CHARS): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

function niceCeil(value: number): number {
  if (value <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const f = value / exp;
  const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
  return nice * exp;
}

function buildYTicks(yMax: number, count = 4): number[] {
  const step = yMax / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(step * i));
}

interface ReportGroupedBarChartProps {
  categories: string[];
  series: ChartSeries[];
  height?: number;
  /** Fixed width per category column; enables horizontal scroll when chart is wider than container */
  columnWidth?: number;
  horizontalScroll?: boolean;
}

export const ReportGroupedBarChart: React.FC<ReportGroupedBarChartProps> = ({
  categories,
  series,
  height = 180,
  columnWidth: columnWidthProp,
  horizontalScroll = true,
}) => {
  const rawMax = useMemo(() => {
    const all = series.flatMap((s) => s.values);
    return Math.max(0, ...all);
  }, [series]);

  const yMax = useMemo(() => niceCeil(rawMax), [rawMax]);
  const yTicks = useMemo(() => buildYTicks(yMax, 4), [yMax]);

  const displayLabels = useMemo(
    () => categories.map((c) => shortenCategoryLabel(c)),
    [categories]
  );

  const columnWidth = columnWidthProp ?? DEFAULT_COLUMN_WIDTH;
  const xAxisHeight = X_AXIS_HEIGHT;

  if (categories.length === 0) {
    return <Text style={styles.emptyChart}>Không có dữ liệu</Text>;
  }

  const plotHeight = height;
  const chartContentWidth = chartScrollWidth(categories.length, columnWidth);
  const useScroll = horizontalScroll && categories.length > 0;
  const totalPlotStackHeight = plotHeight + xAxisHeight;

  const renderChartBody = (contentWidth?: number) => (
    <View style={[styles.plotStack, contentWidth ? { width: contentWidth } : { flex: 1 }]}>
      <View style={[styles.plotArea, { height: totalPlotStackHeight }]}>
        {yTicks.slice(1).map((tick) => (
          <View
            key={`grid-${tick}`}
            style={[styles.gridLine, { bottom: xAxisHeight + (tick / yMax) * plotHeight }]}
          />
        ))}
        <View style={[styles.barsArea, { height: totalPlotStackHeight }]}>
          {categories.map((cat, i) => (
            <View
              key={`${cat}-${i}`}
              style={[
                styles.categorySlot,
                {
                  width: columnWidth,
                  marginRight: i < categories.length - 1 ? COLUMN_GAP : 0,
                },
              ]}
            >
              <View style={[styles.barGroup, { height: plotHeight }]}>
                {series.map((s) => {
                  const v = s.values[i] ?? 0;
                  const barH = yMax > 0 ? Math.max(v > 0 ? 4 : 0, (v / yMax) * (plotHeight - 4)) : 0;
                  const tooltip =
                    s.tooltips?.[i] ??
                    `${s.name}: ${v.toLocaleString('vi-VN')}\n${cat}`;
                  return (
                    <View key={s.name} style={styles.barCol}>
                      <ReportHoverTooltip
                        text={tooltip}
                        placement="bottom"
                        style={styles.barTooltipWrap}
                      >
                        <View
                          style={[styles.bar, { height: barH, backgroundColor: s.color }]}
                          accessibilityLabel={tooltip}
                        />
                      </ReportHoverTooltip>
                    </View>
                  );
                })}
              </View>
              <View style={[styles.xAxisCell, { height: xAxisHeight, width: columnWidth }]}>
                <ReportHoverTooltip text={cat} placement="top">
                  <Text style={styles.xAxisLabel} numberOfLines={2} ellipsizeMode="tail">
                    {displayLabels[i]}
                  </Text>
                </ReportHoverTooltip>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.chartWrap}>
      <View style={[styles.chartWithAxis, { height: totalPlotStackHeight }]}>
        <View style={[styles.yAxis, { height: totalPlotStackHeight, paddingBottom: xAxisHeight }]}>
          {[...yTicks].reverse().map((tick) => (
            <Text key={tick} style={styles.yTick}>
              {tick.toLocaleString('vi-VN')}
            </Text>
          ))}
        </View>
        {useScroll ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            style={styles.chartScroll}
            contentContainerStyle={styles.chartScrollContent}
            nestedScrollEnabled
          >
            {renderChartBody(chartContentWidth)}
          </ScrollView>
        ) : (
          <View style={styles.chartScroll}>{renderChartBody()}</View>
        )}
      </View>
      <Text style={styles.yAxisCaption}>Số lượng (sp)</Text>
      <Text style={styles.xAxisCaption}>Sản phẩm</Text>
      <View style={styles.legendRow}>
        {series.map((s) => (
          <View key={s.name} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

interface ReportHorizontalBarChartProps {
  items: BarSeries[];
}

const formatBarValue = (item: BarSeries) =>
  item.formatAsCurrency ? formatCurrencyVND(item.value) : item.value.toLocaleString('vi-VN');

export const ReportHorizontalBarChart: React.FC<ReportHorizontalBarChartProps> = ({ items }) => {
  const max = useMemo(() => Math.max(1, ...items.map((i) => i.value), 0), [items]);

  if (items.length === 0) {
    return <Text style={styles.emptyChart}>Không có dữ liệu</Text>;
  }

  return (
    <View style={{ gap: 10 }}>
      {items.map((item) => {
        const tooltip = item.tooltip ?? `${item.label}: ${formatBarValue(item)}`;
        return (
          <ReportHoverTooltip key={item.label} text={tooltip} placement="top">
            <View>
              <View style={styles.hLabelRow}>
                <Text style={styles.hLabel} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={styles.hValue}>{formatBarValue(item)}</Text>
              </View>
              <View style={styles.hTrack}>
                <View
                  style={[
                    styles.hFill,
                    {
                      width: `${(item.value / max) * 100}%`,
                      backgroundColor: item.color,
                    },
                  ]}
                />
              </View>
            </View>
          </ReportHoverTooltip>
        );
      })}
    </View>
  );
};

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  tooltip?: string;
}

interface ReportDonutChartProps {
  segments: DonutSegment[];
  size?: number;
}

export const ReportDonutChart: React.FC<ReportDonutChartProps> = ({ segments, size = 120 }) => {
  const total = segments.reduce((s, x) => s + x.value, 0);
  if (total === 0) {
    return <Text style={styles.emptyChart}>Không có dữ liệu</Text>;
  }

  let cumulative = 0;
  const stops = segments.map((seg) => {
    const start = (cumulative / total) * 100;
    cumulative += seg.value;
    const end = (cumulative / total) * 100;
    return `${seg.color} ${start}% ${end}%`;
  });

  const ringStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    background: `conic-gradient(${stops.join(', ')})`,
  } as const;

  const centerTooltip = `Tổng: ${total.toLocaleString('vi-VN')} đơn hàng`;

  return (
    <View style={styles.donutRow}>
      <ReportHoverTooltip text={centerTooltip}>
        <View style={[styles.donutOuter, { width: size, height: size }]}>
          <View style={[styles.donutRing, ringStyle]} />
          <View
            style={[
              styles.donutHole,
              {
                width: size * 0.58,
                height: size * 0.58,
                borderRadius: (size * 0.58) / 2,
              },
            ]}
          >
            <Text style={styles.donutTotal}>{total.toLocaleString('vi-VN')}</Text>
            <Text style={styles.donutSub}>đơn</Text>
          </View>
        </View>
      </ReportHoverTooltip>
      <View style={styles.donutLegend}>
        {segments.map((seg) => {
          const pct = total > 0 ? ((seg.value / total) * 100).toFixed(1) : '0';
          const tooltip =
            seg.tooltip ??
            `${seg.label}: ${seg.value.toLocaleString('vi-VN')} đơn (${pct}% tổng đơn)`;
          return (
            <ReportHoverTooltip key={seg.label} text={tooltip}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                <Text style={styles.legendText}>
                  {seg.label}: {seg.value.toLocaleString('vi-VN')}
                </Text>
              </View>
            </ReportHoverTooltip>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  chartWrap: { gap: 4, width: '100%' },
  chartWithAxis: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    width: '100%',
  },
  yAxis: {
    width: Y_AXIS_WIDTH,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
  },
  yTick: {
    fontSize: 10,
    fontWeight: '600',
    color: '#6B7280',
    textAlign: 'right',
    width: '100%',
  },
  yAxisCaption: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9CA3AF',
    marginLeft: Y_AXIS_WIDTH + 4,
    marginTop: 2,
  },
  xAxisCaption: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  plotStack: {
    flexDirection: 'column',
  },
  categorySlot: {
    flexDirection: 'column',
    alignItems: 'center',
    flexShrink: 0,
  },
  xAxisCell: {
    width: '100%',
    borderTopWidth: 2,
    borderTopColor: '#9CA3AF',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  xAxisLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    width: '100%',
    lineHeight: 14,
  },
  chartScroll: {
    flex: 1,
    maxWidth: '100%',
  },
  chartScrollContent: {
    paddingRight: 8,
  },
  plotArea: {
    position: 'relative',
    minHeight: 120,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F3F4F6',
    zIndex: 0,
  },
  barsArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    zIndex: 1,
  },
  barGroup: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    minWidth: 18,
    height: '100%',
  },
  barTooltipWrap: {
    flex: 1,
    width: '100%',
    minHeight: 4,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: 16,
    minWidth: 12,
    borderRadius: 4,
    minHeight: 4,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, color: '#4B5563', fontWeight: '600' },
  emptyChart: { color: '#9CA3AF', fontSize: 13, paddingVertical: 12 },
  hLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
    gap: 8,
  },
  hLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: '#4B5563' },
  hValue: { fontSize: 12, fontWeight: '800', color: '#111827' },
  hTrack: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  hFill: { height: '100%', borderRadius: 4 },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    flexWrap: 'wrap',
  },
  donutOuter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutRing: {},
  donutHole: {
    position: 'absolute',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutTotal: { fontSize: 22, fontWeight: '800', color: '#111827' },
  donutSub: { fontSize: 11, color: '#6B7280', fontWeight: '600' },
  donutLegend: { flex: 1, gap: 8, minWidth: 140 },
});
