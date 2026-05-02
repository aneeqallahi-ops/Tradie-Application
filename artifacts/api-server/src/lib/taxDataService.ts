import fs from "node:fs";
import path from "node:path";

export interface TaxBracketData {
  min: number;
  max: number | null;
  rate: number;
  label: string;
  rateLabel: string;
}

export interface MedicareData {
  rate: number;
  lowIncomeThreshold: number;
  phaseInUpper: number;
  phaseInRate: number;
  notes: string;
}

export interface LITOData {
  maxOffset: number;
  fullThreshold: number;
  stage1: { from: number; to: number; taperRate: number; endValue: number };
  stage2: { from: number; to: number; taperRate: number; endValue: number };
}

export interface TurnoverBand {
  key: string;
  label: string;
  min: number;
  max: number | null;
}

export interface BenchmarkRange {
  low: number;
  high: number;
  average?: number;
}

export interface BenchmarkBand {
  key: string;
  label: string;
  min: number;
  max: number | null;
  totalExpenses?: BenchmarkRange;
  costOfSales?: BenchmarkRange;
  labour?: BenchmarkRange;
  rent?: BenchmarkRange;
  motorVehicle?: BenchmarkRange;
}

export interface IndustryBenchmark {
  label: string;
  bands: BenchmarkBand[];
}

export interface DeductibleCategory {
  key: string;
  label: string;
  examples: string[];
  rule: string;
}

interface TaxGuidelinesShape {
  financialYear: string;
  individualTaxBrackets: TaxBracketData[];
  medicareLevy: MedicareData;
  medicareLevySurcharge: { singleThreshold: number; rates: Array<{ tier: string; min: number; max: number | null; rate: number }> };
  lito: LITOData;
  gst: { rate: number; registrationThreshold: number; registrationDays: number; basFrequency: string; basDueDates: string[]; notes: string };
  paygInstalments: { incomeThreshold: number; taxThreshold: number; notes: string };
  instantAssetWriteOff: { fy2025_26Threshold: number; appliesTo: string; notes: string };
  vehicleLogbook: { centsPerKilometre: number; maxKilometres: number; logbookMethodMinDays: number; logbookValidYears: number; notes: string };
  homeOffice: { fixedRateCentsPerHour: number; actualMethodAvailable: boolean; notes: string };
  superannuation: { guaranteeRate: number; soleTraderRequired: boolean; concessionalCap: number; notes: string };
  tpar: { dueDate: string; appliesIndustries: string[]; notes: string };
  deductibleCategories: { common: DeductibleCategory[]; byTrade: Record<string, string[]> };
  turnoverBands: TurnoverBand[];
}

interface BenchmarksShape {
  financialYear: string;
  tradeMappings: Record<string, string | null>;
  industries: Record<string, IndustryBenchmark>;
}

function findDataDir(): string {
  const candidates = [
    path.resolve(process.cwd(), "data"),
    path.resolve(process.cwd(), "../../data"),
    path.resolve(process.cwd(), "../../../data"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "ato_tax_guidelines.json"))) return c;
  }
  return candidates[0];
}

const dataDir = findDataDir();
const guidelinesPath = path.resolve(dataDir, "ato_tax_guidelines.json");
const benchmarksPath = path.resolve(dataDir, "ato_benchmarks.json");

function loadJson<T>(p: string): T {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw) as T;
}

let _guidelines: TaxGuidelinesShape | null = null;
let _benchmarks: BenchmarksShape | null = null;

function guidelines(): TaxGuidelinesShape {
  if (!_guidelines) _guidelines = loadJson<TaxGuidelinesShape>(guidelinesPath);
  return _guidelines;
}
function benchmarks(): BenchmarksShape {
  if (!_benchmarks) _benchmarks = loadJson<BenchmarksShape>(benchmarksPath);
  return _benchmarks;
}

try { guidelines(); benchmarks(); } catch (err) {
  // surface load errors at startup but don't crash the server
  console.error("[taxDataService] Failed to preload reference data:", err);
}

export function getFinancialYear(): string {
  return guidelines().financialYear;
}

export function getTaxBrackets(): TaxBracketData[] {
  return guidelines().individualTaxBrackets;
}

export function getMedicareThresholds(): MedicareData {
  return guidelines().medicareLevy;
}

export function getLITO(): LITOData {
  return guidelines().lito;
}

export function getGSTThreshold(): number {
  return guidelines().gst.registrationThreshold;
}

export function getInstantAssetWriteOff(): number {
  return guidelines().instantAssetWriteOff.fy2025_26Threshold;
}

export function getVehicleRate(): { centsPerKilometre: number; maxKilometres: number } {
  const v = guidelines().vehicleLogbook;
  return { centsPerKilometre: v.centsPerKilometre, maxKilometres: v.maxKilometres };
}

