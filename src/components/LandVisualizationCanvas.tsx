import React, { useMemo, useState } from 'react';
import {
  AreaUnit,
  GLOBAL_AGRICULTURAL_LAND_HA,
  GLOBAL_HABITABLE_LAND_HA,
  GLOBAL_TOTAL_LAND_HA,
  ModelOutput,
  RegionPreset,
  formatArea,
  formatKcalScientific,
  formatPopulation,
} from '../model/landModel';

interface LandVisualizationCanvasProps {
  output: ModelOutput;
  unit: AreaUnit;
  region: RegionPreset;
  wastePercent: number;
}

type LandBucketId = 'direct_crop' | 'feed_crop' | 'pasture' | 'reserve';

interface LandBucketSpec {
  id: LandBucketId;
  label: string;
  description: string;
  ha: number;
  color: string;
  bgClass: string;
}

export const LandVisualizationCanvas: React.FC<LandVisualizationCanvasProps> = ({
  output,
  unit,
  region,
  wastePercent,
}) => {
  const [hoveredBucket, setHoveredBucket] = useState<LandBucketId | null>(null);
  const [hoveredYearIndex, setHoveredYearIndex] = useState<number | null>(null);

  const totalFmt = formatArea(output.totalLandHa, unit);
  const croplandFmt = formatArea(output.totalCroplandHa, unit);
  const pastureFmt = formatArea(output.grazingPastureHa, unit);
  const availAgFmt = formatArea(output.availableAgLandHa, unit);
  const worldTotalFmt = formatArea(GLOBAL_TOTAL_LAND_HA, unit);
  const worldHabitableFmt = formatArea(GLOBAL_HABITABLE_LAND_HA, unit);
  const worldAgFmt = formatArea(GLOBAL_AGRICULTURAL_LAND_HA, unit);
  const farmGateSci = formatKcalScientific(output.annualFarmGateKcal);
  const ingestedSci = formatKcalScientific(output.annualIngestedKcal);

  const worldStatus =
    output.worldTotalLandPercent > 100
      ? {
          glyph: '✖',
          text: 'Exceeds Total Earth Land',
          colorClass: 'text-rose-700',
        }
      : output.worldHabitableLandPercent > 100
        ? {
            glyph: '✖',
            text: 'Exceeds Habitable Land',
            colorClass: 'text-rose-700',
          }
        : output.worldAgLandPercent > 100
          ? {
              glyph: '▲',
              text: 'Exceeds Existing Ag Land',
              colorClass: 'text-amber-700',
            }
          : {
              glyph: '●',
              text: 'Within Global Ag Land',
              colorClass: 'text-emerald-700',
            };

  const cropPctOfWorld = Math.min(
    100,
    (output.totalCroplandHa / GLOBAL_TOTAL_LAND_HA) * 100
  );
  const pasturePctOfWorld = Math.min(
    Math.max(0, 100 - cropPctOfWorld),
    (output.grazingPastureHa / GLOBAL_TOTAL_LAND_HA) * 100
  );
  const worldAgMarkerPct = (GLOBAL_AGRICULTURAL_LAND_HA / GLOBAL_TOTAL_LAND_HA) * 100;
  const worldHabitableMarkerPct = (GLOBAL_HABITABLE_LAND_HA / GLOBAL_TOTAL_LAND_HA) * 100;

  const capacityDisplay =
    output.capacityStatus === 'exceeds'
      ? { glyph: '✖', text: 'Exceeds Supply', colorClass: 'text-rose-700' }
      : output.capacityStatus === 'near'
        ? { glyph: '▲', text: 'Near Ceiling', colorClass: 'text-amber-700' }
        : { glyph: '●', text: 'Within Capacity', colorClass: 'text-emerald-700' };

  const landBuckets: LandBucketSpec[] = useMemo(
    () => [
      {
        id: 'direct_crop',
        label: 'Direct Human Cropland',
        description: 'Grains, tubers, pulses, oils, produce',
        ha: output.directFoodCroplandHa,
        color: '#059669',
        bgClass: 'bg-emerald-600',
      },
      {
        id: 'feed_crop',
        label: 'Livestock Feed Cropland',
        description: 'Arable land growing animal feed crops',
        ha: output.feedCroplandHa,
        color: '#D97706',
        bgClass: 'bg-amber-600',
      },
      {
        id: 'pasture',
        label: 'Grazing & Pasture Land',
        description: 'Permanent rangeland for ruminants & dairy',
        ha: output.grazingPastureHa,
        color: '#2563EB',
        bgClass: 'bg-blue-600',
      },
      {
        id: 'reserve',
        label: 'Seed & Fallow Margin',
        description: 'Agronomic seed stock & rotation buffer',
        ha: output.reserveBufferHa,
        color: '#64748B',
        bgClass: 'bg-slate-500',
      },
    ],
    [output]
  );

  // Build 100-tile matrix (each tile = 1% of total land)
  const tiles = useMemo(() => {
    const total = output.totalLandHa || 1;
    const rawCounts = landBuckets.map((b) => (b.ha / total) * 100);
    const floored = rawCounts.map((c) => Math.floor(c));
    let remainder = 100 - floored.reduce((a, b) => a + b, 0);

    // Distribute remainder by largest fractional parts
    const order = rawCounts
      .map((c, idx) => ({ idx, frac: c - floored[idx] }))
      .sort((a, b) => b.frac - a.frac);

    for (let i = 0; i < remainder; i++) {
      floored[order[i % order.length].idx] += 1;
    }

    const result: LandBucketSpec[] = [];
    landBuckets.forEach((b, idx) => {
      for (let k = 0; k < floored[idx]; k++) {
        result.push(b);
      }
    });
    return result;
  }, [landBuckets, output.totalLandHa]);

  // SVG Trajectory Chart geometry
  const chartW = 680;
  const chartH = 260;
  const padL = 62;
  const padR = 24;
  const padT = 22;
  const padB = 34;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const maxSeriesHa = Math.max(
    output.availableAgLandHa * 1.12,
    ...output.projections.map((p) => Math.max(p.baselineLandHa, p.optimizedLandHa) * 1.08)
  );
  const safeMaxY = maxSeriesHa > 0 ? maxSeriesHa : 1;

  const getX = (idx: number) =>
    padL + (idx / Math.max(1, output.projections.length - 1)) * plotW;
  const getY = (ha: number) => padT + plotH - (ha / safeMaxY) * plotH;

  const baselinePath = output.projections
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.baselineLandHa).toFixed(1)}`)
    .join(' ');

  const optimizedPath = output.projections
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.optimizedLandHa).toFixed(1)}`)
    .join(' ');

  const ceilingY = getY(output.availableAgLandHa);
  const showCeilingLine = ceilingY >= padT - 4 && ceilingY <= padT + plotH + 4;

  const activePoint =
    hoveredYearIndex !== null
      ? output.projections[hoveredYearIndex]
      : output.projections[output.projections.length - 1];

  const activeBaselineFmt = formatArea(activePoint.baselineLandHa, unit);
  const activeOptimizedFmt = formatArea(activePoint.optimizedLandHa, unit);

  return (
    <div className="space-y-6 min-w-0">
      {/* KPI Calibration Strip */}
      <div className="bg-white border border-slate-200 rounded-lg grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
        {/* KPI 1: Total Land Required */}
        <div className="p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-slate-500">
            Total Agricultural Land Needed
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono tabular-nums font-semibold tracking-tight text-slate-900">
              {totalFmt.value}
            </span>
            <span className="text-xs font-mono uppercase text-slate-500">
              {totalFmt.unitLabel}
            </span>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            Crop {croplandFmt.value} {croplandFmt.unitLabel} · Pasture {pastureFmt.value}{' '}
            {pastureFmt.unitLabel}
          </div>
        </div>

        {/* KPI 2: Per-Capita Land Footprint */}
        <div className="p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-slate-500">
            Per-Capita Land Footprint
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono tabular-nums font-semibold tracking-tight text-slate-900">
              {Math.round(output.perCapitaSqMeters).toLocaleString('en-US')}
            </span>
            <span className="text-xs font-mono text-slate-500">m² / person</span>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            {output.perCapitaHa.toFixed(3)} ha/person ·{' '}
            {(output.perCapitaHa * 2.47105).toFixed(2)} ac/person
          </div>
        </div>

        {/* KPI 3: Annual Caloric Production Required */}
        <div className="p-5 flex flex-col justify-between gap-2">
          <div className="text-xs font-medium text-slate-500">
            Annual Farm-Gate Energy
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono tabular-nums font-semibold tracking-tight text-slate-900">
              {farmGateSci.mantissa}×10<sup className="text-lg">{farmGateSci.exponent}</sup>
            </span>
            <span className="text-xs font-mono text-slate-500">kcal / yr</span>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            Ingested {ingestedSci.mantissa}×10^{ingestedSci.exponent} · Waste {wastePercent}%
          </div>
        </div>

        {/* KPI 4: Regional Capacity Utilization */}
        <div className="p-5 flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-slate-500">
              Regional Land Utilization
            </span>
            <span
              className={`text-xs font-medium whitespace-nowrap ${capacityDisplay.colorClass}`}
            >
              {capacityDisplay.glyph} {capacityDisplay.text}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-mono tabular-nums font-semibold tracking-tight text-slate-900">
              {output.agLandUtilizationPercent.toFixed(1)}%
            </span>
            <span className="text-xs font-mono text-slate-500">
              of {availAgFmt.value} {availAgFmt.unitLabel}
            </span>
          </div>
          <div className="text-xs font-mono tabular-nums text-slate-500">
            Arable cropland ratio: {output.arableLandUtilizationPercent.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Global Land Available vs. Population Requirement */}
      <section
        aria-label="Global Land Available versus Population Requirement"
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              World Land Available vs. Population Requirement
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares derived land needed ({totalFmt.value} {totalFmt.unitLabel}) against total Earth land ({worldTotalFmt.value} {worldTotalFmt.unitLabel}), habitable land ({worldHabitableFmt.value} {worldHabitableFmt.unitLabel}), and existing global farmland ({worldAgFmt.value} {worldAgFmt.unitLabel}).
            </p>
          </div>
          <span
            className={`text-xs font-medium whitespace-nowrap shrink-0 ${worldStatus.colorClass}`}
          >
            {worldStatus.glyph} {worldStatus.text}
          </span>
        </div>

        {/* Full-Width Calibrated World Land Scale Bar (100% = Total Earth Land 13.0 B ha) */}
        <div className="space-y-2 pt-1">
          <div className="relative h-6 w-full bg-slate-100 border border-slate-200 rounded overflow-hidden flex">
            <div
              className="h-full bg-emerald-600 transition-all duration-200"
              style={{ width: `${cropPctOfWorld}%` }}
              title={`Cropland & Reserve Needed: ${cropPctOfWorld.toFixed(2)}% of total world land`}
            />
            <div
              className="h-full bg-blue-600 transition-all duration-200"
              style={{ width: `${pasturePctOfWorld}%` }}
              title={`Grazing Pasture Needed: ${pasturePctOfWorld.toFixed(2)}% of total world land`}
            />

            {/* Global Agricultural Land Reference Tick (36.8%) */}
            <div
              aria-hidden="true"
              className="absolute top-0 bottom-0 w-px bg-slate-900/70"
              style={{ left: `${worldAgMarkerPct}%` }}
            />
            {/* Global Habitable Land Reference Tick (80.0%) */}
            <div
              aria-hidden="true"
              className="absolute top-0 bottom-0 w-px bg-amber-700/80"
              style={{ left: `${worldHabitableMarkerPct}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500">
            <div className="flex flex-wrap items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 inline-block" />
                Cropland Needed ({cropPctOfWorld.toFixed(1)}%)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-blue-600 inline-block" />
                Pasture Needed ({pasturePctOfWorld.toFixed(1)}%)
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <span>│ Global Ag Land: {worldAgMarkerPct.toFixed(1)}%</span>
              <span>│ Habitable Land: {worldHabitableMarkerPct.toFixed(1)}%</span>
              <span>100% = {worldTotalFmt.value} {worldTotalFmt.unitLabel}</span>
            </div>
          </div>
        </div>

        {/* 3-Column Percentage Comparison Strip */}
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-200 pt-2 border-t border-slate-100">
          <div className="py-2 md:pr-5 space-y-1">
            <div className="text-xs font-medium text-slate-500">
              % of Total World Land ({worldTotalFmt.value} {worldTotalFmt.unitLabel})
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
                {output.worldTotalLandPercent.toFixed(2)}%
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                needed
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500">
              {output.totalLandHa <= GLOBAL_TOTAL_LAND_HA
                ? `${formatArea(GLOBAL_TOTAL_LAND_HA - output.totalLandHa, unit).value} ${formatArea(GLOBAL_TOTAL_LAND_HA - output.totalLandHa, unit).unitLabel} remaining (${(100 - output.worldTotalLandPercent).toFixed(2)}%)`
                : `${formatArea(output.totalLandHa - GLOBAL_TOTAL_LAND_HA, unit).value} ${formatArea(output.totalLandHa - GLOBAL_TOTAL_LAND_HA, unit).unitLabel} over Earth landmass`}
            </div>
          </div>

          <div className="py-2 md:px-5 space-y-1">
            <div className="text-xs font-medium text-slate-500">
              % of Habitable World Land ({worldHabitableFmt.value} {worldHabitableFmt.unitLabel})
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
                {output.worldHabitableLandPercent.toFixed(2)}%
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                needed
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500">
              {output.totalLandHa <= GLOBAL_HABITABLE_LAND_HA
                ? `${formatArea(GLOBAL_HABITABLE_LAND_HA - output.totalLandHa, unit).value} ${formatArea(GLOBAL_HABITABLE_LAND_HA - output.totalLandHa, unit).unitLabel} left for forests & cities`
                : `${formatArea(output.totalLandHa - GLOBAL_HABITABLE_LAND_HA, unit).value} ${formatArea(output.totalLandHa - GLOBAL_HABITABLE_LAND_HA, unit).unitLabel} beyond habitable limit`}
            </div>
          </div>

          <div className="py-2 md:pl-5 space-y-1">
            <div className="text-xs font-medium text-slate-500">
              % of World Agricultural Land ({worldAgFmt.value} {worldAgFmt.unitLabel})
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-mono tabular-nums font-semibold text-slate-900">
                {output.worldAgLandPercent.toFixed(2)}%
              </span>
              <span className="text-xs font-mono tabular-nums text-slate-500">
                needed
              </span>
            </div>
            <div className="text-xs font-mono tabular-nums text-slate-500">
              {output.totalLandHa <= GLOBAL_AGRICULTURAL_LAND_HA
                ? `${formatArea(GLOBAL_AGRICULTURAL_LAND_HA - output.totalLandHa, unit).value} ${formatArea(GLOBAL_AGRICULTURAL_LAND_HA - output.totalLandHa, unit).unitLabel} ag headroom available`
                : `${formatArea(output.totalLandHa - GLOBAL_AGRICULTURAL_LAND_HA, unit).value} ${formatArea(output.totalLandHa - GLOBAL_AGRICULTURAL_LAND_HA, unit).unitLabel} expansion required`}
            </div>
          </div>
        </div>
      </section>

      {/* Main Spatial Allocation + Food Group Decomposition */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-stretch">
        {/* Left: 100-Tile Spatial Allocation Grid */}
        <div className="xl:col-span-5 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-slate-900">
                Land-Use Composition Matrix
              </h3>
              <span className="text-[11px] font-mono tabular-nums text-slate-500">
                1 cell = 1% ({formatArea(output.totalLandHa / 100, unit).value}{' '}
                {formatArea(output.totalLandHa / 100, unit).unitLabel})
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Proportional split between direct food crops, feed crops, and grazing pasture.
            </p>
          </div>

          {/* 10x10 SVG/CSS Unit Matrix */}
          <div
            className="grid grid-cols-10 gap-1.5"
            role="img"
            aria-label="100-unit land allocation waffle matrix"
            onMouseLeave={() => setHoveredBucket(null)}
          >
            {tiles.map((tile, idx) => {
              const isDimmed = hoveredBucket !== null && hoveredBucket !== tile.id;
              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredBucket(tile.id)}
                  className={`aspect-square rounded-[2px] transition-opacity duration-150 ${tile.bgClass} ${
                    isDimmed ? 'opacity-25' : 'opacity-100'
                  }`}
                  title={`${tile.label}`}
                />
              );
            })}
          </div>

          {/* Interactive Bucket Legend */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            {landBuckets.map((bucket) => {
              const fmt = formatArea(bucket.ha, unit);
              const pct =
                output.totalLandHa > 0 ? (bucket.ha / output.totalLandHa) * 100 : 0;
              const isHighlighted = hoveredBucket === bucket.id;
              return (
                <div
                  key={bucket.id}
                  onMouseEnter={() => setHoveredBucket(bucket.id)}
                  onMouseLeave={() => setHoveredBucket(null)}
                  className={`flex items-center justify-between gap-2 px-2 py-1.5 rounded transition-colors cursor-default ${
                    isHighlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-[2px] shrink-0 ${bucket.bgClass}`}
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-800 truncate">
                        {bucket.label}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {bucket.description}
                      </div>
                    </div>
                  </div>
                  <div className="text-right shrink-0 font-mono tabular-nums">
                    <div className="text-xs font-semibold text-slate-900">
                      {fmt.value} {fmt.unitLabel}
                    </div>
                    <div className="text-[11px] text-slate-500">{pct.toFixed(1)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Food-Group Land Intensity & Share Decomposition */}
        <div className="xl:col-span-7 bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-slate-900">
                Land Footprint by Dietary Group
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Notice the divergence between caloric share (%) and land share (%) across plant vs. animal foods.
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-500">
              {Math.round(output.weightedDailyKcal).toLocaleString('en-US')} kcal/person/d
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                  <th className="py-2 pr-3 font-medium">Food Group</th>
                  <th className="py-2 px-2 text-right font-medium">Calorie Share</th>
                  <th className="py-2 px-2 text-right font-medium">Yield (M kcal/ha)</th>
                  <th className="py-2 px-2 text-right font-medium">Derived Land</th>
                  <th className="py-2 pl-3 text-right font-medium w-36">Land Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {output.groupBreakdown.map((g) => {
                  const areaFmt = formatArea(g.totalHa, unit);
                  return (
                    <tr key={g.id} className="hover:bg-slate-50/75 transition-colors">
                      <td className="py-3 pr-3">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="w-2.5 h-2.5 rounded-[2px] shrink-0"
                            style={{ backgroundColor: g.color }}
                          />
                          <span className="font-medium text-slate-800 whitespace-nowrap">
                            {g.label}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-700">
                        {g.sharePercent.toFixed(1)}%
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums text-slate-600">
                        {g.effectiveMillionKcalPerHa.toFixed(2)}
                      </td>
                      <td className="py-3 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                        {areaFmt.value}{' '}
                        <span className="text-[11px] font-normal text-slate-500">
                          {areaFmt.unitLabel}
                        </span>
                      </td>
                      <td className="py-3 pl-3">
                        <div className="flex items-center justify-end gap-2">
                          <div className="w-20 h-2 bg-slate-100 rounded-xs overflow-hidden">
                            <div
                              className="h-full rounded-xs"
                              style={{
                                width: `${Math.min(100, Math.max(2, g.percentOfLand))}%`,
                                backgroundColor: g.color,
                              }}
                            />
                          </div>
                          <span className="w-11 text-right font-mono tabular-nums text-slate-700">
                            {g.percentOfLand.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
            <span>Reference Benchmark: {region.referenceComparison}</span>
            <span className="font-mono tabular-nums">
              Seed/Reserve Buffer: +{formatArea(output.reserveBufferHa, unit).value}{' '}
              {formatArea(output.reserveBufferHa, unit).unitLabel}
            </span>
          </div>
        </div>
      </div>

      {/* 2026-2050 Land Demand Trajectory */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              2026–2050 Land Requirement Trajectory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Compares constant-yield demographic growth against an efficiency pathway (50% waste cut & +1%/yr yield gain).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs font-mono tabular-nums">
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-slate-900 inline-block" />
              <span className="text-slate-700">
                Current Trajectory ({activePoint.year}: {activeBaselineFmt.value}{' '}
                {activeBaselineFmt.unitLabel})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-600 inline-block" />
              <span className="text-emerald-700">
                Efficiency Pathway ({activePoint.year}: {activeOptimizedFmt.value}{' '}
                {activeOptimizedFmt.unitLabel})
              </span>
            </div>
          </div>
        </div>

        <div className="relative">
          <svg
            viewBox={`0 0 ${chartW} ${chartH}`}
            className="w-full h-64 cursor-crosshair select-none overflow-visible"
            onMouseLeave={() => setHoveredYearIndex(null)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const relX = ((e.clientX - rect.left) / rect.width) * chartW;
              const clamped = Math.max(padL, Math.min(padL + plotW, relX));
              const ratio = (clamped - padL) / plotW;
              const idx = Math.round(ratio * (output.projections.length - 1));
              setHoveredYearIndex(idx);
            }}
          >
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
              const y = padT + plotH * (1 - frac);
              const valHa = safeMaxY * frac;
              const lbl = formatArea(valHa, unit);
              return (
                <g key={frac}>
                  <line
                    x1={padL}
                    x2={padL + plotW}
                    y1={y}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth={1}
                  />
                  <text
                    x={padL - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-slate-400 text-[10px] font-mono tabular-nums"
                  >
                    {lbl.value}
                  </text>
                </g>
              );
            })}

            {/* Y-axis unit label */}
            <text
              x={padL - 8}
              y={padT - 8}
              textAnchor="end"
              className="fill-slate-500 text-[10px] font-mono uppercase"
            >
              {totalFmt.unitLabel}
            </text>

            {/* Regional Agricultural Land Ceiling */}
            {showCeilingLine && (
              <g>
                <line
                  x1={padL}
                  x2={padL + plotW}
                  y1={ceilingY}
                  y2={ceilingY}
                  stroke="#DC2626"
                  strokeWidth={1.25}
                  strokeDasharray="4 4"
                />
                <text
                  x={padL + plotW}
                  y={ceilingY - 6}
                  textAnchor="end"
                  className="fill-rose-700 text-[10px] font-mono font-medium"
                >
                  Available Ag Land ({availAgFmt.value} {availAgFmt.unitLabel})
                </text>
              </g>
            )}

            {/* Efficiency Pathway Line (dashed emerald) */}
            <path
              d={optimizedPath}
              fill="none"
              stroke="#059669"
              strokeWidth={2}
              strokeDasharray="5 4"
            />

            {/* Baseline Trajectory Line (solid dark slate) */}
            <path
              d={baselinePath}
              fill="none"
              stroke="#0F172A"
              strokeWidth={2.25}
            />

            {/* X-axis Year Labels */}
            {output.projections.map((p, idx) => {
              if (idx % 2 !== 0 && idx !== output.projections.length - 1) return null;
              return (
                <text
                  key={p.year}
                  x={getX(idx)}
                  y={padT + plotH + 18}
                  textAnchor="middle"
                  className="fill-slate-500 text-[10px] font-mono tabular-nums"
                >
                  {p.year}
                </text>
              );
            })}

            {/* Interactive Crosshair */}
            {hoveredYearIndex !== null && (
              <g>
                <line
                  x1={getX(hoveredYearIndex)}
                  x2={getX(hoveredYearIndex)}
                  y1={padT}
                  y2={padT + plotH}
                  stroke="#94A3B8"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                />
                <circle
                  cx={getX(hoveredYearIndex)}
                  cy={getY(activePoint.baselineLandHa)}
                  r={4}
                  fill="#0F172A"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
                <circle
                  cx={getX(hoveredYearIndex)}
                  cy={getY(activePoint.optimizedLandHa)}
                  r={4}
                  fill="#059669"
                  stroke="#FFFFFF"
                  strokeWidth={1.5}
                />
              </g>
            )}
          </svg>

          {/* Compact Monospace HUD readout */}
          <div className="mt-2 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs font-mono tabular-nums text-slate-600">
            <span>
              Year {activePoint.year} · Projected Pop:{' '}
              <strong className="text-slate-900">
                {formatPopulation(activePoint.population)}
              </strong>
            </span>
            <span>
              Baseline:{' '}
              <strong className="text-slate-900">
                {activeBaselineFmt.value} {activeBaselineFmt.unitLabel}
              </strong>{' '}
              · Efficiency:{' '}
              <strong className="text-emerald-700">
                {activeOptimizedFmt.value} {activeOptimizedFmt.unitLabel}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
