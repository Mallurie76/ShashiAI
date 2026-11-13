export type AreaUnit = 'ha' | 'km2' | 'acres';

export type FoodGroupId =
  | 'cereals'
  | 'roots_pulses'
  | 'produce'
  | 'oils_sugars'
  | 'dairy_eggs'
  | 'meat';

export type DietShares = Record<FoodGroupId, number>;

export type GroupYieldOverrides = Partial<Record<FoodGroupId, number>>;

export interface FoodGroupSpec {
  id: FoodGroupId;
  label: string;
  shortLabel: string;
  description: string;
  /** Baseline farm-gate caloric yield in million kcal per hectare per year */
  baseMillionKcalPerHa: number;
  /** Fraction of land that is arable/cropland vs. permanent grazing pasture (0..1) */
  croplandFraction: number;
  color: string;
  category: 'plant' | 'animal';
}

export interface PopulationCohort {
  id: string;
  name: string;
  population: number;
  dailyKcal: number;
  yieldMultiplier: number;
}

export interface RegionPreset {
  id: string;
  name: string;
  population: number;
  dailyKcal: number;
  wastePercent: number;
  annualGrowthPercent: number;
  yieldMultiplier: number;
  ruminantSharePercent: number;
  /** Total available agricultural land (cropland + permanent pasture) in hectares */
  availableAgLandHa: number;
  /** Available arable cropland in hectares */
  availableArableLandHa: number;
  dietId: string;
  referenceComparison: string;
}

export interface DietPreset {
  id: string;
  name: string;
  summary: string;
  shares: DietShares;
  ruminantSharePercent: number;
}

export interface ModelParameters {
  regionId: string;
  inputMode: 'aggregate' | 'cohorts';
  population: number;
  dailyKcal: number;
  wastePercent: number;
  annualGrowthPercent: number;
  yieldMultiplier: number;
  ruminantSharePercent: number;
  reserveBufferPercent: number;
  dietShares: DietShares;
  cohorts: PopulationCohort[];
  yieldOverrides: GroupYieldOverrides;
}

export interface LandGroupBreakdown {
  id: FoodGroupId;
  label: string;
  shortLabel: string;
  color: string;
  category: 'plant' | 'animal';
  sharePercent: number;
  ingestedKcalPerDay: number;
  farmGateMillionKcalPerYear: number;
  effectiveMillionKcalPerHa: number;
  croplandHa: number;
  pastureHa: number;
  totalHa: number;
  percentOfLand: number;
}

export interface CohortDerivedRow extends PopulationCohort {
  annualIngestedBillionKcal: number;
  requiredLandHa: number;
  perCapitaSqMeters: number;
  shareOfLandPercent: number;
}

export interface ProjectionPoint {
  year: number;
  population: number;
  baselineLandHa: number;
  optimizedLandHa: number;
}

export interface ModelOutput {
  totalPopulation: number;
  weightedDailyKcal: number;
  annualIngestedKcal: number;
  annualFarmGateKcal: number;
  directFoodCroplandHa: number;
  feedCroplandHa: number;
  grazingPastureHa: number;
  reserveBufferHa: number;
  totalLandHa: number;
  totalCroplandHa: number;
  perCapitaHa: number;
  perCapitaSqMeters: number;
  availableAgLandHa: number;
  availableArableLandHa: number;
  agLandUtilizationPercent: number;
  arableLandUtilizationPercent: number;
  worldTotalLandPercent: number;
  worldHabitableLandPercent: number;
  worldAgLandPercent: number;
  capacityStatus: 'within' | 'near' | 'exceeds';
  groupBreakdown: LandGroupBreakdown[];
  cohortRows: CohortDerivedRow[];
  projections: ProjectionPoint[];
}

export const DAYS_PER_YEAR = 365.25;
export const GLOBAL_TOTAL_LAND_HA = 13_000_000_000;
export const GLOBAL_HABITABLE_LAND_HA = 10_400_000_000;
export const GLOBAL_AGRICULTURAL_LAND_HA = 4_790_000_000;
export const GLOBAL_ARABLE_CROPLAND_HA = 1_580_000_000;

