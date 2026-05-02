import {
  getTaxBrackets,
  getInstantAssetWriteOff,
  getVehicleRate,
  getGSTThreshold,
  getSuperConcessionalCap,
  getHomeOfficeRate,
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
  /** Subscriptions, insurance, licences, phone_internet YTD ex-GST */
  prepayableExpensesYtd: number;
  /** Home office category expenses YTD ex-GST */
  homeOfficeExpensesYtd: number;
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

/** Project YTD amount to full-year based on days elapsed */
function projectAnnual(ytd: number, fyDaysElapsed: number, fyDaysTotal: number): number {
  if (fyDaysElapsed <= 0) return ytd;
  return ytd * (fyDaysTotal / fyDaysElapsed);
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
    isApplicable: (ctx) => {
      if (!ctx.ytdRevenueExGst || ctx.daysToEofy < 7) return false;
      const threshold = getInstantAssetWriteOff();
      const remaining = threshold - ctx.toolsExpensesYtd;
      // Only applicable when there is remaining write-off capacity AND some existing asset spend
      // (confirming they are active in tools/equipment purchasing this FY)
      return remaining > 0 && ctx.toolsExpensesYtd > 0;
    },
    calculateSaving: (ctx) => {
      const threshold = getInstantAssetWriteOff();
      const remaining = Math.max(0, threshold - ctx.toolsExpensesYtd);
      // Suggest purchasing up to min(remaining, 25% of projected taxable income / marginalRate) — dynamic on their actual income
      const incomeBased = ctx.projectedTaxableIncome > 0
        ? Math.round(ctx.projectedTaxableIncome * 0.05)
        : 3000;
      const eligiblePurchase = Math.min(remaining, Math.max(1000, incomeBased));
      return Math.round(eligiblePurchase * ctx.marginalRate);
    },
    description: (ctx) => {
      const threshold = getInstantAssetWriteOff();
      const remaining = Math.max(0, threshold - ctx.toolsExpensesYtd);
      const incomeBased = ctx.projectedTaxableIncome > 0
        ? Math.round(ctx.projectedTaxableIncome * 0.05)
        : 3000;
      const eligiblePurchase = Math.min(remaining, Math.max(1000, incomeBased));
      return `Assets costing under $${threshold.toLocaleString()} (ex-GST) can be immediately deducted this financial year. You have $${remaining.toLocaleString()} of write-off capacity remaining. Purchasing ~$${eligiblePurchase.toLocaleString()} in tools, equipment or technology before ${fyEndLabel()} could save you $${Math.round(eligiblePurchase * ctx.marginalRate).toLocaleString()} in tax at your current ${Math.round(ctx.marginalRate * 100)}% marginal rate.`;
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
    // Applicable for ALL users with recorded km and no logbook — not gated on km cap
    isApplicable: (ctx) => !ctx.hasLogbook && ctx.ytdBusinessKm > 0,
    calculateSaving: (ctx) => {
      const { centsPerKilometre, maxKilometres } = getVehicleRate();
      const projectedKm = projectAnnual(ctx.ytdBusinessKm, ctx.fyDaysElapsed, ctx.fyDaysTotal);

      if (projectedKm > maxKilometres) {
        // Logbook unlocks more kms: actual costs vs capped cents-per-km
        const cappedDeduction = maxKilometres * centsPerKilometre;
        // Estimate actual cost/km for tradies = $1.40/km (ABS-based average for utes/vans)
        const actualCostPerKm = 1.40;
        const logbookDeduction = Math.min(projectedKm, projectedKm) * actualCostPerKm * 0.85;
        return Math.round(Math.max(0, logbookDeduction - cappedDeduction) * ctx.marginalRate);
      } else {
        // Logbook can still beat cents-per-km if actual cost/km exceeds ATO rate
        // Typical tradie vehicle cost: $1.40/km actual vs $0.88/km ATO rate
        const actualCostPerKm = 1.40;
        const additionalPerKm = Math.max(0, actualCostPerKm - centsPerKilometre);
        return Math.round(projectedKm * additionalPerKm * ctx.marginalRate);
      }
    },
    description: (ctx) => {
      const { centsPerKilometre, maxKilometres } = getVehicleRate();
      const projectedKm = Math.round(projectAnnual(ctx.ytdBusinessKm, ctx.fyDaysElapsed, ctx.fyDaysTotal));
      const cappedDeduction = Math.round(Math.min(projectedKm, maxKilometres) * centsPerKilometre);
      const actualCostPerKm = 1.40;
      const logbookDeduction = Math.round(projectedKm * actualCostPerKm * 0.85);
      return `You're tracking ~${projectedKm.toLocaleString()} business km this year. Without a logbook your deduction is capped at ${Math.min(projectedKm, maxKilometres).toLocaleString()} km × ${centsPerKilometre}c = $${cappedDeduction.toLocaleString()}. A 12-week logbook lets you claim actual vehicle running costs (typically $${actualCostPerKm.toFixed(2)}/km × 85% business use ≈ $${logbookDeduction.toLocaleString()}) — potentially much more. Once recorded, the logbook is valid for 5 years.`;
    },
    deadline: (ctx) => {
      const now = new Date();
      const fyEndMonth = 5; // June (0-indexed)
      const fyYear = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
      const fyEnd = new Date(fyYear, fyEndMonth, 30);
      const logbookStart = new Date(fyEnd.getTime() - 84 * 24 * 60 * 60 * 1000); // 84 days = 12 weeks
      if (logbookStart > now) {
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
      const concessionalCap = getSuperConcessionalCap();
      const suggestedContribution = Math.min(
        concessionalCap,
        Math.max(0, ctx.projectedTaxableIncome * 0.10)
      );
      // Tax saving = contribution × (marginalRate − 15% super tax)
      return Math.round(suggestedContribution * Math.max(0, ctx.marginalRate - 0.15));
    },
    description: (ctx) => {
      const concessionalCap = getSuperConcessionalCap();
      const suggestedContribution = Math.min(
        concessionalCap,
        Math.max(0, Math.round(ctx.projectedTaxableIncome * 0.10))
      );
      const saving = Math.round(suggestedContribution * Math.max(0, ctx.marginalRate - 0.15));
      return `As a sole trader you can claim a tax deduction for personal super contributions up to the $${concessionalCap.toLocaleString()} concessional cap. Based on your projected taxable income of $${Math.round(ctx.projectedTaxableIncome).toLocaleString()}, contributing ~$${suggestedContribution.toLocaleString()} before ${fyEndLabel()} could save $${saving.toLocaleString()} in tax (contributions taxed at 15% in the fund vs your ${Math.round(ctx.marginalRate * 100)}% marginal rate). You must lodge a "Notice of intent to claim a deduction" with your super fund before lodging your tax return.`;
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
      // Derive from their actual prepayable expense run-rate projected over the remaining FY period
      const projectedAnnualPrepayable = projectAnnual(
        ctx.prepayableExpensesYtd,
        ctx.fyDaysElapsed,
        ctx.fyDaysTotal
      );
      // Prepayable amount = spending they haven't yet incurred this FY (future months)
      const remainingProjected = Math.max(
        0,
        projectedAnnualPrepayable - ctx.prepayableExpensesYtd
      );
      // If no data, use 1% of projected annual income as a conservative floor
      const prepayableAmount = remainingProjected > 0
        ? remainingProjected
        : Math.max(500, ctx.projectedAnnualIncome * 0.01);
      return Math.round(prepayableAmount * ctx.marginalRate);
    },
    description: (ctx) => {
      const projectedAnnualPrepayable = projectAnnual(
        ctx.prepayableExpensesYtd,
        ctx.fyDaysElapsed,
        ctx.fyDaysTotal
      );
      const remainingProjected = Math.max(0, projectedAnnualPrepayable - ctx.prepayableExpensesYtd);
      const prepayableAmount = remainingProjected > 0
        ? Math.round(remainingProjected)
        : Math.max(500, Math.round(ctx.projectedAnnualIncome * 0.01));
      const saving = Math.round(prepayableAmount * ctx.marginalRate);
      return `You have ${ctx.daysToEofy} days until EOFY (${fyEndLabel()}). Based on your spending patterns, you have ~$${prepayableAmount.toLocaleString()} in subscriptions, software, insurance and trade memberships that could be prepaid before ${fyEndLabel()} and claimed this financial year. At your ${Math.round(ctx.marginalRate * 100)}% marginal rate that's $${saving.toLocaleString()} less tax this year.`;
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
      const fixedRate = getHomeOfficeRate(); // from taxDataService (ATO guidelines JSON)
      if (ctx.homeOfficeExpensesYtd > 0) {
        const inferredHoursYtd = ctx.homeOfficeExpensesYtd / fixedRate;
        const projectedAnnualHours = projectAnnual(inferredHoursYtd, ctx.fyDaysElapsed, ctx.fyDaysTotal);
        return Math.round(projectedAnnualHours * fixedRate * ctx.marginalRate);
      }
      const annualIncome = ctx.projectedAnnualIncome;
      const hoursPerDay = annualIncome >= 150000 ? 2.5 : annualIncome >= 75000 ? 2.0 : 1.5;
      const workingDays = Math.round(ctx.fyDaysTotal * (5 / 7));
      return Math.round(hoursPerDay * workingDays * fixedRate * ctx.marginalRate);
    },
    description: (ctx) => {
      const fixedRate = getHomeOfficeRate();
      const rateCents = Math.round(fixedRate * 100);

      if (ctx.homeOfficeExpensesYtd > 0) {
        const inferredHoursYtd = ctx.homeOfficeExpensesYtd / fixedRate;
        const projectedAnnualHours = Math.round(projectAnnual(inferredHoursYtd, ctx.fyDaysElapsed, ctx.fyDaysTotal));
        const deduction = Math.round(projectedAnnualHours * fixedRate);
        return `Based on your recorded home office activity, you're on track for ~${projectedAnnualHours} home-office hours this FY. At the ATO fixed rate of ${rateCents}c/hr that's a $${deduction.toLocaleString()} deduction — saving you $${Math.round(deduction * ctx.marginalRate).toLocaleString()} in tax. Keep a representative diary of hours (a calendar record is sufficient).`;
      }

      const annualIncome = ctx.projectedAnnualIncome;
      const hoursPerDay = annualIncome >= 150000 ? 2.5 : annualIncome >= 75000 ? 2.0 : 1.5;
      const workingDays = Math.round(ctx.fyDaysTotal * (5 / 7));
      const totalHours = Math.round(hoursPerDay * workingDays);
      const deduction = Math.round(totalHours * fixedRate);
      return `The ATO's fixed-rate method allows ${rateCents} cents per hour for home office use (electricity, internet, phone, stationery). At ~${hoursPerDay} hours/day for ~${workingDays} working days, that's ~${totalHours} hours and a $${deduction.toLocaleString()} deduction this FY — saving $${Math.round(deduction * ctx.marginalRate).toLocaleString()} at your ${Math.round(ctx.marginalRate * 100)}% rate. Keep a representative diary; no receipts needed for the fixed-rate method.`;
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
      const labelMap: Record<string, string> = {
        costOfSales: "materials and direct costs",
        labour: "subcontractor payments",
        motorVehicle: "vehicle expenses",
        totalExpenses: "total expenses",
      };
      const labels = underClaimedRatios.map(k => labelMap[k] ?? k).join(", ");
      return `Your ${labels} ratio${underClaimedRatios.length > 1 ? "s are" : " is"} below the ATO safe range for your industry and turnover band. This may mean you're not capturing all eligible deductions. Review your records and ensure every business expense is logged — any gap to the ATO benchmark midpoint represents a missed deduction that could reduce your taxable income.`;
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
      // Frame as liability exposure: back-GST owed on revenue exceeding threshold
      const gstThreshold = getGSTThreshold();
      const overThreshold = Math.max(0, ctx.projectedAnnualIncome - gstThreshold);
      return Math.round(overThreshold * 0.10);
    },
    description: (ctx) => {
      const gstThreshold = getGSTThreshold();
      return `Your projected revenue of $${Math.round(ctx.projectedAnnualIncome).toLocaleString()} is approaching the GST registration threshold of $${gstThreshold.toLocaleString()}. You must register within 21 days of crossing the threshold. Failure to register exposes you to back-GST liability on all unregistered revenue, plus ATO failure-to-register penalties and general interest charges.`;
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
      // Saving = ATO shortfall interest charge (SIC) avoided, currently ~7.01% p.a.
      // Shortfall = full projected tax minus what they should have saved by now
      const idealSavedByNow = ctx.projectedTotalTaxEoy * (ctx.fyDaysElapsed / ctx.fyDaysTotal);
      const actualSaved = ctx.ytdExpenses * 0.15; // rough proxy for a savings account at 15%
      const shortfall = Math.max(0, idealSavedByNow - actualSaved);
      return Math.round(shortfall * 0.0701); // SIC rate
    },
    description: (ctx) => {
      const weeksLeft = Math.ceil(ctx.daysToEofy / 7);
      const weeklyRequired = weeksLeft > 0
        ? Math.round(ctx.projectedTotalTaxEoy / weeksLeft)
        : ctx.projectedTotalTaxEoy;
      return `Your tax savings are tracking more than 20% below your projected EOFY liability of $${Math.round(ctx.projectedTotalTaxEoy).toLocaleString()}. To avoid PAYG debt and ATO general interest charges (currently ~7% p.a.), set aside ~$${weeklyRequired.toLocaleString()}/week for the remaining ${weeksLeft} weeks until ${fyEndLabel()}. If cash flow is tight, speak with a CPA now — voluntary disclosures and ATO payment plans are available.`;
    },
    deadline: () => fyEndLabel(),
  },
];

export function getApplicableStrategies(ctx: UserContext): TaxStrategy[] {
  return STRATEGIES
    .filter(s => s.isApplicable(ctx))
    .map(s => {
      const estimatedSaving = s.calculateSaving(ctx);
      return {
        id: s.id,
        title: s.title,
        description: s.description(ctx),
        category: s.category,
        estimatedSaving,
        deadline: s.deadline(ctx),
        atoReference: s.atoReference,
        atoReferenceUrl: s.atoReferenceUrl,
        talkToCpa: s.talkToCpa,
        advisoryUrl: `/advisory/new?strategy=${s.id}&saving=${estimatedSaving}`,
        isRisk: s.isRisk,
      };
    })
    .sort((a, b) => b.estimatedSaving - a.estimatedSaving);
}
