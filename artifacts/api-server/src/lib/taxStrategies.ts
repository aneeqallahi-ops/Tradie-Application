import {
  getTaxBrackets,
  getInstantAssetWriteOff,
  getVehicleRate,
  getGSTThreshold,
} from "./taxDataService";

export interface UserContext {
  tradeType: string | null;
  turnoverBand: string | null;
  ytdRevenueExGst: number;
  ytdExpenses: number;
  ytdBusinessKm: number;
  fyDaysElapsed: number;
  fyDaysTotal: number;
  daysToEofy: number;
  marginalRate: number;
  projectedTaxableIncome: number;
  projectedTotalTaxEoy: number;
  projectedAnnualIncome: number;
  trafficLight: string;
  hasLogbook: boolean;
  gstRegistered: boolean;
  toolsExpensesYtd: number;
  benchmarkVariance: Record<string, {
    status: string;
    userValue: number | null;
    benchmarkLow: number | null;
    benchmarkHigh: number | null;
  }>;
}

export interface TaxStrategy {
  id: string;
  title: string;
  description: string;
  category: string;
  estimatedSaving: number;
  deadline: string | null;
  atoReference: string;
  atoReferenceUrl: string;
  talkToCpa: boolean;
  advisoryUrl: string;
  isRisk: boolean;
}

interface StrategyDefinition {
  id: string;
  title: string;
  description: (ctx: UserContext) => string;
  category: string;
  atoReference: string;
  atoReferenceUrl: string;
  talkToCpa: boolean;
  isRisk: boolean;
  isApplicable: (ctx: UserContext) => boolean;
  calculateSaving: (ctx: UserContext) => number;
  deadline: (ctx: UserContext) => string | null;
}

// Compute marginal income tax rate for a given taxable income using 2025-26 brackets
export function getMarginalRate(taxableIncome: number): number {
  const brackets = getTaxBrackets();
  let marginalRate = 0;
  for (const br of brackets) {
    const upper = br.max ?? Number.POSITIVE_INFINITY;
    if (taxableIncome >= br.min && taxableIncome <= upper) {
      marginalRate = br.rate;
    }
  }
  return marginalRate;
}

function fyEndLabel(): string {
  const now = new Date();
  const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
  return `30 June ${year}`;
}