export const FOOD_GROUPS: FoodGroupSpec[] = [
  {
    id: 'cereals',
    label: 'Cereals & Grains',
    shortLabel: 'Cereals',
    description: 'Wheat, rice, maize, oats, barley, sorghum',
    baseMillionKcalPerHa: 12.8,
    croplandFraction: 1.0,
    color: '#059669', // emerald-600
    category: 'plant',
  },
  {
    id: 'roots_pulses',
    label: 'Roots, Tubers & Pulses',
    shortLabel: 'Roots & Pulses',
    description: 'Potatoes, cassava, beans, lentils, soy',
    baseMillionKcalPerHa: 14.2,
    croplandFraction: 1.0,
    color: '#0D9488', // teal-600
    category: 'plant',
  },
  {
    id: 'oils_sugars',
    label: 'Oils, Fats & Sugars',
    shortLabel: 'Oils & Sugars',
    description: 'Plant oils, sugarcane, sugar beet',
    baseMillionKcalPerHa: 18.5,
    croplandFraction: 1.0,
    color: '#65A30D', // lime-600
    category: 'plant',
  },
  {
    id: 'produce',
    label: 'Fruits, Veg & Nuts',
    shortLabel: 'Produce & Nuts',
    description: 'Orchards, field vegetables, tree nuts',
    baseMillionKcalPerHa: 6.4,
    croplandFraction: 1.0,
    color: '#0284C7', // sky-600
    category: 'plant',
  },
  {
    id: 'dairy_eggs',
    label: 'Dairy & Eggs',
    shortLabel: 'Dairy & Eggs',
    description: 'Milk, cheese, butter, poultry eggs',
    baseMillionKcalPerHa: 2.35,
    croplandFraction: 0.42,
    color: '#D97706', // amber-600
    category: 'animal',
  },
  {
    id: 'meat',
    label: 'Meat & Animal Protein',
    shortLabel: 'Meat',
    description: 'Beef, lamb, pork, poultry',
    baseMillionKcalPerHa: 0.78,
    croplandFraction: 0.45,
    color: '#DC2626', // red-600
    category: 'animal',
  },
];

export const DIET_PRESETS: DietPreset[] = [
  {
    id: 'global_avg',
    name: 'Global Average',
    summary: 'Current world weighted caloric intake (~18% animal-sourced)',
    shares: {
      cereals: 44,
      roots_pulses: 12,
      oils_sugars: 18,
      produce: 8,
      dairy_eggs: 9,
      meat: 9,
    },
    ruminantSharePercent: 34,
  },
  {
    id: 'eat_lancet',
    name: 'Planetary Health (EAT-Lancet)',
    summary: 'High-plant reference diet (~12% animal-sourced, low ruminant)',
    shares: {
      cereals: 34,
      roots_pulses: 18,
      oils_sugars: 14,
      produce: 22,
      dairy_eggs: 7,
      meat: 5,
    },
    ruminantSharePercent: 18,
  },
  {
    id: 'western_high_meat',
    name: 'High-Meat Western',
    summary: 'North American / OECD pattern (~30% animal-sourced)',
    shares: {
      cereals: 26,
      roots_pulses: 8,
      oils_sugars: 26,
      produce: 10,
      dairy_eggs: 14,
      meat: 16,
    },
    ruminantSharePercent: 42,
  },
  {
    id: 'mediterranean',
    name: 'Mediterranean',
    summary: 'Olive oil, legumes, produce, moderate dairy & poultry',
    shares: {
      cereals: 32,
      roots_pulses: 14,
      oils_sugars: 20,
      produce: 18,
      dairy_eggs: 10,
      meat: 6,
    },
    ruminantSharePercent: 20,
  },
  {
    id: 'staple_grain',
    name: 'Staple Grain-Dominant',
    summary: 'High-efficiency grain & tuber caloric security profile',
    shares: {
      cereals: 58,
      roots_pulses: 16,
      oils_sugars: 12,
      produce: 7,
      dairy_eggs: 4,
      meat: 3,
    },
    ruminantSharePercent: 25,
  },
  {
    id: 'plant_based',
    name: '100% Plant-Based',
    summary: 'Zero livestock feed or pasture requirement',
    shares: {
      cereals: 38,
      roots_pulses: 24,
      oils_sugars: 16,
      produce: 22,
      dairy_eggs: 0,
      meat: 0,
    },
    ruminantSharePercent: 0,
  },
];

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'global',
    name: 'Global (World)',
    population: 8_230_000_000,
    dailyKcal: 2350,
    wastePercent: 24,
    annualGrowthPercent: 0.85,
    yieldMultiplier: 1.0,
    ruminantSharePercent: 34,
    availableAgLandHa: 4_790_000_000,
    availableArableLandHa: 1_580_000_000,
    dietId: 'global_avg',
    referenceComparison: 'Total global habitable agricultural land (~4.79 B ha)',
  },
  {
    id: 'usa',
    name: 'United States',
    population: 342_000_000,
    dailyKcal: 2550,
    wastePercent: 30,
    annualGrowthPercent: 0.48,
    yieldMultiplier: 1.42,
    ruminantSharePercent: 42,
    availableAgLandHa: 405_000_000,
    availableArableLandHa: 158_000_000,
    dietId: 'western_high_meat',
    referenceComparison: 'US agricultural land (~405 M ha; ~41% of US landmass)',
  },
  {
    id: 'india',
    name: 'India',
    population: 1_464_000_000,
    dailyKcal: 2200,
    wastePercent: 18,
    annualGrowthPercent: 0.82,
    yieldMultiplier: 0.96,
    ruminantSharePercent: 12,
    availableAgLandHa: 179_000_000,
    availableArableLandHa: 156_000_000,
    dietId: 'staple_grain',
    referenceComparison: 'India agricultural area (~179 M ha; 60% of national land)',
  },
  {
    id: 'china',
    name: 'China',
    population: 1_416_000_000,
    dailyKcal: 2400,
    wastePercent: 22,
    annualGrowthPercent: -0.22,
    yieldMultiplier: 1.28,
    ruminantSharePercent: 22,
    availableAgLandHa: 528_000_000,
    availableArableLandHa: 127_000_000,
    dietId: 'global_avg',
    referenceComparison: 'China agricultural land (~528 M ha; mostly western steppe pasture)',
  },
  {
    id: 'eu',
    name: 'European Union',
    population: 451_000_000,
    dailyKcal: 2450,
    wastePercent: 20,
    annualGrowthPercent: -0.05,
    yieldMultiplier: 1.35,
    ruminantSharePercent: 32,
    availableAgLandHa: 163_000_000,
    availableArableLandHa: 98_000_000,
    dietId: 'mediterranean',
    referenceComparison: 'EU-27 utilized agricultural area (~163 M ha)',
  },
  {
    id: 'ssa',
    name: 'Sub-Saharan Africa',
    population: 1_280_000_000,
    dailyKcal: 2220,
    wastePercent: 23,
    annualGrowthPercent: 2.35,
    yieldMultiplier: 0.58,
    ruminantSharePercent: 45,
    availableAgLandHa: 1_030_000_000,
    availableArableLandHa: 265_000_000,
    dietId: 'staple_grain',
    referenceComparison: 'Sub-Saharan Africa agricultural area (~1.03 B ha)',
  },
  {
    id: 'japan',
    name: 'Japan',
    population: 123_000_000,
    dailyKcal: 2250,
    wastePercent: 18,
    annualGrowthPercent: -0.52,
    yieldMultiplier: 1.32,
    ruminantSharePercent: 28,
    availableAgLandHa: 4_350_000,
    availableArableLandHa: 4_050_000,
    dietId: 'mediterranean',
    referenceComparison: 'Japan domestic farmland (~4.35 M ha; high food import reliance)',
  },
];

