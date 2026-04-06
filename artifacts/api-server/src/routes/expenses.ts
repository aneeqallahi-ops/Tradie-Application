import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db } from "@workspace/db";
import { expensesTable, subcontractorPaymentsTable, subcontractorsTable } from "@workspace/db";
import { eq, and, sum, sql, type SQL } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { calculateGstFromInclusive, getFinancialYearRange, getFinancialYear } from "../lib/calculations";

const router: IRouter = Router();

router.get("/expenses", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { jobId, category, month } = req.query;

    const conditions: SQL[] = [eq(expensesTable.userId, tradieUser.id)];
    if (jobId) conditions.push(eq(expensesTable.jobId, parseInt(jobId as string)));
    if (category) conditions.push(eq(expensesTable.category, category as string));
    if (month) {
      const prefix = String(month).substring(0, 7);
      conditions.push(sql`to_char(${expensesTable.expenseDate}, 'YYYY-MM') = ${prefix}`);
    }

    const expenses = await db
      .select()
      .from(expensesTable)
      .where(and(...conditions))
      .orderBy(sql`${expensesTable.expenseDate} DESC`);

    res.json(expenses);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get expenses");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/expenses", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const {
      jobId, category, vendor, description, amount,
      isGstClaimable = true, receiptUrl, expenseDate,
      subcontractorId, subcontractorName, subcontractorAbn, addToTpar
    } = req.body;

    const amountNum = parseFloat(amount);
    const gstClaimable = isGstClaimable ? calculateGstFromInclusive(amountNum) : 0;
    const fyStr = getFinancialYear(new Date(expenseDate || Date.now()));

    const [expense] = await db
      .insert(expensesTable)
      .values({
        userId: tradieUser.id,
        jobId: jobId ? parseInt(jobId) : null,
        category,
        vendor,
        description,
        amount: amountNum.toFixed(2),
        gstClaimable: gstClaimable.toFixed(2),
        isGstClaimable,
        receiptUrl,
        expenseDate: expenseDate || new Date().toISOString().split("T")[0],
        financialYear: fyStr,
      })
      .returning();

    // Handle subcontractor payment recording
    if (category === "subcontractor_payment" && addToTpar) {
      let subId = subcontractorId ? parseInt(subcontractorId) : null;
      if (subId) {
        // Validate subcontractor ownership before using the ID
        const [ownedSub] = await db.select({ id: subcontractorsTable.id })
          .from(subcontractorsTable)
          .where(and(eq(subcontractorsTable.id, subId), eq(subcontractorsTable.userId, tradieUser.id)));
        if (!ownedSub) { res.status(400).json({ error: "Invalid subcontractorId" }); return; }
      }
      if (!subId && subcontractorName) {
        // Create subcontractor if not exists
        const [sub] = await db
          .insert(subcontractorsTable)
          .values({ userId: tradieUser.id, name: subcontractorName, abn: subcontractorAbn })
          .returning();
        subId = sub.id;
      }
      if (subId) {
        await db.insert(subcontractorPaymentsTable).values({
          subcontractorId: subId,
          expenseId: expense.id,
          amount: amountNum.toFixed(2),
          paymentDate: expense.expenseDate,
          financialYear: fyStr,
        });
        // Update total paid this FY
        const [totals] = await db
          .select({ total: sum(subcontractorPaymentsTable.amount) })
          .from(subcontractorPaymentsTable)
          .where(and(
            eq(subcontractorPaymentsTable.subcontractorId, subId),
            eq(subcontractorPaymentsTable.financialYear, fyStr)
          ));
        await db
          .update(subcontractorsTable)
          .set({ totalPaidThisFy: totals.total ?? "0" })
          .where(and(eq(subcontractorsTable.id, subId), eq(subcontractorsTable.userId, tradieUser.id)));
      }
    }

    res.status(201).json(expense);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to create expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/expenses/summary", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { start: fyStart, end: fyEnd } = getFinancialYearRange();
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [monthResult] = await db
      .select({ total: sum(expensesTable.amount) })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, tradieUser.id),
        sql`${expensesTable.expenseDate} >= ${monthStart.toISOString().split("T")[0]}`,
        sql`${expensesTable.expenseDate} <= ${monthEnd.toISOString().split("T")[0]}`
      ));

    const [fyResult] = await db
      .select({ total: sum(expensesTable.amount), gst: sum(expensesTable.gstClaimable) })
      .from(expensesTable)
      .where(and(
        eq(expensesTable.userId, tradieUser.id),
        sql`${expensesTable.expenseDate} >= ${fyStart.toISOString().split("T")[0]}`,
        sql`${expensesTable.expenseDate} <= ${fyEnd.toISOString().split("T")[0]}`
      ));

    // Subcontractor count and total for TPAR
    const [subResult] = await db
      .select({
        subcontractorCount: sql<number>`count(distinct ${subcontractorPaymentsTable.subcontractorId})`,
        subcontractorTotal: sum(subcontractorPaymentsTable.amount),
      })
      .from(subcontractorPaymentsTable)
      .leftJoin(subcontractorsTable, eq(subcontractorPaymentsTable.subcontractorId, subcontractorsTable.id))
      .where(eq(subcontractorsTable.userId, tradieUser.id));

    res.json({
      thisMonth: parseFloat(monthResult.total ?? "0"),
      thisFy: parseFloat(fyResult.total ?? "0"),
      gstClaimable: parseFloat(fyResult.gst ?? "0"),
      subcontractorCount: Number(subResult.subcontractorCount ?? 0),
      subcontractorTotal: parseFloat(subResult.subcontractorTotal ?? "0"),
    });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get expense summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/expenses/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [expense] = await db
      .select()
      .from(expensesTable)
      .where(and(eq(expensesTable.id, parseId(req.params.id)), eq(expensesTable.userId, tradieUser.id)));
    if (!expense) { res.status(404).json({ error: "Not found" }); return; }
    res.json(expense);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/expenses/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { category, vendor, description, amount, isGstClaimable, expenseDate } = req.body;
    const amountNum = parseFloat(amount);
    const gstClaimable = isGstClaimable ? calculateGstFromInclusive(amountNum) : 0;
    const [updated] = await db
      .update(expensesTable)
      .set({ category, vendor, description, amount: amountNum.toFixed(2), isGstClaimable, gstClaimable: gstClaimable.toFixed(2), expenseDate })
      .where(and(eq(expensesTable.id, parseId(req.params.id)), eq(expensesTable.userId, tradieUser.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to update expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/expenses/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    await db
      .delete(expensesTable)
      .where(and(eq(expensesTable.id, parseId(req.params.id)), eq(expensesTable.userId, tradieUser.id)));
    res.json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to delete expense");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
