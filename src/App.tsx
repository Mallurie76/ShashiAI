import { useMemo, useState } from 'react';
import { Download, RotateCcw } from 'lucide-react';
import {
  AreaUnit,
  DIET_PRESETS,
  FoodGroupId,
  ModelParameters,
  REGION_PRESETS,
  buildCsvReport,
  createDefaultParameters,
  formatArea,
  formatPopulation,
  runLandModel,
} from './model/landModel';
import { ParameterSidebar } from './components/ParameterSidebar';
import { LandVisualizationCanvas } from './components/LandVisualizationCanvas';
import { PopulationCohortTable } from './components/PopulationCohortTable';
import { SensitivityAndMethodology } from './components/SensitivityAndMethodology';

export default function App() {
  const [params, setParams] = useState<ModelParameters>(() =>
    createDefaultParameters('global')
  );
  const [unit, setUnit] = useState<AreaUnit>('ha');

  const output = useMemo(() => runLandModel(params), [params]);

  const activeRegion =
    REGION_PRESETS.find((r) => r.id === params.regionId) ?? REGION_PRESETS[0];

  const totalCohortPopulation = useMemo(
    () => params.cohorts.reduce((acc, c) => acc + Math.max(0, c.population), 0),
    [params.cohorts]
  );

  const weightedCohortKcal = useMemo(() => {
    const sumDaily = params.cohorts.reduce(
      (acc, c) => acc + Math.max(0, c.population) * Math.max(0, c.dailyKcal),
      0
    );
    return totalCohortPopulation > 0 ? sumDaily / totalCohortPopulation : 0;
  }, [params.cohorts, totalCohortPopulation]);

  const handleSelectRegion = (regionId: string) => {
    const region = REGION_PRESETS.find((r) => r.id === regionId);
    if (!region) return;
    const diet = DIET_PRESETS.find((d) => d.id === region.dietId) ?? DIET_PRESETS[0];
    setParams((prev) => ({
      ...prev,
      regionId: region.id,
      inputMode: 'aggregate',
      population: region.population,
      dailyKcal: region.dailyKcal,
      wastePercent: region.wastePercent,
      annualGrowthPercent: region.annualGrowthPercent,
      yieldMultiplier: region.yieldMultiplier,
      ruminantSharePercent: region.ruminantSharePercent,
      dietShares: { ...diet.shares },
    }));
  };

  const handleSelectDiet = (dietId: string) => {
    const diet = DIET_PRESETS.find((d) => d.id === dietId);
    if (!diet) return;
    setParams((prev) => ({
      ...prev,
      dietShares: { ...diet.shares },
      ruminantSharePercent: diet.ruminantSharePercent,
    }));
  };

  const handleReset = () => {
    setParams(createDefaultParameters(params.regionId));
  };

  const handleApplySensitivityScenario = (dailyKcal: number, animalPercent: number) => {
    const plantKeys: FoodGroupId[] = ['cereals', 'roots_pulses', 'oils_sugars', 'produce'];
    const animalKeys: FoodGroupId[] = ['dairy_eggs', 'meat'];

    setParams((prev) => {
      const currentPlantSum =
        plantKeys.reduce((acc, k) => acc + prev.dietShares[k], 0) || 1;
      const currentAnimalSum = animalKeys.reduce((acc, k) => acc + prev.dietShares[k], 0);
      const plantPct = 100 - animalPercent;
      const nextShares = { ...prev.dietShares };

      for (const k of plantKeys) {
        nextShares[k] =
          Math.round(((prev.dietShares[k] / currentPlantSum) * plantPct) * 10) / 10;
      }
      if (currentAnimalSum > 0) {
        for (const k of animalKeys) {
          nextShares[k] =
            Math.round(((prev.dietShares[k] / currentAnimalSum) * animalPercent) * 10) /
            10;
        }
      } else {
        nextShares.dairy_eggs = Math.round(animalPercent * 0.55 * 10) / 10;
        nextShares.meat = Math.round(animalPercent * 0.45 * 10) / 10;
      }

      return {
        ...prev,
        inputMode: 'aggregate',
        population:
          prev.inputMode === 'cohorts' ? totalCohortPopulation : prev.population,
        dailyKcal,
        dietShares: nextShares,
      };
    });
  };

  const handleExportCsv = () => {
    const csvContent = buildCsvReport(params, output, unit);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `terracaloric-${params.regionId}-land-model.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const totalFmt = formatArea(output.totalLandHa, unit);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-8">
          {/* Zone 1: Single-element Brand Wordmark */}
          <a
            href="#model-canvas"
            className="text-base font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 font-[family-name:var(--font-display)]"
          >
            TerraCaloric
          </a>

          {/* Zone 2: 4 concise single-line navigation links */}
          <nav
            aria-label="Primary sections"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
          >
            <a
              href="#model-canvas"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Model Canvas
            </a>
            <a
              href="#population-table"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Population Table
            </a>
            <a
              href="#sensitivity"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Sensitivity
            </a>
            <a
              href="#methodology"
              className="hover:text-slate-900 hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0"
            >
              Methodology
            </a>
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Heading + Workspace Calibration Toolbar */}
        <div
          id="model-canvas"
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200"
        >
          <div className="space-y-1 max-w-2xl">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 text-balance">
              Agricultural Land Requirement Model
            </h1>
            <p className="text-sm text-slate-600">
              Derive total cropland and grazing pasture needed from population cohorts, average daily caloric intake, supply-chain waste, and dietary composition.
            </p>
          </div>

          {/* Workspace Toolbar Controls */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-2">
              <label
                htmlFor="region-select"
                className="text-xs font-medium text-slate-500 whitespace-nowrap"
              >
                Region Baseline
              </label>
              <select
                id="region-select"
                value={params.regionId}
                onChange={(e) => handleSelectRegion(e.target.value)}
                className="px-3 py-1.5 text-xs font-medium text-slate-900 bg-white border border-slate-200 rounded-md focus:outline-none focus:border-emerald-600"
              >
                {REGION_PRESETS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Area Unit Segmented Control */}
            <div
              role="group"
              aria-label="Land area unit"
              className="flex items-center bg-slate-100 p-0.5 rounded-md border border-slate-200"
            >
              {(
                [
                  { id: 'ha', label: 'Hectares' },
                  { id: 'km2', label: 'km²' },
                  { id: 'acres', label: 'Acres' },
                ] as const
              ).map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setUnit(u.id)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    unit === u.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Clean Unboxed Calibration Summary Line */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-mono tabular-nums">
          <span>
            Baseline: <strong className="text-slate-900">{activeRegion.name}</strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Population:{' '}
            <strong className="text-slate-900">
              {formatPopulation(output.totalPopulation)}
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Caloric Demand:{' '}
            <strong className="text-slate-900">
              {Math.round(output.weightedDailyKcal).toLocaleString('en-US')} kcal/person/day
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            Derived Land:{' '}
            <strong className="text-emerald-700">
              {totalFmt.value} {totalFmt.unitLabel}
            </strong>
          </span>
        </div>

        {/* Asymmetric Split Console */}
        <div className="flex flex-col lg:flex-row items-start gap-6">
          <ParameterSidebar
            params={params}
            totalCohortPopulation={totalCohortPopulation}
            weightedCohortKcal={weightedCohortKcal}
            onChange={setParams}
            onSelectDiet={handleSelectDiet}
            onSwitchToCohorts={() => {
              setParams((p) => ({ ...p, inputMode: 'cohorts' }));
              document
                .getElementById('population-table')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          />

          <div className="flex-1 w-full min-w-0">
            <LandVisualizationCanvas
              output={output}
              unit={unit}
              region={activeRegion}
              wastePercent={params.wastePercent}
            />
          </div>
        </div>

        {/* Population Cohort & Multi-Region Table */}
        <PopulationCohortTable
          inputMode={params.inputMode}
          cohorts={params.cohorts}
          derivedRows={output.cohortRows}
          totalLandHa={output.totalLandHa}
          totalPopulation={output.totalPopulation}
          weightedDailyKcal={output.weightedDailyKcal}
          unit={unit}
          onChangeMode={(mode) => setParams((p) => ({ ...p, inputMode: mode }))}
          onUpdateCohorts={(nextCohorts) =>
            setParams((p) => ({ ...p, cohorts: nextCohorts }))
          }
        />

        {/* Sensitivity Matrix & Methodology */}
        <SensitivityAndMethodology
          params={params}
          output={output}
          unit={unit}
          onApplyScenario={handleApplySensitivityScenario}
          onApplyGroupOverride={(groupId, newBaseMKcalPerHa) =>
            setParams((prev) => {
              const nextOverrides = { ...prev.yieldOverrides };
              if (newBaseMKcalPerHa === undefined) {
                delete nextOverrides[groupId];
              } else {
                nextOverrides[groupId] = Number(newBaseMKcalPerHa.toFixed(2));
              }
              return { ...prev, yieldOverrides: nextOverrides };
            })
          }
        />
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white mt-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>
            TerraCaloric · Quantitative Population-to-Agricultural Land Derivation Model
          </span>
          <span>
            Reference yield baselines calibrated to FAO FAOSTAT &amp; Poore &amp; Nemecek land-use benchmarks
          </span>
        </div>
      </footer>
    </div>
  );
}