export const SAMPLE_GLOBAL_COHORTS: PopulationCohort[] = [
  { id: 'c-asia-s', name: 'South Asia', population: 2_050_000_000, dailyKcal: 2200, yieldMultiplier: 0.94 },
  { id: 'c-asia-e', name: 'East Asia', population: 1_650_000_000, dailyKcal: 2380, yieldMultiplier: 1.26 },
  { id: 'c-ssa', name: 'Sub-Saharan Africa', population: 1_280_000_000, dailyKcal: 2220, yieldMultiplier: 0.58 },
  { id: 'c-europe', name: 'Europe', population: 742_000_000, dailyKcal: 2450, yieldMultiplier: 1.32 },
  { id: 'c-latam', name: 'Latin America & Caribbean', population: 668_000_000, dailyKcal: 2350, yieldMultiplier: 1.12 },
  { id: 'c-nam', name: 'North America', population: 384_000_000, dailyKcal: 2550, yieldMultiplier: 1.42 },
  { id: 'c-mena', name: 'Middle East & North Africa', population: 520_000_000, dailyKcal: 2350, yieldMultiplier: 0.88 },
  { id: 'c-oceania', name: 'Oceania & SE Asia', population: 936_000_000, dailyKcal: 2280, yieldMultiplier: 1.05 },
];

export const SAMPLE_DEMOGRAPHIC_COHORTS: PopulationCohort[] = [
  { id: 'd-children', name: 'Children (Ages 0–14)', population: 1_980_000_000, dailyKcal: 1750, yieldMultiplier: 1.0 },
  { id: 'd-youth', name: 'Adolescents & Young Adults (15–29)', population: 1_910_000_000, dailyKcal: 2550, yieldMultiplier: 1.0 },
  { id: 'd-adults', name: 'Working-Age Adults (30–64)', population: 3_480_000_000, dailyKcal: 2450, yieldMultiplier: 1.0 },
  { id: 'd-seniors', name: 'Older Adults (65+)', population: 860_000_000, dailyKcal: 2050, yieldMultiplier: 1.0 },
];

export function createDefaultParameters(regionId = 'global'): ModelParameters {
  const region = REGION_PRESETS.find((r) => r.id === regionId) ?? REGION_PRESETS[0];
  const diet = DIET_PRESETS.find((d) => d.id === region.dietId) ?? DIET_PRESETS[0];

  return {
    regionId: region.id,
    inputMode: 'aggregate',
    population: region.population,
    dailyKcal: region.dailyKcal,
    wastePercent: region.wastePercent,
    annualGrowthPercent: region.annualGrowthPercent,
    yieldMultiplier: region.yieldMultiplier,
    ruminantSharePercent: region.ruminantSharePercent,
    reserveBufferPercent: 6,
    dietShares: { ...diet.shares },
    cohorts: SAMPLE_GLOBAL_COHORTS.map((c) => ({ ...c })),
    yieldOverrides: {},
  };
}

