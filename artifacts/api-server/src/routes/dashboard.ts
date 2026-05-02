import { Router, type IRouter, type Request, type Response } from "express";
import { db, invoicesTable, quotesTable, jobsTable, expensesTable, vehicleTripsTable, notificationsTable } from "@workspace/db";
import { eq, and, gte, lte, sql, sum, count } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import {
  getFinancialYearRange,
  getCurrentBasQuarter,
  calculateAustralianIncomeTax,
  calculateGstFromInclusive,
  ATO_KM_RATE,
} from "../lib/calculations";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const replitUserId = getReplitUserId(req);
    const tradieUser = await getOrCreateTradieUser(replitUserId);
    const userId = tradieUser.id;

    const now = new Date();
    const { start: fyStart, end: fyEnd } = getFinancialYearRange();

    // This month
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Last month
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [thisMonthResult] = await db
      .select({ total: sum(invoicesTable.total) })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.userId, userId),
          gte(invoicesTable.createdAt, monthStart),
          lte(invoicesTable.createdAt, monthEnd)
        )
      );

    const [lastMonthResult] = await db
      .select({ total: sum(invoicesTable.total) })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.userId, userId),
          gte(invoicesTable.createdAt, lastMonthStart),
          lte(invoicesTable.createdAt, lastMonthEnd)
        )
      );

    const [pendingQuotesResult] = await db
      .select({ count: count() })
      .from(quotesTable)
      .where(and(eq(quotesTable.userId, userId), eq(quotesTable.status, "sent")));

    const [activeJobsResult] = await db
      .select({ count: count() })
      .from(jobsTable)
      .where(
        and(
          eq(jobsTable.userId, userId),
          sql`${jobsTable.status} IN ('active','in_progress')`
        )
      );

    const unpaidInvoices = await db
      .select({ count: count(), total: sum(invoicesTable.total) })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.userId, userId),
          sql`${invoicesTable.status} IN ('unpaid','overdue')`
        )
      );

    // FY financial summary
    const [fyRevenue] = await db
      .select({ total: sum(invoicesTable.total) })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.userId, userId),
          gte(invoicesTable.createdAt, fyStart),
          lte(invoicesTable.createdAt, fyEnd)
        )
      );

    const [fyExpenses] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.userId, userId),
          gte(expensesTable.createdAt, fyStart),
          lte(expensesTable.createdAt, fyEnd)
        )
      );

    const [fyGstClaimable] = await db
      .select({ total: sum(expensesTable.gstClaimable) })
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.userId, userId),
          gte(expensesTable.createdAt, fyStart),
          lte(expensesTable.createdAt, fyEnd)
        )
      );

    // Vehicle logbook
    const [vehicleResult] = await db
      .select({
        totalKm: sum(vehicleTripsTable.distanceKm),
        businessKm: sum(
          sql`CASE WHEN ${vehicleTripsTable.isBusiness} THEN ${vehicleTripsTable.distanceKm} ELSE 0 END`
        ),
      })
      .from(vehicleTripsTable)
      .where(
        and(
          eq(vehicleTripsTable.userId, userId),
          gte(vehicleTripsTable.createdAt, fyStart),
          lte(vehicleTripsTable.createdAt, fyEnd)
        )
      );

    const totalInvoicedFy = parseFloat(fyRevenue.total ?? "0");
    const gstCollectedFy = totalInvoicedFy > 0 ? totalInvoicedFy / 11 : 0;
    const actualIncome = totalInvoicedFy - gstCollectedFy;
    const businessExpenses = parseFloat(fyExpenses.total ?? "0");
    const businessKm = parseFloat(vehicleResult.businessKm ?? "0");
    const vehicleDeduction = businessKm * ATO_KM_RATE;
    const taxableIncome = Math.max(0, actualIncome - businessExpenses - vehicleDeduction);
    const { totalTax, incomeTax, medicareLevy, lito, brackets } = calculateAustralianIncomeTax(taxableIncome);
    const takeHome = actualIncome - totalTax - businessExpenses;
    // Real-data-derived breakdown of every $1 invoiced. By construction
    //   takeHome + totalTax + businessExpenses + gstCollectedFy = totalInvoicedFy
    // so the three slices below sum to 100% (we group GST collected with
    // expenses since both are cash that flows out of the business).
    let yoursPercent = 0;
    let taxPercent = 0;
    let expensesPercent = 0;
    if (totalInvoicedFy > 0) {
      const yoursRaw = Math.max(0, (takeHome / totalInvoicedFy) * 100);
      const taxRaw = Math.max(0, (totalTax / totalInvoicedFy) * 100);
      yoursPercent = Math.round(yoursRaw);
      taxPercent = Math.round(taxRaw);
      expensesPercent = Math.max(0, 100 - yoursPercent - taxPercent);
    }
    const financialYear = getFinancialYearRange();
    const fyLabel = `${financialYear.start.getFullYear()}-${(financialYear.end.getFullYear()).toString().slice(2)}`;

    // BAS position
    const basQuarter = getCurrentBasQuarter();
    const daysUntilBas = Math.ceil(
      (basQuarter.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    const [qGstCollected] = await db
      .select({ collected: sum(invoicesTable.gstAmount) })
      .from(invoicesTable)
      .where(
        and(
          eq(invoicesTable.userId, userId),
          gte(invoicesTable.createdAt, basQuarter.startDate),
          lte(invoicesTable.createdAt, basQuarter.endDate)
        )
      );

    const [qGstClaimable] = await db
      .select({ claimable: sum(expensesTable.gstClaimable) })
      .from(expensesTable)
      .where(
        and(
          eq(expensesTable.userId, userId),
          gte(expensesTable.createdAt, basQuarter.startDate),
          lte(expensesTable.createdAt, basQuarter.endDate)
        )
      );

    const estimatedGstPayable = Math.max(
      0,
      parseFloat(qGstCollected.collected ?? "0") - parseFloat(qGstClaimable.claimable ?? "0")
    );

    // Recent jobs
    const recentJobs = await db
      .select()
      .from(jobsTable)
      .where(eq(jobsTable.userId, userId))
      .orderBy(sql`${jobsTable.createdAt} DESC`)
      .limit(5);

    const [unreadNotifs] = await db
      .select({ count: count() })
      .from(notificationsTable)
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.isRead, false)));

    const thisMonth = parseFloat(thisMonthResult.total ?? "0");
    const lastMonth = parseFloat(lastMonthResult.total ?? "0");
    const monthOverMonth = lastMonth > 0
      ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100)
      : 0;

    const gstClaimableFy = parseFloat(fyGstClaimable.total ?? "0");
    res.json({
      thisMonthInvoiced: thisMonth,
      lastMonthInvoiced: lastMonth,
      monthOverMonth,
      pendingQuotesCount: pendingQuotesResult.count,
      activeJobsCount: activeJobsResult.count,
      unpaidInvoicesCount: unpaidInvoices[0].count,
      unpaidAmount: parseFloat(unpaidInvoices[0].total ?? "0"),
      financialSummary: {
        financialYear: fyLabel,
        totalInvoicedFy,
        gstCollected: gstCollectedFy,
        actualIncome,
        businessExpenses,
        vehicleDeduction,
        businessKmFY: businessKm,
        taxableIncome,
        estimatedIncomeTax: incomeTax,
        medicareLevy,
        lito,
        takeHome,
        taxPercent,
        expensesPercent,
        yoursPercent,
        marginalBreakdown: brackets,
        gstClaimableFY: gstClaimableFy,
      },
      basPosition: {
        quarter: basQuarter.quarter,
        startDate: basQuarter.startDate.toISOString(),
        endDate: basQuarter.endDate.toISOString(),
        dueDate: basQuarter.dueDate.toISOString(),
        daysUntilDue: daysUntilBas,
        gstCollected: parseFloat(qGstCollected.collected ?? "0"),
        gstClaimable: parseFloat(qGstClaimable.claimable ?? "0"),
        netGstPayable: estimatedGstPayable,
      },
      recentJobs,
      notificationsUnreadCount: unreadNotifs.count,
    });
  } catch (err) {
    req.log.error({ err }, "Dashboard error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