const STRATEGIES: StrategyDefinition[] = [
  // ---------------------------------------------------------------------------
  // 1. Instant Asset Write-Off
  // ---------------------------------------------------------------------------
  {
    id: "instant_asset_writeoff",
    title: "Buy tools or equipment before EOFY",
    category: "deduction",
    atoReference: "Instant asset write-off for small businesses",
    atoReferenceUrl: "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/depreciation-of-assets/simpler-depreciation-for-small-business/instant-asset-write-off",
    talkToCpa: false,
    isRisk: false,
    isApplicable: (ctx) => ctx.ytdRevenueExGst > 0 && ctx.daysToEofy > 0,
    calculateSaving: (ctx) => {
      const threshold = getInstantAssetWriteOff();
      const remaining = Math.max(0, threshold - ctx.toolsExpensesYtd);
      const eligiblePurchase = Math.min(remaining, 5000);
      return Math.round(eligiblePurchase * ctx.marginalRate);
    },
    description: (ctx) => {
      const threshold = getInstantAssetWriteOff();
      const remaining = Math.max(0, threshold - ctx.toolsExpensesYtd);
      const eligiblePurchase = Math.min(remaining, 5000);
      return `Assets costing under $${threshold.toLocaleString()} (ex-GST) can be immediately deducted this financial year. Purchasing up to $${eligiblePurchase.toLocaleString()} in tools, equipment or technology before ${fyEndLabel()} could save you $${Math.round(eligiblePurchase * ctx.marginalRate).toLocaleString()} in tax at your current ${Math.round(ctx.marginalRate * 100)}% marginal rate.`;
    },
    deadline: () => fyEndLabel(),
  },

  // ---------------------------------------------------------------------------
  // 2. Vehicle Logbook
  // ---------------------------------------------------------------------------
  {
    id: "vehicle_logbook",
    title: "Start a vehicle logbook for bigger deductions",
    category: "vehicle",
    atoReference: "Logbook method for work-related car expenses",
    atoReferenceUrl: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/vehicles-travel-and-transport/car-expenses/logbook-method",
    talkToCpa: false,
    isRisk: false,
    isApplicable: (ctx) => {
      if (!ctx.hasLogbook && ctx.ytdBusinessKm > 0) {
        const { maxKilometres } = getVehicleRate();
        const projectedKm = ctx.fyDaysElapsed > 0
          ? ctx.ytdBusinessKm * (ctx.fyDaysTotal / ctx.fyDaysElapsed)
          : ctx.ytdBusinessKm;
        return projectedKm > maxKilometres;
      }
      return false;
    },
    calculateSaving: (ctx) => {
      const { centsPerKilometre, maxKilometres } = getVehicleRate();
      const maxCentsPerKm = maxKilometres * centsPerKilometre;
      // Logbook method: estimate 70% business use of $14,000 typical annual vehicle running costs
      const typicalAnnualVehicleCost = 14000;
      const logbookDeduction = typicalAnnualVehicleCost * 0.70;
      const additionalDeduction = Math.max(0, logbookDeduction - maxCentsPerKm);
      return Math.round(additionalDeduction * ctx.marginalRate);
    },
    description: (ctx) => {
      const { centsPerKilometre, maxKilometres } = getVehicleRate();
      const maxDeduction = maxKilometres * centsPerKilometre;
      const projectedKm = ctx.fyDaysElapsed > 0
        ? Math.round(ctx.ytdBusinessKm * (ctx.fyDaysTotal / ctx.fyDaysElapsed))
        : ctx.ytdBusinessKm;
      return `You're on track for ~${projectedKm.toLocaleString()} business km this year, exceeding the ${maxKilometres.toLocaleString()}-km cap for cents-per-km ($${maxDeduction.toLocaleString()} max deduction). A logbook kept for 12 weeks lets you claim actual vehicle costs based on your business-use percentage — typically worth significantly more. A logbook is valid for 5 years.`;
    },
    deadline: (ctx) => {
      // Need to start logbook at least 12 weeks before EOFY
      const deadline = new Date();
      const fyEndMonth = 5; // June (0-indexed)
      const fyYear = deadline.getMonth() >= 6 ? deadline.getFullYear() + 1 : deadline.getFullYear();
      const fyEnd = new Date(fyYear, fyEndMonth, 30);
      const logbookStart = new Date(fyEnd.getTime() - 84 * 24 * 60 * 60 * 1000); // 84 days = 12 weeks
      if (logbookStart > deadline) {
        return `Start by ${logbookStart.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}`;
      }
      return ctx.daysToEofy > 0 ? `Too late for this FY — start now for next FY` : null;
    },
  },

  // ---------------------------------------------------------------------------
  // 3. Personal Super Contributions
  // ---------------------------------------------------------------------------
  {
    id: "super_contributions",
    title: "Make personal super contributions before EOFY",
    category: "super",
    atoReference: "Personal super contributions (deductible)",
    atoReferenceUrl: "https://www.ato.gov.au/individuals-and-families/super-for-individuals-and-families/super/growing-and-keeping-track-of-your-super/how-to-save-more-in-your-super/personal-super-contributions",
    talkToCpa: true,
    isRisk: false,
    isApplicable: (ctx) => ctx.ytdRevenueExGst > 0 && ctx.marginalRate >= 0.16,
    calculateSaving: (ctx) => {
      const suggestedContribution = Math.min(5000, Math.max(0, ctx.projectedTaxableIncome - 18200) * 0.10);
      // Tax saving = contribution × (marginalRate - 0.15) because super is taxed at 15% in the fund
      const taxRate = ctx.marginalRate;
      return Math.round(suggestedContribution * Math.max(0, taxRate - 0.15));
    },
    description: (ctx) => {
      const suggestedContribution = Math.min(5000, Math.max(0, ctx.projectedTaxableIncome - 18200) * 0.10);
      const saving = Math.round(suggestedContribution * Math.max(0, ctx.marginalRate - 0.15));
      return `As a sole trader you can claim a tax deduction for personal super contributions up to the $30,000 concessional cap. Contributing ~$${suggestedContribution.toLocaleString()} before ${fyEndLabel()} could save $${saving.toLocaleString()} in tax (contributions taxed at 15% in the fund vs your ${Math.round(ctx.marginalRate * 100)}% marginal rate). You must lodge a "Notice of intent to claim" with your super fund before lodging your tax return.`;
    },
    deadline: () => fyEndLabel(),
  },

  // ---------------------------------------------------------------------------
  // 4. Prepay Expenses
  // ---------------------------------------------------------------------------
  {
    id: "prepay_expenses",
    title: "Prepay subscriptions and insurance before EOFY",
    category: "deduction",
    atoReference: "Prepaid expenses",
    atoReferenceUrl: "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/income-and-deductions-for-business/deductions/prepaid-expenses",
    talkToCpa: false,
    isRisk: false,
    isApplicable: (ctx) => ctx.daysToEofy > 0 && ctx.daysToEofy <= 90 && ctx.ytdRevenueExGst > 0,
    calculateSaving: (ctx) => {
      const prepayableAmount = 1500; // typical tradie subscriptions + insurance renewal
      return Math.round(prepayableAmount * ctx.marginalRate);
    },
    description: (ctx) => {
      const prepayableAmount = 1500;
      return `You have ${ctx.daysToEofy} days until EOFY (${fyEndLabel()}). Prepaying up to 12 months of subscriptions (software, trade memberships), insurance renewals and other eligible expenses before ${fyEndLabel()} can move ~$${prepayableAmount.toLocaleString()} of deductions into this financial year. At your ${Math.round(ctx.marginalRate * 100)}% marginal rate that's $${Math.round(prepayableAmount * ctx.marginalRate).toLocaleString()} less tax this year.`;
    },
    deadline: () => fyEndLabel(),
  },

  // ---------------------------------------------------------------------------
  // 5. Home Office Deduction
  // ---------------------------------------------------------------------------
  {
    id: "home_office",
    title: "Claim home office running costs",
    category: "deduction",
    atoReference: "Home office expenses",
    atoReferenceUrl: "https://www.ato.gov.au/individuals-and-families/income-deductions-offsets-and-records/deductions-you-can-claim/working-from-home-expenses",
    talkToCpa: false,
    isRisk: false,
    isApplicable: (ctx) => ctx.ytdRevenueExGst > 0,
    calculateSaving: (ctx) => {
      // 2 hours/day * working days remaining (5/7 of fyDaysTotal) * $0.70/hr
      const workingDays = ctx.fyDaysTotal * (5 / 7);
      const totalHours = 2 * workingDays;
      const fixedRate = 0.70;
      const deduction = totalHours * fixedRate;
      return Math.round(deduction * ctx.marginalRate);
    },
    description: (ctx) => {
      const workingDays = Math.round(ctx.fyDaysTotal * (5 / 7));
      const totalHours = 2 * workingDays;
      const deduction = Math.round(totalHours * 0.70);
      return `The ATO's fixed-rate method allows 70 cents per hour for home office use (electricity, internet, phone, stationery). At 2 hours/day for ~${workingDays} working days, that's ~${totalHours} hours and $${deduction} in deductions this FY. Keep a representative diary of hours worked from home — a spreadsheet or calendar record is sufficient. No receipts required for the fixed-rate method.`;
    },
    deadline: () => null,
  },

  // ---------------------------------------------------------------------------
  // 6. Review Under-Claimed Expense Categories
  // ---------------------------------------------------------------------------
  {
    id: "review_benchmarks",
    title: "Review under-claimed expense categories",
    category: "benchmarks",
    atoReference: "ATO small business benchmarks",
    atoReferenceUrl: "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/in-detail/benchmarks/small-business-benchmarks",
    talkToCpa: true,
    isRisk: false,
    isApplicable: (ctx) => {
      return Object.values(ctx.benchmarkVariance).some(
        v => v.status === "below" && v.benchmarkLow !== null && v.userValue !== null
      );
    },
    calculateSaving: (ctx) => {
      let totalAdditionalDeduction = 0;
      for (const v of Object.values(ctx.benchmarkVariance)) {
        if (v.status === "below" && v.benchmarkLow !== null && v.userValue !== null) {
          const gap = v.benchmarkLow - v.userValue;
          totalAdditionalDeduction += gap * ctx.ytdRevenueExGst;
        }
      }
      return Math.round(Math.max(0, totalAdditionalDeduction) * ctx.marginalRate);
    },
    description: (ctx) => {
      const underClaimedRatios = Object.entries(ctx.benchmarkVariance)
        .filter(([, v]) => v.status === "below" && v.benchmarkLow !== null && v.userValue !== null)
        .map(([k]) => k);
      return `Your ${underClaimedRatios.join(" and ")} expense ratio${underClaimedRatios.length > 1 ? "s are" : " is"} below the ATO safe range for your industry and turnover. This may mean you're not claiming all eligible deductions. Review your records for unclaimed ${underClaimedRatios.includes("costOfSales") ? "materials and direct costs, " : ""}${underClaimedRatios.includes("labour") ? "subcontractor payments, " : ""}${underClaimedRatios.includes("motorVehicle") ? "vehicle expenses, " : ""}and ensure all business expenses are logged before EOFY.`;
    },
    deadline: () => fyEndLabel(),
  },

  // ---------------------------------------------------------------------------
  // 7. GST Registration Threshold Warning
  // ---------------------------------------------------------------------------
  {
    id: "gst_threshold",
    title: "GST registration threshold approaching",
    category: "compliance",
    atoReference: "GST registration threshold",
    atoReferenceUrl: "https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/registering-for-gst",
    talkToCpa: true,
    isRisk: true,
    isApplicable: (ctx) => {
      const gstThreshold = getGSTThreshold();
      return !ctx.gstRegistered && ctx.projectedAnnualIncome >= gstThreshold * 0.80;
    },
    calculateSaving: (ctx) => {
      // Frame as penalty avoidance: ATO penalty for late registration ≈ $313 + back-payment of 10% on overdue amount
      const gstThreshold = getGSTThreshold();
      const overThreshold = Math.max(0, ctx.projectedAnnualIncome - gstThreshold);
      return Math.round(overThreshold * 0.10); // back GST liability exposure
    },
    description: (ctx) => {
      const gstThreshold = getGSTThreshold();
      return `Your projected revenue of $${Math.round(ctx.projectedAnnualIncome).toLocaleString()} is approaching the GST registration threshold of $${gstThreshold.toLocaleString()}. You must register within 21 days of crossing the threshold. Failure to register exposes you to a back-GST liability on all unregistered revenue, plus ATO penalties and general interest charges.`;
    },
    deadline: () => null,
  },

  // ---------------------------------------------------------------------------
  // 8. PAYG Instalment Tip
  // ---------------------------------------------------------------------------
  {
    id: "payg_instalment",
    title: "Tax savings shortfall — act now to avoid debt",
    category: "cashflow",
    atoReference: "PAYG instalments for businesses",
    atoReferenceUrl: "https://www.ato.gov.au/businesses-and-organisations/preparing-lodging-and-paying/payment-plans-and-instalments/pay-as-you-go-payg-instalments",
    talkToCpa: true,
    isRisk: true,
    isApplicable: (ctx) => ctx.trafficLight === "red" && ctx.projectedTotalTaxEoy > 0,
    calculateSaving: (ctx) => {
      // Saving = avoid SIC (shortfall interest charge, ~7.01% p.a.) on the tax debt
      const shortfall = Math.max(0, ctx.projectedTotalTaxEoy - ctx.ytdExpenses * 0.15);
      return Math.round(shortfall * 0.07); // approximate interest avoidance
    },
    description: (ctx) => {
      const weeksLeft = Math.ceil(ctx.daysToEofy / 7);
      const weeklyRequired = weeksLeft > 0
        ? Math.round((ctx.projectedTotalTaxEoy) / weeksLeft)
        : ctx.projectedTotalTaxEoy;
      return `Your tax savings are tracking more than 20% below your projected EOFY liability of $${Math.round(ctx.projectedTotalTaxEoy).toLocaleString()}. To avoid PAYG debt and ATO interest charges, set aside ~$${weeklyRequired.toLocaleString()}/week for the remaining ${weeksLeft} weeks until ${fyEndLabel()}. Consider opening a dedicated tax account. If cash flow is tight, speak with a CPA now — voluntary disclosures and payment plans are available.`;
    },
    deadline: () => fyEndLabel(),
  },
];

export function getApplicableStrategies(ctx: UserContext): TaxStrategy[] {
  return STRATEGIES
    .filter(s => s.isApplicable(ctx))
    .map(s => ({
      id: s.id,
      title: s.title,
      description: s.description(ctx),
      category: s.category,
      estimatedSaving: s.calculateSaving(ctx),
      deadline: s.deadline(ctx),
      atoReference: s.atoReference,
      atoReferenceUrl: s.atoReferenceUrl,
      talkToCpa: s.talkToCpa,
      advisoryUrl: `/advisory/new?strategy=${s.id}`,
      isRisk: s.isRisk,
    }))
    .sort((a, b) => b.estimatedSaving - a.estimatedSaving);
}