/**
 * Computes effective caloric yield (million kcal/ha/yr) and cropland fraction
 * for a given food group, accounting for ruminant livestock mix and yield overrides.
 */
export function getEffectiveGroupMetrics(
  spec: FoodGroupSpec,
  yieldMultiplier: number,
  ruminantSharePercent: number,
  yieldOverrides: GroupYieldOverrides
): { millionKcalPerHa: number; croplandFraction: number } {
  const override = yieldOverrides[spec.id];
  if (override && override > 0) {
    return {
      millionKcalPerHa: override * yieldMultiplier,
      croplandFraction: spec.croplandFraction,
    };
  }

  if (spec.id === 'meat') {
    const r = Math.max(0, Math.min(1, ruminantSharePercent / 100));
    // Monogastric (poultry/pork): ~1.95 M kcal/ha/yr (90% feed cropland, 10% pasture)
    // Ruminant (beef/lamb): ~0.31 M kcal/ha/yr (22% feed cropland, 78% permanent pasture)
    const monogastricHaPerMKcal = 1 / 1.95;
    const ruminantHaPerMKcal = 1 / 0.31;
    const weightedHaPerMKcal = (1 - r) * monogastricHaPerMKcal + r * ruminantHaPerMKcal;
    const croplandHaPerMKcal =
      (1 - r) * monogastricHaPerMKcal * 0.9 + r * ruminantHaPerMKcal * 0.22;

    const baseMKcalPerHa = 1 / weightedHaPerMKcal;
    const croplandFraction = croplandHaPerMKcal / weightedHaPerMKcal;

    return {
      millionKcalPerHa: baseMKcalPerHa * yieldMultiplier,
      croplandFraction,
    };
  }

  return {
    millionKcalPerHa: spec.baseMillionKcalPerHa * yieldMultiplier,
    croplandFraction: spec.croplandFraction,
  };
}

/**
 * Core computation: calculates total land, breakdown by crop/pasture & food group,
 * per-cohort figures, and 2026-2050 trajectory.
 */