export function getTurnoverBands(): TurnoverBand[] {
  return guidelines().turnoverBands;
}

export function getSuperConcessionalCap(): number {
  return guidelines().superannuation.concessionalCap;
}

export function getHomeOfficeRate(): number {
  // ATO fixed-rate method in dollars per hour
  return guidelines().homeOffice.fixedRateCentsPerHour;
}

export function getDeductibleCategories(tradeType: string | null | undefined): DeductibleCategory[] {
  const g = guidelines();
  const trade = (tradeType ?? "other").toLowerCase();
  const keys = g.deductibleCategories.byTrade[trade] ?? g.deductibleCategories.byTrade["other"];
  const lookup = new Map(g.deductibleCategories.common.map(c => [c.key, c]));
  const out: DeductibleCategory[] = [];
  for (const key of keys) {
    const cat = lookup.get(key);
    if (cat) out.push(cat);
  }
  return out;
}

// User-profile turnover bands (UI/onboarding) → representative revenue used to
// look up an industry-specific benchmark band. Keeps the user-facing taxonomy
// stable while letting each industry define its own band cut-points.
const USER_BAND_MIDPOINTS: Record<string, number> = {
  under_50k: 25_000,
  "50k_150k": 100_000,
  "150k_600k": 375_000,
  over_600k: 900_000,
};

export function userTurnoverBandToRevenue(userBand: string | null | undefined): number | null {
  if (!userBand) return null;
  return USER_BAND_MIDPOINTS[userBand] ?? null;
}

export function getBenchmarks(tradeType: string | null | undefined, turnoverBand?: string | null): { industry: string | null; band: BenchmarkBand | null; bands: BenchmarkBand[]; label: string | null } {
  const b = benchmarks();
  const trade = (tradeType ?? "other").toLowerCase();
  const industryKey = b.tradeMappings[trade] ?? null;
  if (!industryKey || !b.industries[industryKey]) {
    return { industry: null, band: null, bands: [], label: null };
  }
  const industry = b.industries[industryKey];
  let band: BenchmarkBand | null = null;
  if (turnoverBand) {
    // 1) Exact key match (industry band shares the user-band key).
    band = industry.bands.find(x => x.key === turnoverBand) ?? null;
    // 2) Otherwise normalize the user band to a representative revenue and
    //    pick the matching industry band by min/max range.
    if (!band) {
      const rev = userTurnoverBandToRevenue(turnoverBand);
      if (rev !== null) band = pickBenchmarkBandForRevenue(industry, rev);
    }
  }
  return { industry: industryKey, band, bands: industry.bands, label: industry.label };
}

export function pickBenchmarkBandForRevenue(industry: IndustryBenchmark, ytdRevenue: number): BenchmarkBand | null {
  for (const band of industry.bands) {
    const min = band.min ?? 0;
    const max = band.max ?? Number.POSITIVE_INFINITY;
    if (ytdRevenue >= min && ytdRevenue < max) return band;
  }
  return industry.bands[industry.bands.length - 1] ?? null;
}

export interface TaxPositionInputs {
  ytdRevenueExGst: number;
  ytdExpenses: number;
  ytdBusinessKm: number;
  fyDaysElapsed: number;
  fyDaysTotal: number;
  currentSavings?: number;
}

export interface TaxPositionResult {
  taxableIncomeYtd: number;
  taxOwedToday: number;
  incomeTaxYtd: number;
  medicareLevyYtd: number;
  litoYtd: number;
  vehicleDeductionYtd: number;
  projectedAnnualIncome: number;
  projectedAnnualExpenses: number;
  projectedAnnualVehicleDeduction: number;
  projectedTaxableIncome: number;
  projectedTotalTaxEoy: number;
  weeklySetAside: number;
  recommendedSetAsidePercent: number;
  trafficLight: "green" | "amber" | "red" | "grey";
  trafficLightReason: string;
  brackets: Array<{ range: string; rate: string; amount: number }>;
}

function computeIncomeTax(taxableIncome: number) {
  const brackets = getTaxBrackets();
  const out: Array<{ range: string; rate: string; amount: number }> = [];
  let total = 0;
  if (taxableIncome <= 0) return { incomeTax: 0, brackets: out };
  for (const br of brackets) {
    if (taxableIncome <= br.min - 1) continue;
    const upper = br.max ?? Number.POSITIVE_INFINITY;
    const lowerBound = br.min === 0 ? 0 : br.min - 1;
    const taxedAmount = Math.max(0, Math.min(taxableIncome, upper) - lowerBound);
    if (br.rate === 0) {
      out.push({ range: br.label, rate: br.rateLabel, amount: 0 });
      continue;
    }
    if (taxedAmount <= 0) continue;
    const tax = taxedAmount * br.rate;
    total += tax;
    out.push({ range: br.label, rate: br.rateLabel, amount: tax });
  }
  return { incomeTax: total, brackets: out };
}

