import React, { useState } from 'react';
import { Lock, Unlock, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import {
  DIET_PRESETS,
  FOOD_GROUPS,
  FoodGroupId,
  ModelParameters,
  updateDietShareWithRebalance,
} from '../model/landModel';

interface ParameterSidebarProps {
  params: ModelParameters;
  totalCohortPopulation: number;
  weightedCohortKcal: number;
  onChange: (updater: (prev: ModelParameters) => ModelParameters) => void;
  onSelectDiet: (dietId: string) => void;
  onSwitchToCohorts: () => void;
}

export const ParameterSidebar: React.FC<ParameterSidebarProps> = ({
  params,
  totalCohortPopulation,
  weightedCohortKcal,
  onChange,
  onSelectDiet,
  onSwitchToCohorts,
}) => {
  const [lockedGroups, setLockedGroups] = useState<Set<FoodGroupId>>(new Set());
  const [showAdvancedYields, setShowAdvancedYields] = useState(false);

  const toggleLock = (id: FoodGroupId) => {
    setLockedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < FOOD_GROUPS.length - 1) {
        // Always leave at least one group unlocked so shares can rebalance to 100%
        next.add(id);
      }
      return next;
    });
  };

  // Logarithmic slider mapping for population: 100,000 (1e5) to 15,000,000,000 (1.5e10)
  const minLog = Math.log10(100_000);
  const maxLog = Math.log10(15_000_000_000);
  const popLogValue = Math.min(
    maxLog,
    Math.max(minLog, Math.log10(Math.max(100_000, params.population)))
  );

  const handleLogPopChange = (val: number) => {
    const raw = Math.pow(10, val);
    // Round cleanly to 3 significant figures
    const magnitude = Math.pow(10, Math.floor(Math.log10(raw)) - 2);
    const rounded = Math.round(raw / magnitude) * magnitude;
    onChange((prev) => ({ ...prev, population: rounded }));
  };

  const effectiveKcal =
    params.inputMode === 'cohorts' ? weightedCohortKcal : params.dailyKcal;

  const activeDietPresetId =
    DIET_PRESETS.find((d) =>
      FOOD_GROUPS.every(
        (g) => Math.abs((params.dietShares[g.id] ?? 0) - d.shares[g.id]) < 0.6
      )
    )?.id ?? 'custom';

  const hasYieldOverrides = Object.values(params.yieldOverrides).some(
    (v) => v !== undefined && v > 0
  );

  return (
    <aside
      aria-label="Model Parameters"
      className="w-full lg:w-[376px] shrink-0 bg-white border border-slate-200 rounded-lg divide-y divide-slate-200"
    >
      {/* Section 01: Population & Caloric Demand */}
      <section className="p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            01. Population & Caloric Demand
          </h2>
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => onChange((p) => ({ ...p, inputMode: 'aggregate' }))}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                params.inputMode === 'aggregate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Input
            </button>
            <button
              type="button"
              onClick={onSwitchToCohorts}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                params.inputMode === 'cohorts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cohort Table
            </button>
          </div>
        </div>

        {params.inputMode === 'aggregate' ? (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="param-population"
                  className="text-xs font-medium text-slate-600"
                >
                  Total Population
                </label>
                <input
                  id="param-population"
                  type="number"
                  min={1000}
                  step={100000}
                  value={Math.round(params.population)}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    if (Number.isFinite(v) && v >= 0) {
                      onChange((p) => ({ ...p, population: v }));
                    }
                  }}
                  className="w-40 px-2.5 py-1 text-right text-xs font-mono tabular-nums font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                />
              </div>
              <input
                aria-label="Total population logarithmic slider"
                type="range"
                min={minLog}
                max={maxLog}
                step={0.01}
                value={popLogValue}
                onChange={(e) => handleLogPopChange(Number(e.target.value))}
                className="w-full"
              />
              <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                <span>100K</span>
                <span>10M</span>
                <span>1B</span>
                <span>15B</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor="param-kcal"
                  className="text-xs font-medium text-slate-600"
                >
                  Average Daily Calories Needed
                </label>
                <div className="flex items-center gap-1">
                  <input
                    id="param-kcal"
                    type="number"
                    min={1200}
                    max={4200}
                    step={25}
                    value={Math.round(params.dailyKcal)}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isFinite(v) && v >= 800 && v <= 5000) {
                        onChange((p) => ({ ...p, dailyKcal: v }));
                      }
                    }}
                    className="w-20 px-2 py-1 text-right text-xs font-mono tabular-nums font-medium text-slate-900 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                  />
                  <span className="text-[11px] font-mono text-slate-400">kcal/d</span>
                </div>
              </div>
              <input
                aria-label="Average daily calories slider"
                type="range"
                min={1400}
                max={3800}
                step={25}
                value={params.dailyKcal}
                onChange={(e) =>
                  onChange((p) => ({ ...p, dailyKcal: Number(e.target.value) }))
                }
                className="w-full"
              />
              <div className="flex items-center justify-between gap-1 pt-0.5">
                {[
                  { label: '1,850 Min', val: 1850 },
                  { label: '2,250 WHO', val: 2250 },
                  { label: '2,600 Active', val: 2600 },
                  { label: '3,200 High', val: 3200 },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => onChange((p) => ({ ...p, dailyKcal: preset.val }))}
                    className={`px-1.5 py-0.5 text-[11px] font-mono tabular-nums rounded transition-colors whitespace-nowrap shrink-0 ${
                      Math.abs(params.dailyKcal - preset.val) <= 25
                        ? 'bg-emerald-50 text-emerald-700 font-medium'
                        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Cohort Sum Population</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {Math.round(totalCohortPopulation).toLocaleString('en-US')}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600">Weighted Daily Requirement</span>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {Math.round(weightedCohortKcal).toLocaleString('en-US')} kcal/d
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Derived directly from the Population Cohort Table below. Switch to Single Input to adjust aggregate sliders.
            </p>
          </div>
        )}

        {/* Food Waste & Growth */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="param-waste" className="text-xs font-medium text-slate-600">
                Food Loss & Waste
              </label>
              <span className="text-xs font-mono tabular-nums font-medium text-slate-900">
                {params.wastePercent}%
              </span>
            </div>
            <input
              id="param-waste"
              type="range"
              min={0}
              max={45}
              step={1}
              value={params.wastePercent}
              onChange={(e) =>
                onChange((p) => ({ ...p, wastePercent: Number(e.target.value) }))
              }
              className="w-full"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="param-growth" className="text-xs font-medium text-slate-600">
                Pop. Growth / yr
              </label>
              <span className="text-xs font-mono tabular-nums font-medium text-slate-900">
                {params.annualGrowthPercent >= 0 ? '+' : ''}
                {params.annualGrowthPercent.toFixed(2)}%
              </span>
            </div>
            <input
              id="param-growth"
              type="range"
              min={-1.0}
              max={3.5}
              step={0.05}
              value={params.annualGrowthPercent}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  annualGrowthPercent: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        </div>
      </section>

      {/* Section 02: Dietary Calorie Allocation */}
      <section className="p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900">
            02. Dietary Calorie Allocation
          </h2>
          <span className="text-[11px] font-mono tabular-nums text-slate-500">
            Sum 100.0%
          </span>
        </div>

        <div>
          <label htmlFor="diet-preset" className="sr-only">
            Dietary Profile Preset
          </label>
          <select
            id="diet-preset"
            value={activeDietPresetId}
            onChange={(e) => {
              if (e.target.value !== 'custom') {
                onSelectDiet(e.target.value);
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
          >
            {DIET_PRESETS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
            {activeDietPresetId === 'custom' && (
              <option value="custom">Custom Dietary Mix</option>
            )}
          </select>
        </div>

        <div className="space-y-3 pt-1">
          {FOOD_GROUPS.map((group) => {
            const share = params.dietShares[group.id] ?? 0;
            const kcalForGroup = (effectiveKcal * share) / 100;
            const isLocked = lockedGroups.has(group.id);

            return (
              <div key={group.id} className="space-y-1">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-2.5 h-2.5 rounded-xs shrink-0"
                      style={{ backgroundColor: group.color }}
                    />
                    <span className="font-medium text-slate-700 truncate">
                      {group.shortLabel}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono tabular-nums text-slate-400">
                      {Math.round(kcalForGroup)} kcal
                    </span>
                    <span className="w-11 text-right font-mono tabular-nums font-medium text-slate-900">
                      {share.toFixed(1)}%
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleLock(group.id)}
                      aria-label={
                        isLocked
                          ? `Unlock ${group.label} share`
                          : `Lock ${group.label} share`
                      }
                      title={isLocked ? 'Unlock share' : 'Lock share while adjusting others'}
                      className={`p-1 rounded transition-colors ${
                        isLocked
                          ? 'text-emerald-700 bg-emerald-50'
                          : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      {isLocked ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Unlock className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <input
                  aria-label={`${group.label} caloric share`}
                  type="range"
                  min={0}
                  max={85}
                  step={0.5}
                  disabled={isLocked}
                  value={share}
                  onChange={(e) => {
                    const nextVal = Number(e.target.value);
                    onChange((p) => ({
                      ...p,
                      dietShares: updateDietShareWithRebalance(
                        p.dietShares,
                        group.id,
                        nextVal,
                        lockedGroups
                      ),
                    }));
                  }}
                  className={`w-full ${isLocked ? 'opacity-45 cursor-not-allowed' : ''}`}
                />
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 03: Agronomic Yield & Livestock Mix */}
      <section className="p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">
          03. Agronomic Yield & Livestock Mix
        </h2>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="param-yield" className="font-medium text-slate-600">
                Agronomic Yield Multiplier
              </label>
              <span className="font-mono tabular-nums font-semibold text-slate-900">
                {params.yieldMultiplier.toFixed(2)}×
              </span>
            </div>
            <input
              id="param-yield"
              type="range"
              min={0.45}
              max={2.2}
              step={0.02}
              value={params.yieldMultiplier}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  yieldMultiplier: Number(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>0.45× Low-Input</span>
              <span>1.00× Global</span>
              <span>2.20× Intensive</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="param-ruminant" className="font-medium text-slate-600">
                Ruminant Share of Meat (Beef/Lamb)
              </label>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                {params.ruminantSharePercent}%
              </span>
            </div>
            <input
              id="param-ruminant"
              type="range"
              min={0}
              max={100}
              step={2}
              value={params.ruminantSharePercent}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  ruminantSharePercent: Number(e.target.value),
                }))
              }
              className="w-full"
            />
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>0% Poultry/Pork</span>
              <span>100% Beef/Lamb</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="param-reserve" className="font-medium text-slate-600">
                Seed, Fallow & Reserve Margin
              </label>
              <span className="font-mono tabular-nums font-medium text-slate-900">
                +{params.reserveBufferPercent}%
              </span>
            </div>
            <input
              id="param-reserve"
              type="range"
              min={0}
              max={25}
              step={1}
              value={params.reserveBufferPercent}
              onChange={(e) =>
                onChange((p) => ({
                  ...p,
                  reserveBufferPercent: Number(e.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        </div>

        {/* Collapsible Override Yields */}
        <div className="pt-1 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowAdvancedYields((v) => !v)}
            className="w-full flex items-center justify-between py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <span>
              Calibrate Crop Yields (M kcal/ha/yr)
              {hasYieldOverrides ? ' · Custom' : ''}
            </span>
            {showAdvancedYields ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvancedYields && (
            <div className="pt-2 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Baseline yield before multiplier</span>
                {hasYieldOverrides && (
                  <button
                    type="button"
                    onClick={() => onChange((p) => ({ ...p, yieldOverrides: {} }))}
                    className="inline-flex items-center gap-1 text-emerald-700 hover:underline font-medium"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset yields
                  </button>
                )}
              </div>
              {FOOD_GROUPS.map((g) => {
                const currentVal =
                  params.yieldOverrides[g.id] ?? g.baseMillionKcalPerHa;
                return (
                  <div
                    key={g.id}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <label
                      htmlFor={`yield-override-${g.id}`}
                      className="text-slate-600 truncate"
                    >
                      {g.shortLabel}
                    </label>
                    <div className="flex items-center gap-1 shrink-0">
                      <input
                        id={`yield-override-${g.id}`}
                        type="number"
                        min={0.1}
                        max={40}
                        step={0.1}
                        value={Number(currentVal.toFixed(2))}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v > 0) {
                            onChange((p) => ({
                              ...p,
                              yieldOverrides: { ...p.yieldOverrides, [g.id]: v },
                            }));
                          }
                        }}
                        className="w-16 px-2 py-0.5 text-right font-mono tabular-nums text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
                      />
                      <span className="text-[11px] font-mono text-slate-400">
                        M/ha
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </aside>
  );
};
