import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

import { colors, font, spacing } from '@/theme';

export type ChartSeries = { label: string; color: string; values: number[] };

type Props = {
  series: ChartSeries[];
  width: number;
  height?: number;
  /** Optional shaded band (e.g. prediction interval) drawn at the far right. */
  band?: { low: number; high: number; color: string } | null;
};

export function PriceChart({ series, width, height = 200, band }: Props) {
  const padding = { left: 44, right: 12, top: 12, bottom: 24 };
  const plotW = Math.max(10, width - padding.left - padding.right);
  const plotH = height - padding.top - padding.bottom;

  const all = series.flatMap((s) => s.values).filter((v) => Number.isFinite(v));
  if (band) all.push(band.low, band.high);
  if (all.length === 0) {
    return (
      <View style={[styles.empty, { width, height }]}>
        <Text style={styles.emptyText}>No data</Text>
      </View>
    );
  }

  let min = Math.min(...all);
  let max = Math.max(...all);
  if (min === max) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.1;
  min -= pad;
  max += pad;

  const maxLen = Math.max(...series.map((s) => s.values.length));
  const xFor = (i: number) => padding.left + (maxLen <= 1 ? 0 : (i / (maxLen - 1)) * plotW);
  const yFor = (v: number) => padding.top + (1 - (v - min) / (max - min)) * plotH;

  const gridLines = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = max - f * (max - min);
    const y = padding.top + f * plotH;
    return { y, v };
  });

  return (
    <View>
      <Svg width={width} height={height}>
        {gridLines.map((g, idx) => (
          <React.Fragment key={idx}>
            <Line x1={padding.left} y1={g.y} x2={width - padding.right} y2={g.y} stroke={colors.border} strokeWidth={1} />
          </React.Fragment>
        ))}
        {band ? (
          <Rect
            x={xFor(maxLen - 1) - 6}
            y={yFor(band.high)}
            width={12}
            height={Math.max(2, yFor(band.low) - yFor(band.high))}
            fill={band.color}
            opacity={0.35}
            rx={3}
          />
        ) : null}
        {series.map((s, si) => {
          const pts = s.values
            .map((v, i) => (Number.isFinite(v) ? `${xFor(i)},${yFor(v)}` : null))
            .filter(Boolean) as string[];
          if (pts.length === 0) return null;
          const d = `M ${pts.join(' L ')}`;
          const lastIdx = s.values.length - 1;
          return (
            <React.Fragment key={si}>
              <Path d={d} stroke={s.color} strokeWidth={2.5} fill="none" />
              {Number.isFinite(s.values[lastIdx]) ? (
                <Circle cx={xFor(lastIdx)} cy={yFor(s.values[lastIdx])} r={4} fill={s.color} />
              ) : null}
            </React.Fragment>
          );
        })}
      </Svg>
      {/* Y-axis labels overlaid */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {gridLines.map((g, idx) => (
          <Text key={idx} style={[styles.axisLabel, { top: g.y - 7 }]}>
            {Math.round(g.v).toLocaleString()}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        {series.map((s) => (
          <View key={s.label} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: s.color }]} />
            <Text style={styles.legendText}>{s.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: colors.textMuted },
  axisLabel: { position: 'absolute', left: 0, width: 40, textAlign: 'right', color: colors.textMuted, fontSize: 9 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: colors.textMuted, fontSize: font.xs },
});
