import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  AreaUnit,
  FOOD_GROUPS,
  FoodGroupId,
  ModelParameters,
  YieldSensitivityDatum,
  computeIndividualYieldSensitivity,
  convertHectares,
  formatArea,
  getEffectiveGroupMetrics,
  getUnitShortLabel,
} from '../model/landModel';

interface YieldSensitivityBarChartProps {
  params: ModelParameters;
  unit: AreaUnit;
  onApplyGroupOverride: (groupId: FoodGroupId, newBaseMKcalPerHa: number | undefined) => void;
}

type ChartMode = 'delta' | 'total';

const INITIAL_MULTIPLIERS: Record<FoodGroupId, number> = {
  cereals: 1.25,
  roots_pulses: 1.25,
  oils_sugars: 1.25,
  produce: 1.25,
  dairy_eggs: 1.25,
  meat: 1.25,
};

export const YieldSensitivityBarChart: React.FC<YieldSensitivityBarChartProps> = ({
  params,
  unit,
  onApplyGroupOverride,
}) => {
  const [groupMultipliers, setGroupMultipliers] =
    useState<Record<FoodGroupId, number>>(INITIAL_MULTIPLIERS);
  const [chartMode, setChartMode] = useState<ChartMode>('delta');
  const [hoveredId, setHoveredId] = useState<FoodGroupId | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(640);

  const data = useMemo(
    () => computeIndividualYieldSensitivity(params, groupMultipliers),
    [params, groupMultipliers]
  );

  const unitLabel = getUnitShortLabel(unit);

  // Track responsive container width for D3 scales
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateWidth = () => {
      const next = Math.floor(el.getBoundingClientRect().width);
      if (next > 240) {
        setContainerWidth(next);
      }
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Render D3 bar chart whenever data, unit, mode, or width changes
  useEffect(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const width = Math.max(380, containerWidth);
    const height = 310;
    const margin = { top: 26, right: 124, bottom: 38, left: 108 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const y0 = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.shortLabel))
      .range([0, innerH])
      .paddingInner(0.28)
      .paddingOuter(0.14);

    // Format axis tick values compactly in active unit
    const formatCompactAxis = (convertedVal: number) => {
      const abs = Math.abs(convertedVal);
      const sign = convertedVal < 0 ? '−' : convertedVal > 0 && chartMode === 'delta' ? '+' : '';
      if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(1)}B`;
      if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(1)}M`;
      if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(0)}K`;
      return `${sign}${abs.toFixed(0)}`;
    };

    if (chartMode === 'delta') {
      const convertedDeltas = data.map((d) => convertHectares(d.deltaLandHa, unit));
      const minDelta = Math.min(0, ...convertedDeltas);
      const maxDelta = Math.max(0, ...convertedDeltas);
      const padSpan = Math.max(Math.abs(minDelta), Math.abs(maxDelta), 1) * 0.14;

      const xMin = minDelta < 0 ? minDelta - padSpan : -padSpan * 0.25;
      const xMax = maxDelta > 0 ? maxDelta + padSpan : padSpan * 0.25;

      const x = d3.scaleLinear().domain([xMin, xMax]).range([0, innerW]).nice();

      // Grid lines
      const xTicks = x.ticks(5);
      g.append('g')
        .selectAll('line')
        .data(xTicks)
        .join('line')
        .attr('x1', (t) => x(t))
        .attr('x2', (t) => x(t))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#E2E8F0')
        .attr('stroke-width', 1);

      // Zero baseline axis
      g.append('line')
        .attr('x1', x(0))
        .attr('x2', x(0))
        .attr('y1', -4)
        .attr('y2', innerH)
        .attr('stroke', '#0F172A')
        .attr('stroke-width', 1.25);

      // X-axis
      const xAxis = d3
        .axisBottom(x)
        .ticks(5)
        .tickSizeOuter(0)
        .tickFormat((d) => formatCompactAxis(Number(d)));

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .call((axisG) => axisG.select('.domain').attr('stroke', '#CBD5E1'))
        .call((axisG) =>
          axisG
            .selectAll('text')
            .style('font-family', 'IBM Plex Mono, monospace')
            .style('font-size', '10px')
            .style('fill', '#64748B')
        );

      // Axis unit header
      g.append('text')
        .attr('x', x(0))
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '10px')
        .style('fill', '#475569')
        .text(`Δ Total Land (${unitLabel})`);

      // Y-axis labels
      const yAxis = d3.axisLeft(y0).tickSize(0).tickPadding(10);
      g.append('g')
        .call(yAxis)
        .call((axisG) => axisG.select('.domain').remove())
        .call((axisG) =>
          axisG
            .selectAll('text')
            .style('font-family', 'Public Sans, sans-serif')
            .style('font-size', '11.5px')
            .style('font-weight', '500')
            .style('fill', '#1E293B')
        );

      // Diverging bars
      g.append('g')
        .selectAll('rect')
        .data(data)
        .join('rect')
        .attr('y', (d) => y0(d.shortLabel) ?? 0)
        .attr('height', y0.bandwidth())
        .attr('x', (d) => {
          const v = convertHectares(d.deltaLandHa, unit);
          return v < 0 ? x(v) : x(0);
        })
        .attr('width', (d) => {
          const v = convertHectares(d.deltaLandHa, unit);
          return Math.max(2, Math.abs(x(v) - x(0)));
        })
        .attr('rx', 2)
        .attr('fill', (d) => {
          if (Math.abs(d.deltaLandHa) < 1e-6) return '#94A3B8';
          return d.deltaLandHa < 0 ? '#059669' : '#DC2626';
        })
        .attr('opacity', (d) => (hoveredId && hoveredId !== d.id ? 0.45 : 0.92))
        .style('cursor', 'pointer')
        .on('mouseenter', (_, d) => setHoveredId(d.id))
        .on('mouseleave', () => setHoveredId(null))
        .on('click', (_, d) => {
          const spec = FOOD_GROUPS.find((fg) => fg.id === d.id);
          if (!spec) return;
          const unitBase = getEffectiveGroupMetrics(
            spec,
            1.0,
            params.ruminantSharePercent,
            {}
          ).millionKcalPerHa;
          onApplyGroupOverride(d.id, d.isOverrideActive ? undefined : unitBase * d.multiplier);
        });

      // Value labels at bar ends
      g.append('g')
        .selectAll('text')
        .data(data)
        .join('text')
        .attr('y', (d) => (y0(d.shortLabel) ?? 0) + y0.bandwidth() / 2 + 3.5)
        .attr('x', (d) => {
          const v = convertHectares(d.deltaLandHa, unit);
          return v >= 0 ? x(v) + 6 : x(0) + 6;
        })
        .attr('text-anchor', 'start')
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '10.5px')
        .style('font-weight', '500')
        .style('fill', (d) =>
          Math.abs(d.deltaLandHa) < 1e-6
            ? '#64748B'
            : d.deltaLandHa < 0
              ? '#047857'
              : '#B91C1C'
        )
        .text((d) => {
          const fmt = formatArea(Math.abs(d.deltaLandHa), unit);
          const sign = d.deltaLandHa < -1e-6 ? '−' : d.deltaLandHa > 1e-6 ? '+' : '';
          const pctSign = d.deltaPercent < -0.001 ? '' : d.deltaPercent > 0.001 ? '+' : '';
          return `${sign}${fmt.value} ${fmt.unitLabel} (${pctSign}${d.deltaPercent.toFixed(1)}%)`;
        });
    } else {
      // Total Land Comparison Mode (Baseline vs. Modified grouped bars)
      const maxLandConv = Math.max(
        1,
        ...data.map((d) =>
          convertHectares(Math.max(d.baselineTotalLandHa, d.modifiedTotalLandHa), unit)
        )
      );

      const x = d3.scaleLinear().domain([0, maxLandConv * 1.12]).range([0, innerW]).nice();

      const y1 = d3
        .scaleBand<'baseline' | 'modified'>()
        .domain(['baseline', 'modified'])
        .range([0, y0.bandwidth()])
        .padding(0.12);

      // Grid lines
      g.append('g')
        .selectAll('line')
        .data(x.ticks(5))
        .join('line')
        .attr('x1', (t) => x(t))
        .attr('x2', (t) => x(t))
        .attr('y1', 0)
        .attr('y2', innerH)
        .attr('stroke', '#E2E8F0')
        .attr('stroke-width', 1);

      const xAxis = d3
        .axisBottom(x)
        .ticks(5)
        .tickSizeOuter(0)
        .tickFormat((d) => formatCompactAxis(Number(d)));

      g.append('g')
        .attr('transform', `translate(0,${innerH})`)
        .call(xAxis)
        .call((axisG) => axisG.select('.domain').attr('stroke', '#CBD5E1'))
        .call((axisG) =>
          axisG
            .selectAll('text')
            .style('font-family', 'IBM Plex Mono, monospace')
            .style('font-size', '10px')
            .style('fill', '#64748B')
        );

      g.append('text')
        .attr('x', innerW / 2)
        .attr('y', -10)
        .attr('text-anchor', 'middle')
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '10px')
        .style('fill', '#475569')
        .text(`Total Land Required (${unitLabel}): Baseline vs. Modified Yield`);

      const yAxis = d3.axisLeft(y0).tickSize(0).tickPadding(10);
      g.append('g')
        .call(yAxis)
        .call((axisG) => axisG.select('.domain').remove())
        .call((axisG) =>
          axisG
            .selectAll('text')
            .style('font-family', 'Public Sans, sans-serif')
            .style('font-size', '11.5px')
            .style('font-weight', '500')
            .style('fill', '#1E293B')
        );

      const rowGroups = g
        .selectAll('.group-row')
        .data(data)
        .join('g')
        .attr('class', 'group-row')
        .attr('transform', (d) => `translate(0,${y0(d.shortLabel) ?? 0})`)
        .style('cursor', 'pointer')
        .on('mouseenter', (_, d) => setHoveredId(d.id))
        .on('mouseleave', () => setHoveredId(null));

      // Baseline bar
      rowGroups
        .append('rect')
        .attr('y', y1('baseline') ?? 0)
        .attr('height', y1.bandwidth())
        .attr('x', 0)
        .attr('width', (d) => Math.max(2, x(convertHectares(d.baselineTotalLandHa, unit))))
        .attr('rx', 1.5)
        .attr('fill', '#94A3B8')
        .attr('opacity', (d) => (hoveredId && hoveredId !== d.id ? 0.4 : 0.75));

      // Modified bar
      rowGroups
        .append('rect')
        .attr('y', y1('modified') ?? 0)
        .attr('height', y1.bandwidth())
        .attr('x', 0)
        .attr('width', (d) => Math.max(2, x(convertHectares(d.modifiedTotalLandHa, unit))))
        .attr('rx', 1.5)
        .attr('fill', (d) =>
          d.deltaLandHa < -1e-6 ? '#059669' : d.deltaLandHa > 1e-6 ? '#DC2626' : '#0F172A'
        )
        .attr('opacity', (d) => (hoveredId && hoveredId !== d.id ? 0.45 : 0.95));

      // Modified total label
      rowGroups
        .append('text')
        .attr('y', (y1('modified') ?? 0) + y1.bandwidth() / 2 + 3.5)
        .attr('x', (d) => x(convertHectares(d.modifiedTotalLandHa, unit)) + 6)
        .style('font-family', 'IBM Plex Mono, monospace')
        .style('font-size', '10.5px')
        .style('font-weight', '500')
        .style('fill', '#0F172A')
        .text((d) => {
          const fmt = formatArea(d.modifiedTotalLandHa, unit);
          return `${fmt.value} ${fmt.unitLabel}`;
        });
    }
  }, [data, unit, unitLabel, chartMode, containerWidth, hoveredId, params.ruminantSharePercent, onApplyGroupOverride]);

  const setAllMultipliers = (val: number) => {
    setGroupMultipliers({
      cereals: val,
      roots_pulses: val,
      oils_sugars: val,
      produce: val,
      dairy_eggs: val,
      meat: val,
    });
  };

  const hoveredDatum: YieldSensitivityDatum | undefined = useMemo(
    () => data.find((d) => d.id === hoveredId) ?? data[data.length - 1],
    [data, hoveredId]
  );

  const uniformMultiplier = Object.values(groupMultipliers).every(
    (v) => Math.abs(v - Object.values(groupMultipliers)[0]) < 0.001
  )
    ? Object.values(groupMultipliers)[0]
    : null;

  return (
    <div className="pt-5 border-t border-slate-200 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900">
            Crop & Livestock Yield Multiplier Sensitivity
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Measures how modifying each food group&apos;s yield multiplier independently alters total agricultural land demand.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick uniform multiplier presets */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
            {[
              { label: '0.75× Stress', val: 0.75 },
              { label: '1.25× Gain', val: 1.25 },
              { label: '1.50× High', val: 1.5 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => setAllMultipliers(p.val)}
                className={`px-2.5 py-1 text-xs font-mono tabular-nums font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                  uniformMultiplier !== null && Math.abs(uniformMultiplier - p.val) < 0.01
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Chart display mode toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200">
            <button
              type="button"
              onClick={() => setChartMode('delta')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                chartMode === 'delta'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Land Delta (Δ)
            </button>
            <button
              type="button"
              onClick={() => setChartMode('total')}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                chartMode === 'total'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Total Land
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column Split: D3 Bar Chart + Individual Group Multiplier Sliders */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        <div className="xl:col-span-7 space-y-2 min-w-0">
          <div ref={containerRef} className="w-full overflow-hidden">
            <svg
              ref={svgRef}
              role="img"
              aria-label="D3 bar chart of land requirement impact from modifying individual crop yield multipliers"
              className="w-full block select-none"
            />
          </div>

          {/* Compact Monospace Readout Strip */}
          {hoveredDatum && (
            <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-600">
              <span>
                <strong className="text-slate-900">{hoveredDatum.label}</strong> (
                {hoveredDatum.sharePercent.toFixed(1)}% kcal) · Yield{' '}
                {hoveredDatum.baselineGroupYieldMKcalPerHa.toFixed(2)} →{' '}
                <strong className="text-slate-900">
                  {hoveredDatum.modifiedGroupYieldMKcalPerHa.toFixed(2)} M kcal/ha
                </strong>
              </span>
              <span>
                Impact:{' '}
                <strong
                  className={
                    hoveredDatum.deltaLandHa < 0
                      ? 'text-emerald-700'
                      : hoveredDatum.deltaLandHa > 0
                        ? 'text-rose-700'
                        : 'text-slate-900'
                  }
                >
                  {hoveredDatum.deltaLandHa < 0 ? '−' : '+'}
                  {formatArea(Math.abs(hoveredDatum.deltaLandHa), unit).value}{' '}
                  {formatArea(Math.abs(hoveredDatum.deltaLandHa), unit).unitLabel} (
                  {hoveredDatum.deltaPercent >= 0 ? '+' : ''}
                  {hoveredDatum.deltaPercent.toFixed(1)}%)
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Individual Per-Crop / Group Yield Multipliers */}
        <div className="xl:col-span-5 bg-slate-50 border border-slate-200 rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-900">
              Individual Group Multipliers
            </span>
            <button
              type="button"
              onClick={() => setAllMultipliers(1.0)}
              className="text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              Reset 1.00×
            </button>
          </div>

          <div className="space-y-2.5">
            {data.map((d) => {
              const spec = FOOD_GROUPS.find((fg) => fg.id === d.id)!;
              return (
                <div
                  key={d.id}
                  onMouseEnter={() => setHoveredId(d.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  className="space-y-1"
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-[2px] shrink-0"
                        style={{ backgroundColor: d.color }}
                      />
                      <span className="font-medium text-slate-800 truncate">
                        {d.shortLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 font-mono tabular-nums">
                      <span className="text-[11px] text-slate-500">
                        {d.multiplier.toFixed(2)}×
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const unitBase = getEffectiveGroupMetrics(
                            spec,
                            1.0,
                            params.ruminantSharePercent,
                            {}
                          ).millionKcalPerHa;
                          onApplyGroupOverride(
                            d.id,
                            d.isOverrideActive ? undefined : unitBase * d.multiplier
                          );
                        }}
                        className={`px-2 py-0.5 text-[11px] font-sans font-medium rounded border transition-colors whitespace-nowrap shrink-0 ${
                          d.isOverrideActive
                            ? 'bg-emerald-700 text-white border-emerald-700'
                            : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        {d.isOverrideActive ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                  </div>
                  <input
                    aria-label={`${d.label} test yield multiplier`}
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={d.multiplier}
                    onChange={(e) =>
                      setGroupMultipliers((prev) => ({
                        ...prev,
                        [d.id]: Number(e.target.value),
                      }))
                    }
                    className="w-full"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
