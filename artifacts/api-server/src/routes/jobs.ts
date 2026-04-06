import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db } from "@workspace/db";
import { jobsTable, clientsTable, invoicesTable, expensesTable, quoteLineItemsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { generateJobNumber } from "../lib/calculations";

const router: IRouter = Router();

router.get("/jobs", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { status } = req.query;

    let baseWhere = eq(jobsTable.userId, tradieUser.id);
    const conditions = status
      ? and(baseWhere, eq(jobsTable.status, status as string))
      : baseWhere;

    const results = await db
      .select({ job: jobsTable, client: clientsTable })
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.clientId, clientsTable.id))
      .where(conditions)
      .orderBy(sql`${jobsTable.createdAt} DESC`);

    res.json(results.map(r => ({ ...r.job, client: r.client })));
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get jobs");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/jobs", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { clientId, title, description, state, scheduledDate, subtotal, gstAmount, total } = req.body;

    // Validate clientId ownership
    if (clientId) {
      const [client] = await db.select({ id: clientsTable.id }).from(clientsTable)
        .where(and(eq(clientsTable.id, parseInt(clientId)), eq(clientsTable.userId, tradieUser.id)));
      if (!client) { res.status(400).json({ error: "Invalid clientId" }); return; }
    }

    const [lastJob] = await db
      .select({ jobNumber: jobsTable.jobNumber })
      .from(jobsTable)
      .where(eq(jobsTable.userId, tradieUser.id))
      .orderBy(sql`${jobsTable.createdAt} DESC`)
      .limit(1);

    let seqNum = 1;
    if (lastJob?.jobNumber) {
      const parts = lastJob.jobNumber.split("-");
      seqNum = parseInt(parts[parts.length - 1]) + 1;
    }

    const [job] = await db
      .insert(jobsTable)
      .values({
        userId: tradieUser.id,
        clientId: clientId ? parseInt(clientId) : null,
        jobNumber: generateJobNumber(seqNum),
        title, description, state,
        scheduledDate,
        subtotal: subtotal ?? "0",
        gstAmount: gstAmount ?? "0",
        total: total ?? "0",
        status: "active",
      })
      .returning();

    res.status(201).json(job);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to create job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/jobs/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const jobId = parseId(req.params.id);

    const [result] = await db
      .select({ job: jobsTable, client: clientsTable })
      .from(jobsTable)
      .leftJoin(clientsTable, eq(jobsTable.clientId, clientsTable.id))
      .where(and(eq(jobsTable.id, jobId), eq(jobsTable.userId, tradieUser.id)));

    if (!result) { res.status(404).json({ error: "Not found" }); return; }

    const jobInvoices = await db
      .select()
      .from(invoicesTable)
      .where(and(eq(invoicesTable.jobId, jobId), eq(invoicesTable.userId, tradieUser.id)));

    const jobExpenses = await db
      .select()
      .from(expensesTable)
      .where(and(eq(expensesTable.jobId, jobId), eq(expensesTable.userId, tradieUser.id)));

    const quoteLineItems = result.job.quoteId
      ? await db
          .select()
          .from(quoteLineItemsTable)
          .where(eq(quoteLineItemsTable.quoteId, result.job.quoteId))
          .orderBy(quoteLineItemsTable.sortOrder)
      : [];

    const actualCost = jobExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
    const quotedTotal = parseFloat(result.job.total ?? "0");
    const margin = quotedTotal > 0 ? ((quotedTotal - actualCost) / quotedTotal) * 100 : 0;

    res.json({
      ...result.job,
      client: result.client,
      invoices: jobInvoices,
      expenses: jobExpenses,
      quoteLineItems,
      actualCost,
      margin: Math.round(margin),
    });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/jobs/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { title, description, state, scheduledDate } = req.body;
    const [updated] = await db
      .update(jobsTable)
      .set({ title, description, state, scheduledDate })
      .where(and(eq(jobsTable.id, parseId(req.params.id)), eq(jobsTable.userId, tradieUser.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to update job");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/jobs/:id/status", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { status } = req.body;
    const updateData: Record<string, unknown> = { status };
    if (status === "complete") {
      updateData.completedDate = new Date().toISOString().split("T")[0];
    }
    const [updated] = await db
      .update(jobsTable)
      .set(updateData)
      .where(and(eq(jobsTable.id, parseId(req.params.id)), eq(jobsTable.userId, tradieUser.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    if (status === "complete") {
      await db.insert(notificationsTable).values({
        userId: tradieUser.id,
        type: "job_complete",
        message: `Job ${updated.jobNumber ?? updated.title} has been marked complete`,
        actionUrl: `/jobs/${updated.id}`,
      });
    } else if (status === "in_progress") {
      await db.insert(notificationsTable).values({
        userId: tradieUser.id,
        type: "job_started",
        message: `Job ${updated.jobNumber ?? updated.title} is now in progress`,
        actionUrl: `/jobs/${updated.id}`,
      });
    }
    res.json(updated);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to update job status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