export function runLandModel(params: ModelParameters): ModelOutput {
  const region =
    REGION_PRESETS.find((r) => r.id === params.regionId) ?? REGION_PRESETS[0];

  const wasteFraction = Math.min(0.8, Math.max(0, params.wastePercent / 100));
  const reserveFraction = Math.max(0, params.reserveBufferPercent / 100);

  // Normalize diet shares defensively so they always sum to 100%
  const rawSum = Object.values(params.dietShares).reduce((acc, v) => acc + Math.max(0, v), 0);
  const safeSum = rawSum > 0 ? rawSum : 100;

  // Determine effective population & weighted caloric demand
  let totalPopulation = 0;
  let totalDailyIngestedKcal = 0;
  let weightedEffectiveYieldNumerator = 0;

  const activeCohorts: PopulationCohort[] =
    params.inputMode === 'cohorts' && params.cohorts.length > 0
      ? params.cohorts
      : [
          {
            id: 'aggregate',
            name: region.name,
            population: params.population,
            dailyKcal: params.dailyKcal,
            yieldMultiplier: params.yieldMultiplier,
          },
        ];

  for (const cohort of activeCohorts) {
    const pop = Math.max(0, cohort.population);
    const kcal = Math.max(0, cohort.dailyKcal);
    totalPopulation += pop;
    const cohortDaily = pop * kcal;
    totalDailyIngestedKcal += cohortDaily;
    weightedEffectiveYieldNumerator += cohortDaily * Math.max(0.1, cohort.yieldMultiplier);
  }

  const weightedDailyKcal = totalPopulation > 0 ? totalDailyIngestedKcal / totalPopulation : 0;
  const effectiveYieldMultiplier =
    totalDailyIngestedKcal > 0
      ? weightedEffectiveYieldNumerator / totalDailyIngestedKcal
      : params.yieldMultiplier;

  const annualIngestedKcal = totalDailyIngestedKcal * DAYS_PER_YEAR;
  const annualFarmGateKcal = annualIngestedKcal / (1 - wasteFraction);
  const annualFarmGateMillionKcal = annualFarmGateKcal / 1_000_000;

  // Compute land breakdown per food group
  let directFoodCroplandHa = 0;
  let feedCroplandHa = 0;
  let grazingPastureHa = 0;
  let baseTotalLandHa = 0;

  const rawGroupResults = FOOD_GROUPS.map((spec) => {
    const sharePercent = (Math.max(0, params.dietShares[spec.id]) / safeSum) * 100;
    const shareFraction = sharePercent / 100;
    const ingestedKcalPerDay = weightedDailyKcal * shareFraction;
    const groupFarmGateMKcalYr = annualFarmGateMillionKcal * shareFraction;

    const { millionKcalPerHa, croplandFraction } = getEffectiveGroupMetrics(
      spec,
      effectiveYieldMultiplier,
      params.ruminantSharePercent,
      params.yieldOverrides
    );

    const totalHa = millionKcalPerHa > 0 ? groupFarmGateMKcalYr / millionKcalPerHa : 0;
    const croplandHa = totalHa * croplandFraction;
    const pastureHa = totalHa * (1 - croplandFraction);

    if (spec.category === 'plant') {
      directFoodCroplandHa += croplandHa;
    } else {
      feedCroplandHa += croplandHa;
      grazingPastureHa += pastureHa;
    }
    baseTotalLandHa += totalHa;

    return {
      id: spec.id,
      label: spec.label,
      shortLabel: spec.shortLabel,
      color: spec.color,
      category: spec.category,
      sharePercent,
      ingestedKcalPerDay,
      farmGateMillionKcalPerYear: groupFarmGateMKcalYr,
      effectiveMillionKcalPerHa: millionKcalPerHa,
      croplandHa,
      pastureHa,
      totalHa,
    };
  });

  const reserveBufferHa = baseTotalLandHa * reserveFraction;
  const totalLandHa = baseTotalLandHa + reserveBufferHa;
  const totalCroplandHa = directFoodCroplandHa + feedCroplandHa + reserveBufferHa;

  const groupBreakdown: LandGroupBreakdown[] = rawGroupResults.map((g) => ({
    ...g,
    percentOfLand: baseTotalLandHa > 0 ? (g.totalHa / baseTotalLandHa) * 100 : 0,
  }));

  // Per-cohort breakdown
  const landPerDailyKcalAtUnitYield =
    annualFarmGateMillionKcal > 0 && effectiveYieldMultiplier > 0
      ? (totalLandHa * effectiveYieldMultiplier) / (totalDailyIngestedKcal || 1)
      : 0;

  const cohortRows: CohortDerivedRow[] = activeCohorts.map((c) => {
    const pop = Math.max(0, c.population);
    const kcal = Math.max(0, c.dailyKcal);
    const yMult = Math.max(0.1, c.yieldMultiplier);
    const dailyKcalSum = pop * kcal;
    const annualIngestedBillionKcal = (dailyKcalSum * DAYS_PER_YEAR) / 1_000_000_000;
    const requiredLandHa =
      totalDailyIngestedKcal > 0
        ? (dailyKcalSum * landPerDailyKcalAtUnitYield) / yMult
        : 0;
    const perCapitaSqMeters = pop > 0 ? (requiredLandHa * 10_000) / pop : 0;
    return {
      ...c,
      annualIngestedBillionKcal,
      requiredLandHa,
      perCapitaSqMeters,
      shareOfLandPercent: totalLandHa > 0 ? (requiredLandHa / totalLandHa) * 100 : 0,
    };
  });

  const perCapitaHa = totalPopulation > 0 ? totalLandHa / totalPopulation : 0;
  const perCapitaSqMeters = perCapitaHa * 10_000;

  const agLandUtilizationPercent =
    region.availableAgLandHa > 0 ? (totalLandHa / region.availableAgLandHa) * 100 : 0;
  const arableLandUtilizationPercent =
    region.availableArableLandHa > 0
      ? (totalCroplandHa / region.availableArableLandHa) * 100
      : 0;

  let capacityStatus: 'within' | 'near' | 'exceeds' = 'within';
  if (agLandUtilizationPercent > 100 || arableLandUtilizationPercent > 100) {
    capacityStatus = 'exceeds';
  } else if (agLandUtilizationPercent > 80 || arableLandUtilizationPercent > 80) {
    capacityStatus = 'near';
  }

  // 2026-2050 trajectory (every 2 years from 2026 to 2050)
  const startYear = 2026;
  const growthRate = params.annualGrowthPercent / 100;
  const projections: ProjectionPoint[] = [];

  // Efficiency scenario: waste drops gradually by 50% over 24 years & yield improves +1.0%/yr
  for (let offset = 0; offset <= 24; offset += 2) {
    const year = startYear + offset;
    const popFactor = Math.pow(1 + growthRate, offset);
    const yearPop = totalPopulation * popFactor;
    const baselineLandHa = totalLandHa * popFactor;

    const progress = offset / 24;
    const optWaste = wasteFraction * (1 - 0.5 * progress);
    const optYieldFactor = Math.pow(1.01, offset);
    const wasteRatio = (1 - wasteFraction) / (1 - optWaste);
    const optimizedLandHa = (baselineLandHa * wasteRatio) / optYieldFactor;

    projections.push({
      year,
      population: yearPop,
      baselineLandHa,
      optimizedLandHa,
    });
  }

  return {
    totalPopulation,
    weightedDailyKcal,
    annualIngestedKcal,
    annualFarmGateKcal,
    directFoodCroplandHa,
    feedCroplandHa,
    grazingPastureHa,
    reserveBufferHa,
    totalLandHa,
    totalCroplandHa,
    perCapitaHa,
    perCapitaSqMeters,
    availableAgLandHa: region.availableAgLandHa,
    availableArableLandHa: region.availableArableLandHa,
    agLandUtilizationPercent,
    arableLandUtilizationPercent,
    worldTotalLandPercent: (totalLandHa / GLOBAL_TOTAL_LAND_HA) * 100,
    worldHabitableLandPercent: (totalLandHa / GLOBAL_HABITABLE_LAND_HA) * 100,
    worldAgLandPercent: (totalLandHa / GLOBAL_AGRICULTURAL_LAND_HA) * 100,
    capacityStatus,
    groupBreakdown,
    cohortRows,
    projections,
  };
}

