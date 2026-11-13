import React, { useMemo } from 'react';
import {
  AreaUnit,
  FOOD_GROUPS,
  FoodGroupId,
  ModelOutput,
  ModelParameters,
  computeSensitivityMatrix,
  formatArea,
  getEffectiveGroupMetrics,
} from '../model/landModel';
import { YieldSensitivityBarChart } from './YieldSensitivityBarChart';

interface SensitivityAndMethodologyProps {
  params: ModelParameters;
  output: ModelOutput;
  unit: AreaUnit;
  onApplyScenario: (dailyKcal: number, animalPercent: number) => void;
  onApplyGroupOverride: (groupId: FoodGroupId, newBaseMKcalPerHa: number | undefined) => void;
}

export const SensitivityAndMethodology: React.FC<SensitivityAndMethodologyProps> = ({
  params,
  output,
  unit,
  onApplyScenario,
  onApplyGroupOverride,
}) => {
  const matrix = useMemo(() => computeSensitivityMatrix(params), [params]);

  const currentAnimalPct =
    (params.dietShares.dairy_eggs ?? 0) + (params.dietShares.meat ?? 0);

  // Closest cell to current parameters
  const closestKcal = matrix.calorieLevels.reduce((prev, curr) =>
    Math.abs(curr - output.weightedDailyKcal) < Math.abs(prev - output.weightedDailyKcal)
      ? curr
      : prev
  );
  const closestAnimal = matrix.animalShareLevels.reduce((prev, curr) =>
    Math.abs(curr - currentAnimalPct) < Math.abs(prev - currentAnimalPct) ? curr : prev
  );

  return (
    <div className="space-y-6">
      {/* Sensitivity Matrix */}
      <section
        id="sensitivity"
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Calorie × Dietary Intensity Sensitivity Matrix
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Total land required across daily caloric intake levels and animal-sourced calorie shares. Click any cell to apply that scenario.
            </p>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-600">
            <span className="text-emerald-700">● ≤80% Capacity</span>
            <span className="text-amber-700">▲ 80–100%</span>
            <span className="text-rose-700">✖ &gt;100% Deficit</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-2.5 pr-3 text-left font-medium text-slate-500">
                  Daily Intake \ Animal Share
                </th>
                {matrix.animalShareLevels.map((animalPct) => (
                  <th
                    key={animalPct}
                    className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-700"
                  >
                    {animalPct}% Animal
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {matrix.cells.map((row, rowIdx) => {
                const kcal = matrix.calorieLevels[rowIdx];
                return (
                  <tr key={kcal}>
                    <td className="py-2.5 pr-3 font-mono tabular-nums font-semibold text-slate-800 whitespace-nowrap">
                      {kcal.toLocaleString('en-US')} kcal/day
                    </td>
                    {row.map((cell) => {
                      const fmt = formatArea(cell.landHa, unit);
                      const isClosest =
                        cell.kcal === closestKcal &&
                        cell.animalPercent === closestAnimal;

                      let toneClasses =
                        'bg-emerald-50/70 text-emerald-950 hover:bg-emerald-100/80';
                      let statusGlyph = '●';
                      if (cell.utilizationPercent > 100) {
                        toneClasses =
                          'bg-rose-50/80 text-rose-950 hover:bg-rose-100/80';
                        statusGlyph = '✖';
                      } else if (cell.utilizationPercent > 80) {
                        toneClasses =
                          'bg-amber-50/80 text-amber-950 hover:bg-amber-100/80';
                        statusGlyph = '▲';
                      }

                      return (
                        <td key={cell.animalPercent} className="p-1">
                          <button
                            type="button"
                            onClick={() =>
                              onApplyScenario(cell.kcal, cell.animalPercent)
                            }
                            className={`w-full text-right px-3 py-2 rounded border transition-colors ${toneClasses} ${
                              isClosest
                                ? 'border-slate-900 ring-1 ring-slate-900'
                                : 'border-transparent'
                            }`}
                          >
                            <div className="font-mono tabular-nums font-semibold whitespace-nowrap">
                              {fmt.value} {fmt.unitLabel}
                            </div>
                            <div className="text-[11px] font-mono tabular-nums opacity-80">
                              {statusGlyph} {cell.utilizationPercent.toFixed(0)}% cap
                            </div>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* D3 Crop & Livestock Yield Multiplier Sensitivity Bar Chart */}
        <YieldSensitivityBarChart
          params={params}
          unit={unit}
          onApplyGroupOverride={onApplyGroupOverride}
        />
      </section>

      {/* Methodology & Agronomic Constants */}
      <section
        id="methodology"
        className="bg-white border border-slate-200 rounded-lg p-5 space-y-5"
      >
        <div>
          <h2 className="text-base font-semibold text-slate-900">
            Model Derivation & Agronomic Parameters
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Every output is derived deterministically from population energy demand, post-harvest loss, dietary composition, and effective land-use efficiency.
          </p>
        </div>

        {/* Equation Pipeline */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 border-y border-slate-200 py-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-800">
              1. Annual Dietary Demand
            </div>
            <div className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-2">
              E_ing = Σ(Pop_i × kcal_i) × 365.25
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-800">
              2. Farm-Gate Adjustment
            </div>
            <div className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-2">
              E_farm = E_ing / (1 − WasteRate)
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-800">
              3. Group Land Conversion
            </div>
            <div className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-2">
              A_g = (E_farm × Share_g) / Yield_g
            </div>
          </div>

          <div className="space-y-1">
            <div className="text-xs font-semibold text-slate-800">
              4. Total Land With Reserve
            </div>
            <div className="font-mono text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded px-2.5 py-2">
              A_total = Σ(A_g) × (1 + Reserve)
            </div>
          </div>
        </div>

        {/* Reference Yield Coefficients Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                <th className="py-2 pr-3 font-medium">Food Group</th>
                <th className="py-2 px-2 font-medium">Scope</th>
                <th className="py-2 px-2 text-right font-medium">
                  Baseline Yield (M kcal/ha/yr)
                </th>
                <th className="py-2 px-2 text-right font-medium">
                  Active Yield (M kcal/ha/yr)
                </th>
                <th className="py-2 px-2 text-right font-medium">Cropland Share</th>
                <th className="py-2 pl-2 text-right font-medium">Pasture Share</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {FOOD_GROUPS.map((g) => {
                const eff = getEffectiveGroupMetrics(
                  g,
                  params.yieldMultiplier,
                  params.ruminantSharePercent,
                  params.yieldOverrides
                );
                return (
                  <tr key={g.id}>
                    <td className="py-2.5 pr-3 font-medium text-slate-900 whitespace-nowrap">
                      {g.label}
                    </td>
                    <td className="py-2.5 px-2 text-slate-500">{g.description}</td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600">
                      {(params.yieldOverrides[g.id] ?? g.baseMillionKcalPerHa).toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {eff.millionKcalPerHa.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-600">
                      {(eff.croplandFraction * 100).toFixed(0)}%
                    </td>
                    <td className="py-2.5 pl-2 text-right font-mono tabular-nums text-slate-600">
                      {((1 - eff.croplandFraction) * 100).toFixed(0)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
