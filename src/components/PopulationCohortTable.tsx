import React, { useRef, useState } from 'react';
import { Plus, Trash2, Upload, FileSpreadsheet } from 'lucide-react';
import {
  AreaUnit,
  CohortDerivedRow,
  PopulationCohort,
  SAMPLE_DEMOGRAPHIC_COHORTS,
  SAMPLE_GLOBAL_COHORTS,
  formatArea,
  parseCohortCsv,
} from '../model/landModel';

interface PopulationCohortTableProps {
  inputMode: 'aggregate' | 'cohorts';
  cohorts: PopulationCohort[];
  derivedRows: CohortDerivedRow[];
  totalLandHa: number;
  totalPopulation: number;
  weightedDailyKcal: number;
  unit: AreaUnit;
  onChangeMode: (mode: 'aggregate' | 'cohorts') => void;
  onUpdateCohorts: (next: PopulationCohort[]) => void;
}

export const PopulationCohortTable: React.FC<PopulationCohortTableProps> = ({
  inputMode,
  cohorts,
  derivedRows,
  totalLandHa,
  totalPopulation,
  weightedDailyKcal,
  unit,
  onChangeMode,
  onUpdateCohorts,
}) => {
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvDraft, setCsvDraft] = useState(
    'Region, Population, Daily kcal, Yield factor\nNorthern Metro, 12500000, 2400, 1.25\nCentral Valley, 4800000, 2250, 1.45\nSouthern Rural, 6200000, 2100, 0.90'
  );
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddRow = () => {
    const nextRow: PopulationCohort = {
      id: `cohort-${Date.now()}`,
      name: `Segment ${cohorts.length + 1}`,
      population: 10_000_000,
      dailyKcal: 2250,
      yieldMultiplier: 1.0,
    };
    onUpdateCohorts([...cohorts, nextRow]);
    if (inputMode !== 'cohorts') {
      onChangeMode('cohorts');
    }
  };

  const handleUpdateRow = (
    id: string,
    field: keyof PopulationCohort,
    value: string | number
  ) => {
    onUpdateCohorts(
      cohorts.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteRow = (id: string) => {
    if (cohorts.length <= 1) return;
    onUpdateCohorts(cohorts.filter((c) => c.id !== id));
  };

  const handleApplyCsv = (text: string) => {
    const result = parseCohortCsv(text);
    if (result.error) {
      setCsvError(result.error);
      return;
    }
    setCsvError(null);
    onUpdateCohorts(result.cohorts);
    onChangeMode('cohorts');
    setShowCsvImport(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setCsvDraft(content);
      handleApplyCsv(content);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const totalFmt = formatArea(totalLandHa, unit);

  return (
    <section
      id="population-table"
      className="bg-white border border-slate-200 rounded-lg p-5 space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-base font-semibold text-slate-900">
              Population Data & Cohort Table
            </h2>
            <span className="text-xs text-slate-500">
              {inputMode === 'cohorts'
                ? 'Active source driving total land derivation'
                : 'Preview mode — switch to Cohort Table to model multi-segment inputs'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Enter multiple regions, cities, or age cohorts with distinct populations, daily caloric needs, and local crop yields, or import CSV data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-md">
            <button
              type="button"
              onClick={() => onChangeMode('aggregate')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                inputMode === 'aggregate'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Single Input
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('cohorts')}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                inputMode === 'cohorts'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Use Cohort Table
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowCsvImport((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Import CSV
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 rounded-md hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Row
          </button>
        </div>
      </div>

      {/* Quick Dataset Loaders */}
      <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 bg-slate-50 border border-slate-200 rounded-md text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-slate-500 font-medium">Load dataset:</span>
          <button
            type="button"
            onClick={() => {
              onUpdateCohorts(SAMPLE_GLOBAL_COHORTS.map((c) => ({ ...c })));
              onChangeMode('cohorts');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
            8 Global Regions (8.23B)
          </button>
          <button
            type="button"
            onClick={() => {
              onUpdateCohorts(SAMPLE_DEMOGRAPHIC_COHORTS.map((c) => ({ ...c })));
              onChangeMode('cohorts');
            }}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:border-slate-300 transition-colors whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
            4 Age Cohorts (Caloric Tiers)
          </button>
        </div>
        <span className="font-mono tabular-nums text-slate-500">
          {cohorts.length} {cohorts.length === 1 ? 'segment' : 'segments'}
        </span>
      </div>

      {/* Collapsible CSV Import Panel */}
      {showCsvImport && (
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-md space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold text-slate-900">
                Paste CSV or Upload File
              </h3>
              <p className="text-[11px] text-slate-500">
                Columns: <code className="font-mono">Name, Population, Daily kcal, Yield multiplier</code>
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv,text/plain"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0"
              >
                Choose .CSV File
              </button>
            </div>
          </div>

          <textarea
            rows={4}
            value={csvDraft}
            onChange={(e) => setCsvDraft(e.target.value)}
            aria-label="CSV population cohort data"
            className="w-full p-2.5 text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded focus:outline-none focus:border-emerald-600"
          />

          {csvError && (
            <p className="text-xs font-medium text-rose-700" role="alert">
              ✖ {csvError}
            </p>
          )}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setCsvError(null);
                setShowCsvImport(false);
              }}
              className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApplyCsv(csvDraft)}
              className="px-3.5 py-1.5 text-xs font-medium text-white bg-emerald-700 rounded hover:bg-emerald-800 transition-colors whitespace-nowrap shrink-0"
            >
              Load Into Model
            </button>
          </div>
        </div>
      )}

      {/* Editable Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
              <th className="py-2.5 pr-3 font-medium">Region / Cohort Name</th>
              <th className="py-2.5 px-2 text-right font-medium">Population</th>
              <th className="py-2.5 px-2 text-right font-medium">Daily kcal / person</th>
              <th className="py-2.5 px-2 text-right font-medium">Yield Factor</th>
              <th className="py-2.5 px-2 text-right font-medium">Required Land</th>
              <th className="py-2.5 px-2 text-right font-medium">Per Capita</th>
              <th className="py-2.5 px-2 text-right font-medium">Land Share</th>
              <th className="py-2.5 pl-2 text-right font-medium w-10">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {inputMode === 'cohorts' ? (
              derivedRows.map((row) => {
                const areaFmt = formatArea(row.requiredLandHa, unit);
                return (
                  <tr key={row.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2 pr-3 min-w-[180px]">
                      <input
                        type="text"
                        value={row.name}
                        aria-label="Cohort name"
                        onChange={(e) =>
                          handleUpdateRow(row.id, 'name', e.target.value)
                        }
                        className="w-full px-2 py-1 text-xs font-medium text-slate-900 bg-transparent border border-transparent hover:border-slate-200 focus:bg-white focus:border-emerald-600 rounded focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={0}
                        step={10000}
                        value={Math.round(row.population)}
                        aria-label={`${row.name} population`}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v >= 0) {
                            handleUpdateRow(row.id, 'population', v);
                          }
                        }}
                        className="w-32 px-2 py-1 text-right font-mono tabular-nums text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={800}
                        max={4500}
                        step={25}
                        value={Math.round(row.dailyKcal)}
                        aria-label={`${row.name} daily calories`}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v >= 500) {
                            handleUpdateRow(row.id, 'dailyKcal', v);
                          }
                        }}
                        className="w-20 px-2 py-1 text-right font-mono tabular-nums text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min={0.2}
                        max={3.0}
                        step={0.05}
                        value={row.yieldMultiplier}
                        aria-label={`${row.name} yield multiplier`}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (Number.isFinite(v) && v >= 0.1) {
                            handleUpdateRow(row.id, 'yieldMultiplier', v);
                          }
                        }}
                        className="w-18 px-2 py-1 text-right font-mono tabular-nums text-xs text-slate-900 bg-slate-50 border border-slate-200 rounded focus:bg-white focus:border-emerald-600 focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums font-semibold text-slate-900 whitespace-nowrap">
                      {areaFmt.value}{' '}
                      <span className="text-[11px] font-normal text-slate-500">
                        {areaFmt.unitLabel}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      {Math.round(row.perCapitaSqMeters).toLocaleString('en-US')} m²
                    </td>
                    <td className="py-2 px-2 text-right font-mono tabular-nums text-slate-600">
                      {row.shareOfLandPercent.toFixed(1)}%
                    </td>
                    <td className="py-2 pl-2 text-right">
                      <button
                        type="button"
                        disabled={cohorts.length <= 1}
                        onClick={() => handleDeleteRow(row.id)}
                        aria-label={`Remove ${row.name}`}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-100 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              cohorts.map((row) => (
                <tr key={row.id} className="text-slate-500">
                  <td className="py-2.5 pr-3 font-medium">{row.name}</td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {Math.round(row.population).toLocaleString('en-US')}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {Math.round(row.dailyKcal).toLocaleString('en-US')}
                  </td>
                  <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                    {row.yieldMultiplier.toFixed(2)}×
                  </td>
                  <td
                    colSpan={4}
                    className="py-2.5 px-2 text-right text-[11px] text-slate-400"
                  >
                    Switch to "Use Cohort Table" to edit & include in calculation
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900">
              <td className="py-2.5 pr-3">Active Model Total</td>
              <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                {Math.round(totalPopulation).toLocaleString('en-US')}
              </td>
              <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                {Math.round(weightedDailyKcal).toLocaleString('en-US')} kcal/d
              </td>
              <td className="py-2.5 px-2 text-right font-mono tabular-nums text-slate-500">
                —
              </td>
              <td className="py-2.5 px-2 text-right font-mono tabular-nums whitespace-nowrap">
                {totalFmt.value} {totalFmt.unitLabel}
              </td>
              <td className="py-2.5 px-2 text-right font-mono tabular-nums">
                {totalPopulation > 0
                  ? `${Math.round((totalLandHa * 10_000) / totalPopulation).toLocaleString('en-US')} m²`
                  : '—'}
              </td>
              <td className="py-2.5 px-2 text-right font-mono tabular-nums">100.0%</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
};