/**
 * Computes a 2D sensitivity matrix of Daily Calories (rows) vs Animal-Source % (cols)
 */
export interface SensitivityMatrixData {
  calorieLevels: number[];
  animalShareLevels: number[];
  cells: Array<
    Array<{
      kcal: number;
      animalPercent: number;
      landHa: number;
      utilizationPercent: number;
    }>
  >;
}

export function computeSensitivityMatrix(params: ModelParameters): SensitivityMatrixData {
  const calorieLevels = [1850, 2150, 2450, 2750, 3100];
  const animalShareLevels = [0, 10, 20, 30, 40];

  const plantKeys: FoodGroupId[] = ['cereals', 'roots_pulses', 'oils_sugars', 'produce'];
  const animalKeys: FoodGroupId[] = ['dairy_eggs', 'meat'];

  const currentPlantSum = plantKeys.reduce((acc, k) => acc + params.dietShares[k], 0) || 1;
  const currentAnimalSum = animalKeys.reduce((acc, k) => acc + params.dietShares[k], 0);

  const cells = calorieLevels.map((kcal) =>
    animalShareLevels.map((animalPct) => {
      const plantPct = 100 - animalPct;
      const newShares = { ...params.dietShares };

      for (const k of plantKeys) {
        newShares[k] = (params.dietShares[k] / currentPlantSum) * plantPct;
      }
      if (currentAnimalSum > 0) {
        for (const k of animalKeys) {
          newShares[k] = (params.dietShares[k] / currentAnimalSum) * animalPct;
        }
      } else {
        newShares.dairy_eggs = animalPct * 0.55;
        newShares.meat = animalPct * 0.45;
      }

      const simParams: ModelParameters = {
        ...params,
        inputMode: 'aggregate',
        population:
          params.inputMode === 'cohorts'
            ? params.cohorts.reduce((s, c) => s + c.population, 0)
            : params.population,
        dailyKcal: kcal,
        dietShares: newShares,
      };
      const out = runLandModel(simParams);
      return {
        kcal,
        animalPercent: animalPct,
        landHa: out.totalLandHa,
        utilizationPercent: out.agLandUtilizationPercent,
      };
    })
  );

  return { calorieLevels, animalShareLevels, cells };
}

export interface YieldSensitivityDatum {
  id: FoodGroupId;
  label: string;
  shortLabel: string;
  color: string;
  sharePercent: number;
  multiplier: number;
  baselineGroupYieldMKcalPerHa: number;
  modifiedGroupYieldMKcalPerHa: number;
  baselineTotalLandHa: number;
  modifiedTotalLandHa: number;
  deltaLandHa: number;
  deltaPercent: number;
  isOverrideActive: boolean;
}

/**
 * Computes the ceteris-paribus land requirement impact of applying a yield
 * multiplier to each individual food group one at a time.
 */
