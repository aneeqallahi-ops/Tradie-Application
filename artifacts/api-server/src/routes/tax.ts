import { Router, type IRouter, type Request, type Response } from "express";
import {
  db,
  invoicesTable,
  expensesTable,
  vehicleTripsTable,
  taxAuditLogTable,
  userPromptDismissalsTable,
} from "@workspace/db";
import { eq, and, gte, lte, sql, sum, inArray } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { getFinancialYearRange } from "../lib/calculations";
import {
  calculateTaxPosition,
  getFinancialYear,
  getBenchmarks,
  getDeductibleCategories,
  pickBenchmarkBandForRevenue,
  type BenchmarkBand,
} from "../lib/taxDataService";
import { getApplicableStrategies, getMarginalRate, type UserContext } from "../lib/taxStrategies";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /tax/position
// ---------------------------------------------------------------------------
router.get("/tax/position", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const userId = tradieUser.id;

    const now = new Date();
    const { start: fyStart, end: fyEnd } = getFinancialYearRange();
    const msPerDay = 1000 * 60 * 60 * 24;
    const fyDaysTotal = Math.ceil((fyEnd.getTime() - fyStart.getTime()) / msPerDay);
    const fyDaysElapsed = Math.max(1, Math.ceil((now.getTime() - fyStart.getTime()) / msPerDay));

    const [revRow] = await db
      .select({ total: sum(invoicesTable.total), gst: sum(invoicesTable.gstAmount) })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.userId, userId),
        gte(invoicesTable.createdAt, fyStart),
        lte(invoicesTable.createdAt, fyEnd)
      ));

    const [expRow] = await db
      .select({
        total: sum(expensesTable.amount),
        gstClaimable: sum(expensesTable.gstClaimable),
      })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, userId),
        gte(expensesTable.createdAt, fyStart),
        lte(expensesTable.createdAt, fyEnd)
      ));

    const [vehRow] = await db
      .select({
        businessKm: sum(
          sql`CASE WHEN ${vehicleTripsTable.isBusiness} THEN ${vehicleTripsTable.distanceKm} ELSE 0 END`
        ),
      })
      .from(vehicleTripsTable)
      .where(and(
        eq(vehicleTripsTable.userId, userId),
        gte(vehicleTripsTable.createdAt, fyStart),
        lte(vehicleTripsTable.createdAt, fyEnd)
      ));

    const totalRevInc = parseFloat(revRow.total ?? "0");
    const gstCollected = parseFloat(revRow.gst ?? "0");
    const ytdRevenueExGst = Math.max(0, totalRevInc - gstCollected);
    const totalExpInc = parseFloat(expRow.total ?? "0");
    const expGstClaimable = parseFloat(expRow.gstClaimable ?? "0");
    const ytdExpenses = Math.max(0, totalExpInc - expGstClaimable);
    const ytdBusinessKm = parseFloat(vehRow.businessKm ?? "0");

    const profitFirstPercent = parseFloat(String(tradieUser.profitFirstTaxPercent ?? "15"));
    const currentSavings = (ytdRevenueExGst * profitFirstPercent) / 100;

    if (ytdRevenueExGst === 0 || fyDaysElapsed < 30) {
      res.json({
        financialYear: getFinancialYear(),
        empty: true,
        message: "Enter 30 days of invoices to see your tax position.",
        fyDaysElapsed,
        fyDaysTotal,
        ytdRevenueExGst,
        ytdExpenses,
        ytdBusinessKm,
        taxOwedToday: 0,
        projectedTotalTaxEoy: 0,
        weeklySetAside: 0,
        trafficLight: "grey" as const,
        trafficLightReason: "Need at least 30 days of activity to assess.",
        brackets: [],
        currentSavings,
        recommendedSetAsidePercent: 0,
      });
      return;
    }

    const inputs = {
      ytdRevenueExGst,
      ytdExpenses,
      ytdBusinessKm,
      fyDaysElapsed,
      fyDaysTotal,
      currentSavings,
    };
    const result = calculateTaxPosition(inputs);

    // ATO compliance: every tax position served to a user MUST be logged.
    // If we can't log, we don't serve.
    await db.insert(taxAuditLogTable).values({
      userId,
      calculationType: "tax_position",
      inputValues: JSON.stringify(inputs),
      ruleApplied: `FY${getFinancialYear()} brackets + Medicare + LITO`,
      result: JSON.stringify({
        taxOwedToday: result.taxOwedToday,
        projectedTotalTaxEoy: result.projectedTotalTaxEoy,
        weeklySetAside: result.weeklySetAside,
        trafficLight: result.trafficLight,
      }),
    });

    res.json({
      financialYear: getFinancialYear(),
      empty: false,
      fyDaysElapsed,
      fyDaysTotal,
      ytdRevenueExGst,
      ytdExpenses,
      ytdBusinessKm,
      currentSavings,
      ...result,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute tax position");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// Helpers for benchmark ratio computation
// ---------------------------------------------------------------------------

// Maps ALL expense category keys used in the app to ATO benchmark ratio buckets.
// Trade-specific material keys (electrical_materials, plumbing_materials, etc.) all
// map to costOfSales; vehicle sub-categories map to motorVehicle; subcontractor to labour.
// Categories not listed here (protective_clothing, licences_subscriptions, phone_internet,
// other_business) still count toward totalExpenses but have no ATO sub-ratio.
const CATEGORY_TO_RATIO: Record<string, string> = {
  // Materials / cost of sales — generic + all trade-specific keys
  materials: "costOfSales",
  tools_equipment: "costOfSales",
  equipment_hire: "costOfSales",
  electrical_materials: "costOfSales",
  plumbing_materials: "costOfSales",
  timber_materials: "costOfSales",
  building_materials: "costOfSales",
  paint_materials: "costOfSales",
  hvac_materials: "costOfSales",
  tile_materials: "costOfSales",
  landscaping_materials: "costOfSales",
  concrete_materials: "costOfSales",
  // Labour / subcontractors
  subcontractor: "labour",
  subcontractor_payment: "labour",
  // Motor vehicle — both generic key and UI sub-category keys
  vehicle: "motorVehicle",
  vehicle_fuel: "motorVehicle",
  vehicle_other: "motorVehicle",
};

function computeBenchmarkRatio(
  ratioKey: keyof BenchmarkBand,
  ratioLabel: string,
  userValue: number | null,
  band: BenchmarkBand | null
): {
  key: string;
  label: string;
  userValue: number | null;
  benchmarkLow: number | null;
  benchmarkHigh: number | null;
  status: string;
  interpretation: string;
  auditTrigger: boolean;
} {
  const range = band ? (band[ratioKey] as { low: number; high: number } | undefined) : undefined;

  if (userValue === null || range === undefined) {
    return {
      key: ratioKey,
      label: ratioLabel,
      userValue,
      benchmarkLow: range?.low ?? null,
      benchmarkHigh: range?.high ?? null,
      status: "no_data",
      interpretation: "No data available for comparison.",
      auditTrigger: false,
    };
  }

  const { low, high } = range;
  const AUDIT_BUFFER = 0.05;
  let status: string;
  let interpretation: string;
  let auditTrigger = false;

  if (userValue >= low && userValue <= high) {
    status = "within";
    interpretation = `Your ${ratioLabel.toLowerCase()} ratio of ${(userValue * 100).toFixed(1)}% sits within the ATO benchmark range of ${(low * 100).toFixed(0)}%–${(high * 100).toFixed(0)}%. You're in the safe zone.`;
  } else if (userValue < low) {
    const gap = low - userValue;
    auditTrigger = gap > AUDIT_BUFFER;
    status = "below";
    interpretation = `Your ${ratioLabel.toLowerCase()} ratio of ${(userValue * 100).toFixed(1)}% is below the ATO benchmark low of ${(low * 100).toFixed(0)}%.${auditTrigger ? " This may attract ATO attention as it's more than 5% outside the safe band." : " This is just below the safe band — review your records."}`;
  } else {
    const gap = userValue - high;
    auditTrigger = gap > AUDIT_BUFFER;
    status = "above";
    interpretation = `Your ${ratioLabel.toLowerCase()} ratio of ${(userValue * 100).toFixed(1)}% is above the ATO benchmark high of ${(high * 100).toFixed(0)}%.${auditTrigger ? " This may attract ATO attention as it's more than 5% outside the safe band." : " This is just above the safe band — ensure all expenses are fully documented."}`;
  }

  return {
    key: ratioKey,
    label: ratioLabel,
    userValue,
    benchmarkLow: low,
    benchmarkHigh: high,
    status,
    interpretation,
    auditTrigger,
  };
}

// ---------------------------------------------------------------------------
// GET /tax/benchmarks
// ---------------------------------------------------------------------------
router.get("/tax/benchmarks", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const userId = tradieUser.id;
    const tradeType = tradieUser.tradeType;
    const turnoverBand = tradieUser.annualTurnoverBand;

    const { start: fyStart, end: fyEnd } = getFinancialYearRange();

    const [revRow] = await db
      .select({ total: sum(invoicesTable.total), gst: sum(invoicesTable.gstAmount) })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.userId, userId),
        gte(invoicesTable.createdAt, fyStart),
        lte(invoicesTable.createdAt, fyEnd)
      ));

    const totalRevInc = parseFloat(revRow.total ?? "0");
    const gstCollected = parseFloat(revRow.gst ?? "0");
    const ytdRevenueExGst = Math.max(0, totalRevInc - gstCollected);

    const benchmarkInfo = getBenchmarks(tradeType, turnoverBand);

    if (!benchmarkInfo.industry) {
      res.json({
        financialYear: getFinancialYear(),
        empty: true,
        message: "Set your trade type in Settings to see your benchmarks.",
        industry: null,
        industryLabel: null,
        bandLabel: null,
        ytdRevenueExGst,
        ratios: [],
        hasAuditTriggers: false,
      });
      return;
    }

    if (ytdRevenueExGst === 0) {
      res.json({
        financialYear: getFinancialYear(),
        empty: true,
        message: "Log some revenue to compare your ratios against ATO benchmarks.",
        industry: benchmarkInfo.industry,
        industryLabel: benchmarkInfo.label,
        bandLabel: null,
        ytdRevenueExGst,
        ratios: [],
        hasAuditTriggers: false,
      });
      return;
    }

    // No turnover band set — show nudge to complete profile
    if (!turnoverBand) {
      res.json({
        financialYear: getFinancialYear(),
        empty: true,
        message: "Set your annual turnover band in Settings to see your benchmarks.",
        industry: benchmarkInfo.industry,
        industryLabel: benchmarkInfo.label,
        bandLabel: null,
        ytdRevenueExGst,
        ratios: [],
        hasAuditTriggers: false,
      });
      return;
    }

    // Use the band resolved from annualTurnoverBand (with fallback normalization via userTurnoverBandToRevenue)
    const band = benchmarkInfo.band;

    if (!band) {
      res.json({
        financialYear: getFinancialYear(),
        empty: true,
        message: "No benchmark data available for your current turnover band. Try updating your annual turnover in Settings.",
        industry: benchmarkInfo.industry,
        industryLabel: benchmarkInfo.label,
        bandLabel: null,
        ytdRevenueExGst,
        ratios: [],
        hasAuditTriggers: false,
      });
      return;
    }

    // Get expense totals grouped by category
    const expensesByCategory = await db
      .select({
        category: expensesTable.category,
        total: sum(expensesTable.amount),
        gstClaimable: sum(expensesTable.gstClaimable),
      })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, userId),
        gte(expensesTable.createdAt, fyStart),
        lte(expensesTable.createdAt, fyEnd)
      ))
      .groupBy(expensesTable.category);

    // Sum expenses into ratio buckets (ex-GST)
    const ratioBuckets: Record<string, number> = {
      totalExpenses: 0,
      costOfSales: 0,
      labour: 0,
      motorVehicle: 0,
    };

    for (const row of expensesByCategory) {
      const exGst = Math.max(0, parseFloat(row.total ?? "0") - parseFloat(row.gstClaimable ?? "0"));
      ratioBuckets.totalExpenses += exGst;
      const mapped = CATEGORY_TO_RATIO[row.category ?? ""];
      if (mapped && mapped in ratioBuckets) ratioBuckets[mapped] += exGst;
    }

    // Only show the four ATO benchmark ratios required by the task spec
    const ratioDefinitions: Array<{ key: keyof BenchmarkBand; label: string }> = [
      { key: "totalExpenses", label: "Total Expenses" },
      { key: "costOfSales", label: "Cost of Sales" },
      { key: "labour", label: "Labour" },
      { key: "motorVehicle", label: "Motor Vehicle" },
    ];

    const ratios = ratioDefinitions
      .filter(d => band && band[d.key] !== undefined)
      .map(d => {
        const userValue = ratioBuckets[d.key] !== undefined
          ? ratioBuckets[d.key] / ytdRevenueExGst
          : null;
        return computeBenchmarkRatio(d.key, d.label, userValue, band);
      });

    const hasAuditTriggers = ratios.some(r => r.auditTrigger);

    // Compliance: log benchmark calculation
    await db.insert(taxAuditLogTable).values({
      userId,
      calculationType: "benchmark_comparison",
      inputValues: JSON.stringify({ ytdRevenueExGst, ratioBuckets, tradeType, turnoverBand }),
      ruleApplied: `FY${getFinancialYear()} ATO benchmarks — ${benchmarkInfo.label ?? tradeType}`,
      result: JSON.stringify({ band: band?.key, ratios: ratios.map(r => ({ key: r.key, status: r.status, auditTrigger: r.auditTrigger })) }),
    });

    res.json({
      financialYear: getFinancialYear(),
      empty: false,
      industry: benchmarkInfo.industry,
      industryLabel: benchmarkInfo.label,
      bandLabel: band?.label ?? null,
      ytdRevenueExGst,
      ratios,
      hasAuditTriggers,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute tax benchmarks");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /tax/prompts
// ---------------------------------------------------------------------------
router.get("/tax/prompts", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const userId = tradieUser.id;
    const tradeType = tradieUser.tradeType;

    const categories = getDeductibleCategories(tradeType);

    // Fetch dismissals within last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dismissals = await db
      .select({ promptKey: userPromptDismissalsTable.promptKey })
      .from(userPromptDismissalsTable)
      .where(and(
        eq(userPromptDismissalsTable.userId, userId),
        gte(userPromptDismissalsTable.dismissedAt, thirtyDaysAgo)
      ));
    const dismissedKeys = new Set(dismissals.map(d => d.promptKey));

    // Find "missed deductions" — categories with no expenses logged this month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const expensesThisMonth = await db
      .select({ category: expensesTable.category })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, userId),
        gte(expensesTable.createdAt, monthStart),
        lte(expensesTable.createdAt, monthEnd)
      ));
    const categoriesWithExpenses = new Set(expensesThisMonth.map(e => e.category));

    const prompts = categories.map(cat => ({
      key: cat.key,
      label: cat.label,
      rule: cat.rule,
      examples: cat.examples,
      dismissed: dismissedKeys.has(cat.key),
      isMissed: false,
    }));

    // Top 5 missed deductions = trade-relevant categories with no expenses this month, not dismissed
    const missedDeductions = categories
      .filter(cat => !categoriesWithExpenses.has(cat.key) && !dismissedKeys.has(`missed_${cat.key}`))
      .slice(0, 5)
      .map(cat => ({
        key: `missed_${cat.key}`,
        label: cat.label,
        rule: cat.rule,
        examples: cat.examples,
        dismissed: false,
        isMissed: true,
      }));

    res.json({
      tradeType: tradeType ?? null,
      prompts,
      missedDeductions,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get tax prompts");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// POST /tax/prompts/:promptKey/dismiss
// ---------------------------------------------------------------------------
router.post("/tax/prompts/:promptKey/dismiss", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const userId = tradieUser.id;
    const { promptKey } = req.params;

    if (!promptKey) {
      res.status(400).json({ error: "promptKey is required" });
      return;
    }

    await db.insert(userPromptDismissalsTable).values({ userId, promptKey });

    res.json({ success: true, message: `Prompt "${promptKey}" dismissed for 30 days.` });
  } catch (err) {
    req.log.error({ err }, "Failed to dismiss prompt");
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// GET /tax/strategies
// ---------------------------------------------------------------------------
router.get("/tax/strategies", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const userId = tradieUser.id;

    const now = new Date();
    const { start: fyStart, end: fyEnd } = getFinancialYearRange();
    const msPerDay = 1000 * 60 * 60 * 24;
    const fyDaysTotal = Math.ceil((fyEnd.getTime() - fyStart.getTime()) / msPerDay);
    const fyDaysElapsed = Math.max(1, Math.ceil((now.getTime() - fyStart.getTime()) / msPerDay));
    const daysToEofy = Math.max(0, Math.ceil((fyEnd.getTime() - now.getTime()) / msPerDay));

    // Revenue
    const [revRow] = await db
      .select({ total: sum(invoicesTable.total), gst: sum(invoicesTable.gstAmount) })
      .from(invoicesTable)
      .where(and(
        eq(invoicesTable.userId, userId),
        gte(invoicesTable.createdAt, fyStart),
        lte(invoicesTable.createdAt, fyEnd)
      ));

    const totalRevInc = parseFloat(revRow.total ?? "0");
    const gstCollected = parseFloat(revRow.gst ?? "0");
    const ytdRevenueExGst = Math.max(0, totalRevInc - gstCollected);

    if (ytdRevenueExGst === 0 && fyDaysElapsed < 30) {
      res.json({
        financialYear: getFinancialYear(),
        empty: true,
        message: "Log revenue to unlock personalised tax strategies.",
        totalPotentialSaving: 0,
        strategies: [],
      });
      return;
    }

    // Expenses
    const expensesByCategory = await db
      .select({
        category: expensesTable.category,
        total: sum(expensesTable.amount),
        gstClaimable: sum(expensesTable.gstClaimable),
      })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, userId),
        gte(expensesTable.createdAt, fyStart),
        lte(expensesTable.createdAt, fyEnd)
      ))
      .groupBy(expensesTable.category);

    let ytdExpenses = 0;
    let toolsExpensesYtd = 0;
    for (const row of expensesByCategory) {
      const exGst = Math.max(0, parseFloat(row.total ?? "0") - parseFloat(row.gstClaimable ?? "0"));
      ytdExpenses += exGst;
      if (row.category === "tools_equipment") toolsExpensesYtd += exGst;
    }

    // Vehicle km
    const [vehRow] = await db
      .select({
        businessKm: sum(
          sql`CASE WHEN ${vehicleTripsTable.isBusiness} THEN ${vehicleTripsTable.distanceKm} ELSE 0 END`
        ),
      })
      .from(vehicleTripsTable)
      .where(and(
        eq(vehicleTripsTable.userId, userId),
        gte(vehicleTripsTable.createdAt, fyStart),
        lte(vehicleTripsTable.createdAt, fyEnd)
      ));

    const ytdBusinessKm = parseFloat(vehRow.businessKm ?? "0");

    // Tax position for marginal rate + projected income
    const taxPosition = calculateTaxPosition({
      ytdRevenueExGst,
      ytdExpenses,
      ytdBusinessKm,
      fyDaysElapsed,
      fyDaysTotal,
    });

    const marginalRate = getMarginalRate(taxPosition.projectedTaxableIncome);

    // Benchmark variance (needed for review_benchmarks strategy)
    const benchmarkInfo = getBenchmarks(tradieUser.tradeType, tradieUser.annualTurnoverBand);
    const benchmarkVariance: UserContext["benchmarkVariance"] = {};
    if (benchmarkInfo.band && ytdRevenueExGst > 0) {
      const band = benchmarkInfo.band;
      const CATEGORY_TO_RATIO: Record<string, string> = {
        materials: "costOfSales", tools_equipment: "costOfSales", equipment_hire: "costOfSales",
        electrical_materials: "costOfSales", plumbing_materials: "costOfSales",
        timber_materials: "costOfSales", building_materials: "costOfSales",
        paint_materials: "costOfSales", hvac_materials: "costOfSales",
        tile_materials: "costOfSales", landscaping_materials: "costOfSales",
        concrete_materials: "costOfSales",
        subcontractor: "labour", subcontractor_payment: "labour",
        vehicle: "motorVehicle", vehicle_fuel: "motorVehicle", vehicle_other: "motorVehicle",
      };
      const buckets: Record<string, number> = { totalExpenses: 0, costOfSales: 0, labour: 0, motorVehicle: 0 };
      for (const row of expensesByCategory) {
        const exGst = Math.max(0, parseFloat(row.total ?? "0") - parseFloat(row.gstClaimable ?? "0"));
        buckets.totalExpenses += exGst;
        const mapped = CATEGORY_TO_RATIO[row.category ?? ""];
        if (mapped && mapped in buckets) buckets[mapped] += exGst;
      }
      for (const key of ["totalExpenses", "costOfSales", "labour", "motorVehicle"] as const) {
        const range = band[key] as { low: number; high: number } | undefined;
        if (!range) continue;
        const userValue = buckets[key] / ytdRevenueExGst;
        benchmarkVariance[key] = {
          status: userValue < range.low ? "below" : userValue > range.high ? "above" : "within",
          userValue,
          benchmarkLow: range.low,
          benchmarkHigh: range.high,
        };
      }
    }

    const ctx: UserContext = {
      tradeType: tradieUser.tradeType,
      turnoverBand: tradieUser.annualTurnoverBand,
      ytdRevenueExGst,
      ytdExpenses,
      ytdBusinessKm,
      fyDaysElapsed,
      fyDaysTotal,
      daysToEofy,
      marginalRate,
      projectedTaxableIncome: taxPosition.projectedTaxableIncome,
      projectedTotalTaxEoy: taxPosition.projectedTotalTaxEoy,
      projectedAnnualIncome: taxPosition.projectedAnnualIncome,
      trafficLight: taxPosition.trafficLight,
      hasLogbook: !!tradieUser.logbookStartDate,
      gstRegistered: tradieUser.gstRegistered ?? true,
      toolsExpensesYtd,
      benchmarkVariance,
    };

    const strategies = getApplicableStrategies(ctx);
    const totalPotentialSaving = strategies
      .filter(s => !s.isRisk)
      .reduce((sum, s) => sum + s.estimatedSaving, 0);

    // Compliance: log strategy calculation
    await db.insert(taxAuditLogTable).values({
      userId,
      calculationType: "tax_strategies",
      inputValues: JSON.stringify({
        ytdRevenueExGst, ytdExpenses, ytdBusinessKm, marginalRate,
        projectedTaxableIncome: taxPosition.projectedTaxableIncome,
        trafficLight: taxPosition.trafficLight,
        daysToEofy,
      }),
      ruleApplied: `FY${getFinancialYear()} strategy engine — ${strategies.length} strategies`,
      result: JSON.stringify(strategies.map(s => ({ id: s.id, estimatedSaving: s.estimatedSaving }))),
    });

    res.json({
      financialYear: getFinancialYear(),
      empty: false,
      totalPotentialSaving,
      strategies,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to compute tax strategies");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
