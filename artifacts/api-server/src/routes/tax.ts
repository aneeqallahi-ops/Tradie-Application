import { Router, type IRouter, type Request, type Response } from "express";
import { db, invoicesTable, expensesTable, vehicleTripsTable, taxAuditLogTable } from "@workspace/db";
import { eq, and, gte, lte, sql, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { getFinancialYearRange } from "../lib/calculations";
import { calculateTaxPosition, getFinancialYear } from "../lib/taxDataService";

const router: IRouter = Router();

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

export default router;