export function computeIndividualYieldSensitivity(
  params: ModelParameters,
  groupMultipliers: Record<FoodGroupId, number>
): YieldSensitivityDatum[] {
  const baselineOut = runLandModel(params);

  return FOOD_GROUPS.map((spec) => {
    const mult = Math.max(0.25, Math.min(3.0, groupMultipliers[spec.id] ?? 1.0));
    // Effective unit-multiplier base (incorporating ruminantSharePercent for meat & any active override)
    const unitMetrics = getEffectiveGroupMetrics(
      spec,
      1.0,
      params.ruminantSharePercent,
      params.yieldOverrides
    );

    const modifiedParams: ModelParameters = {
      ...params,
      yieldOverrides: {
        ...params.yieldOverrides,
        [spec.id]: unitMetrics.millionKcalPerHa * mult,
      },
    };

    const modifiedOut = runLandModel(modifiedParams);
    const groupRow = baselineOut.groupBreakdown.find((g) => g.id === spec.id);
    const deltaLandHa = modifiedOut.totalLandHa - baselineOut.totalLandHa;
    const deltaPercent =
      baselineOut.totalLandHa > 0
        ? (deltaLandHa / baselineOut.totalLandHa) * 100
        : 0;

    return {
      id: spec.id,
      label: spec.label,
      shortLabel: spec.shortLabel,
      color: spec.color,
      sharePercent: groupRow?.sharePercent ?? 0,
      multiplier: mult,
      baselineGroupYieldMKcalPerHa: groupRow?.effectiveMillionKcalPerHa ?? unitMetrics.millionKcalPerHa,
      modifiedGroupYieldMKcalPerHa:
        (groupRow?.effectiveMillionKcalPerHa ?? unitMetrics.millionKcalPerHa) * mult,
      baselineTotalLandHa: baselineOut.totalLandHa,
      modifiedTotalLandHa: modifiedOut.totalLandHa,
      deltaLandHa,
      deltaPercent,
      isOverrideActive:
        params.yieldOverrides[spec.id] !== undefined &&
        params.yieldOverrides[spec.id]! > 0,
    };
  });
}

/**
 * Rebalance unlocked diet shares so total always equals 100%.
 */
export function updateDietShareWithRebalance(
  current: DietShares,
  targetKey: FoodGroupId,
  newValue: number,
  lockedKeys: Set<FoodGroupId>
): DietShares {
  const allKeys = FOOD_GROUPS.map((g) => g.id);
  const lockedSum = allKeys
    .filter((k) => k !== targetKey && lockedKeys.has(k))
    .reduce((acc, k) => acc + current[k], 0);

  const maxAllowed = Math.max(0, 100 - lockedSum);
  const clampedTarget = Math.max(0, Math.min(maxAllowed, Math.round(newValue * 10) / 10));
  const remaining = 100 - lockedSum - clampedTarget;

  const adjustableKeys = allKeys.filter((k) => k !== targetKey && !lockedKeys.has(k));
  const next: DietShares = { ...current, [targetKey]: clampedTarget };

  if (adjustableKeys.length === 0) {
    return current;
  }

  const adjustableSum = adjustableKeys.reduce((acc, k) => acc + current[k], 0);
  if (adjustableSum <= 0.001) {
    const equal = remaining / adjustableKeys.length;
    for (const k of adjustableKeys) {
      next[k] = Math.round(equal * 10) / 10;
    }
  } else {
    for (const k of adjustableKeys) {
      next[k] = Math.round(((current[k] / adjustableSum) * remaining) * 10) / 10;
    }
  }

  // Correct rounding drift onto the largest adjustable key
  const total = allKeys.reduce((acc, k) => acc + next[k], 0);
  const drift = Math.round((100 - total) * 10) / 10;
  if (Math.abs(drift) > 0 && adjustableKeys.length > 0) {
    const largest = adjustableKeys.reduce((a, b) => (next[a] >= next[b] ? a : b));
    next[largest] = Math.max(0, Math.round((next[largest] + drift) * 10) / 10);
  }

  return next;
}

export function convertHectares(ha: number, unit: AreaUnit): number {
  if (unit === 'km2') return ha * 0.01;
  if (unit === 'acres') return ha * 2.47105381;
  return ha;
}

export function getUnitShortLabel(unit: AreaUnit): string {
  if (unit === 'km2') return 'km²';
  if (unit === 'acres') return 'acres';
  return 'ha';
}

export function formatArea(ha: number, unit: AreaUnit): { value: string; unitLabel: string } {
  const converted = convertHectares(ha, unit);
  const baseUnit = getUnitShortLabel(unit);

  if (converted >= 1_000_000_000) {
    return { value: (converted / 1_000_000_000).toFixed(2), unitLabel: `B ${baseUnit}` };
  }
  if (converted >= 1_000_000) {
    return { value: (converted / 1_000_000).toFixed(2), unitLabel: `M ${baseUnit}` };
  }
  if (converted >= 10_000) {
    return { value: (converted / 1_000).toFixed(1), unitLabel: `K ${baseUnit}` };
  }
  if (converted >= 100) {
    return { value: Math.round(converted).toLocaleString('en-US'), unitLabel: baseUnit };
  }
  return { value: converted.toFixed(1), unitLabel: baseUnit };
}

export function formatPopulation(pop: number): string {
  if (pop >= 1_000_000_000) return `${(pop / 1_000_000_000).toFixed(3)} B`;
  if (pop >= 1_000_000) return `${(pop / 1_000_000).toFixed(2)} M`;
  if (pop >= 1_000) return `${(pop / 1_000).toFixed(1)} K`;
  return Math.round(pop).toLocaleString('en-US');
}