function computeMedicare(taxableIncome: number): number {
  const m = getMedicareThresholds();
  if (taxableIncome <= m.lowIncomeThreshold) return 0;
  if (taxableIncome <= m.phaseInUpper) return (taxableIncome - m.lowIncomeThreshold) * m.phaseInRate;
  return taxableIncome * m.rate;
}

function computeLITO(taxableIncome: number): number {
  const l = getLITO();
  if (taxableIncome <= l.fullThreshold) return l.maxOffset;
  if (taxableIncome <= l.stage1.to) return Math.max(0, l.maxOffset - (taxableIncome - l.fullThreshold) * l.stage1.taperRate);
  if (taxableIncome <= l.stage2.to) return Math.max(0, l.stage1.endValue - (taxableIncome - l.stage1.to) * l.stage2.taperRate);
  return 0;
}

export function calculateTaxPosition(inputs: TaxPositionInputs): TaxPositionResult {
  const { ytdRevenueExGst, ytdExpenses, ytdBusinessKm, fyDaysElapsed, fyDaysTotal, currentSavings = 0 } = inputs;
  const v = getVehicleRate();
  const claimableKm = Math.min(ytdBusinessKm, v.maxKilometres);
  const vehicleDeductionYtd = claimableKm * v.centsPerKilometre;

  const taxableIncomeYtd = Math.max(0, ytdRevenueExGst - ytdExpenses - vehicleDeductionYtd);
  const { incomeTax: incomeTaxYtd, brackets } = computeIncomeTax(taxableIncomeYtd);
  const medicareLevyYtd = computeMedicare(taxableIncomeYtd);
  const litoYtd = computeLITO(taxableIncomeYtd);
  const taxOwedToday = Math.max(0, incomeTaxYtd + medicareLevyYtd - litoYtd);

  const ratio = fyDaysElapsed > 0 ? fyDaysTotal / fyDaysElapsed : 0;
  const projectedAnnualIncome = ytdRevenueExGst * ratio;
  const projectedAnnualExpenses = ytdExpenses * ratio;
  const projectedAnnualKm = Math.min(ytdBusinessKm * ratio, v.maxKilometres);
  const projectedAnnualVehicleDeduction = projectedAnnualKm * v.centsPerKilometre;
  const projectedTaxableIncome = Math.max(0, projectedAnnualIncome - projectedAnnualExpenses - projectedAnnualVehicleDeduction);
  const { incomeTax: projIncomeTax } = computeIncomeTax(projectedTaxableIncome);
  const projMedicare = computeMedicare(projectedTaxableIncome);
  const projLito = computeLITO(projectedTaxableIncome);
  const projectedTotalTaxEoy = Math.max(0, projIncomeTax + projMedicare - projLito);

  const remainingDays = Math.max(0, fyDaysTotal - fyDaysElapsed);
  const remainingTax = Math.max(0, projectedTotalTaxEoy - taxOwedToday);
  const weeklySetAside = remainingDays > 0 ? (remainingTax / remainingDays) * 7 : 0;
  const recommendedSetAsidePercent = projectedAnnualIncome > 0 ? (projectedTotalTaxEoy / projectedAnnualIncome) * 100 : 0;

  let trafficLight: "green" | "amber" | "red" | "grey" = "grey";
  let trafficLightReason = "Need at least 30 days of activity to assess.";
  if (fyDaysElapsed >= 30 && projectedAnnualIncome > 0) {
    const shortfall = Math.max(0, projectedTotalTaxEoy - currentSavings);
    const shortfallRatio = projectedTotalTaxEoy > 0 ? shortfall / projectedTotalTaxEoy : 0;
    if (shortfallRatio < 0.10) {
      trafficLight = "green";
      trafficLightReason = "Tax savings on track for projected EOFY liability (within 10%).";
    } else if (shortfallRatio <= 0.20) {
      trafficLight = "amber";
      trafficLightReason = "Tax savings are 10–20% under projected EOFY liability.";
    } else {
      trafficLight = "red";
      trafficLightReason = "Tax savings are more than 20% under projected EOFY liability.";
    }
  }

  return {
    taxableIncomeYtd,
    taxOwedToday,
    incomeTaxYtd,
    medicareLevyYtd,
    litoYtd,
    vehicleDeductionYtd,
    projectedAnnualIncome,
    projectedAnnualExpenses,
    projectedAnnualVehicleDeduction,
    projectedTaxableIncome,
    projectedTotalTaxEoy,
    weeklySetAside,
    recommendedSetAsidePercent,
    trafficLight,
    trafficLightReason,
    brackets,
  };
}