export function formatKcalScientific(kcal: number): { mantissa: string; exponent: string } {
  if (kcal <= 0) return { mantissa: '0.00', exponent: '0' };
  const exp = Math.floor(Math.log10(kcal));
  const mant = kcal / Math.pow(10, exp);
  return { mantissa: mant.toFixed(2), exponent: String(exp) };
}

export function parseCohortCsv(csvText: string): { cohorts: PopulationCohort[]; error: string | null } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { cohorts: [], error: 'CSV input is empty.' };
  }

  const parsed: PopulationCohort[] = [];
  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
    if (cols.length < 2) continue;

    // Skip header row if second column is non-numeric
    const popVal = Number(cols[1].replace(/[_ ]/g, ''));
    if (i === 0 && Number.isNaN(popVal)) continue;

    if (Number.isNaN(popVal) || popVal < 0) {
      return { cohorts: [], error: `Invalid population number on line ${i + 1}: "${cols[1]}"` };
    }

    const kcalVal = cols[2] ? Number(cols[2]) : 2250;
    const yieldVal = cols[3] ? Number(cols[3]) : 1.0;

    parsed.push({
      id: `csv-${Date.now()}-${i}`,
      name: cols[0] || `Region ${i + 1}`,
      population: popVal,
      dailyKcal: Number.isFinite(kcalVal) && kcalVal > 0 ? kcalVal : 2250,
      yieldMultiplier: Number.isFinite(yieldVal) && yieldVal > 0 ? yieldVal : 1.0,
    });
  }

  if (parsed.length === 0) {
    return {
      cohorts: [],
      error: 'No valid rows found. Expected format: Name, Population, Daily kcal, Yield factor',
    };
  }

  return { cohorts: parsed, error: null };
}

export function buildCsvReport(params: ModelParameters, output: ModelOutput, unit: AreaUnit): string {
  const unitLabel = getUnitShortLabel(unit);
  const region = REGION_PRESETS.find((r) => r.id === params.regionId)?.name ?? 'Custom';
  const rows: string[] = [
    'TerraCaloric Agricultural Land Model Report',
    `Region Reference,${region}`,
    `Input Mode,${params.inputMode}`,
    `Total Population,${Math.round(output.totalPopulation)}`,
    `Weighted Daily Caloric Need (kcal/person/day),${output.weightedDailyKcal.toFixed(1)}`,
    `Supply-Chain & Household Waste (%),${params.wastePercent}`,
    `Seed & Reserve Buffer (%),${params.reserveBufferPercent}`,
    `Yield Multiplier,${params.yieldMultiplier.toFixed(2)}`,
    `Ruminant Share of Meat (%),${params.ruminantSharePercent}`,
    `Total Land Required (${unitLabel}),${convertHectares(output.totalLandHa, unit).toFixed(2)}`,
    `Total Cropland Required (${unitLabel}),${convertHectares(output.totalCroplandHa, unit).toFixed(2)}`,
    `Grazing Pasture Required (${unitLabel}),${convertHectares(output.grazingPastureHa, unit).toFixed(2)}`,
    `Per-Capita Footprint (m2/person),${output.perCapitaSqMeters.toFixed(1)}`,
    `Available Regional Agricultural Land (${unitLabel}),${convertHectares(output.availableAgLandHa, unit).toFixed(2)}`,
    `Regional Capacity Utilization (%),${output.agLandUtilizationPercent.toFixed(2)}`,
    `Share of Total World Land Area 13.0 B ha (%),${output.worldTotalLandPercent.toFixed(2)}`,
    `Share of World Habitable Land 10.4 B ha (%),${output.worldHabitableLandPercent.toFixed(2)}`,
    `Share of World Agricultural Land 4.79 B ha (%),${output.worldAgLandPercent.toFixed(2)}`,
    '',
    'Food Group Breakdown',
    `Food Group,Calorie Share (%),Daily Ingested (kcal/day),Effective Yield (M kcal/ha/yr),Land Required (${unitLabel}),Share of Total Land (%)`,
    ...output.groupBreakdown.map(
      (g) =>
        `"${g.label}",${g.sharePercent.toFixed(1)},${g.ingestedKcalPerDay.toFixed(1)},${g.effectiveMillionKcalPerHa.toFixed(2)},${convertHectares(g.totalHa, unit).toFixed(2)},${g.percentOfLand.toFixed(1)}`
    ),
    '',
    'Population Segments / Cohorts',
    `Segment,Population,Daily kcal/person,Yield Factor,Required Land (${unitLabel}),Per Capita (m2),Share of Land (%)`,
    ...output.cohortRows.map(
      (c) =>
        `"${c.name}",${Math.round(c.population)},${c.dailyKcal},${c.yieldMultiplier.toFixed(2)},${convertHectares(c.requiredLandHa, unit).toFixed(2)},${c.perCapitaSqMeters.toFixed(1)},${c.shareOfLandPercent.toFixed(1)}`
    ),
  ];
  return rows.join('\n');
}
