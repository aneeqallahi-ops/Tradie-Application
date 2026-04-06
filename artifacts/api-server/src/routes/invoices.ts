import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db } from "@workspace/db";
import { invoicesTable, jobsTable, clientsTable, notificationsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { generateInvoiceNumber, getSopaText } from "../lib/calculations";

const router: IRouter = Router();

router.get("/invoices", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { status, jobId } = req.query;

    const filterConditions = [eq(invoicesTable.userId, tradieUser.id)];
    if (status) filterConditions.push(eq(invoicesTable.status, status as string));
    if (jobId) filterConditions.push(eq(invoicesTable.jobId, parseInt(jobId as string)));
    const conditions = and(...filterConditions);

    const results = await db
      .select({ invoice: invoicesTable, client: clientsTable, job: jobsTable })
      .from(invoicesTable)
      .leftJoin(clientsTable, and(eq(invoicesTable.clientId, clientsTable.id), eq(clientsTable.userId, tradieUser.id)))
      .leftJoin(jobsTable, and(eq(invoicesTable.jobId, jobsTable.id), eq(jobsTable.userId, tradieUser.id)))
      .where(conditions)
      .orderBy(sql`${invoicesTable.createdAt} DESC`);

    res.json(results.map(r => ({ ...r.invoice, client: r.client, job: r.job })));
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get invoices");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invoices", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { jobId, clientId, type, dueDate, subtotal, gstAmount, total, stripePaymentLink } = req.body;

    const [lastInvoice] = await db
      .select({ invoiceNumber: invoicesTable.invoiceNumber })
      .from(invoicesTable)
      .where(eq(invoicesTable.userId, tradieUser.id))
      .orderBy(sql`${invoicesTable.createdAt} DESC`)
      .limit(1);

    let seqNum = 1;
    if (lastInvoice?.invoiceNumber) {
      const parts = lastInvoice.invoiceNumber.split("-");
      seqNum = parseInt(parts[parts.length - 1]) + 1;
    }

    // Validate clientId ownership
    if (clientId) {
      const [client] = await db.select({ id: clientsTable.id }).from(clientsTable)
        .where(and(eq(clientsTable.id, parseInt(clientId)), eq(clientsTable.userId, tradieUser.id)));
      if (!client) { res.status(400).json({ error: "Invalid clientId" }); return; }
    }

    // Validate jobId ownership and get state for SOPA
    let state = tradieUser.state || "VIC";
    if (jobId) {
      const [job] = await db.select().from(jobsTable).where(and(eq(jobsTable.id, parseInt(jobId)), eq(jobsTable.userId, tradieUser.id)));
      if (!job) { res.status(400).json({ error: "Invalid jobId" }); return; }
      if (job.state) state = job.state;
    }

    const defaultDueDate = dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const [invoice] = await db
      .insert(invoicesTable)
      .values({
        userId: tradieUser.id,
        jobId: jobId ? parseInt(jobId) : null,
        clientId: clientId ? parseInt(clientId) : null,
        invoiceNumber: generateInvoiceNumber(seqNum),
        type: type || "full",
        status: "unpaid",
        subtotal: subtotal ?? "0",
        gstAmount: gstAmount ?? "0",
        total: total ?? "0",
        dueDate: defaultDueDate,
        stripePaymentLink,
        sopaText: getSopaText(state),
      })
      .returning();

    res.status(201).json(invoice);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to create invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/invoices/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [result] = await db
      .select({ invoice: invoicesTable, client: clientsTable, job: jobsTable })
      .from(invoicesTable)
      .leftJoin(clientsTable, and(eq(invoicesTable.clientId, clientsTable.id), eq(clientsTable.userId, tradieUser.id)))
      .leftJoin(jobsTable, and(eq(invoicesTable.jobId, jobsTable.id), eq(jobsTable.userId, tradieUser.id)))
      .where(and(eq(invoicesTable.id, parseId(req.params.id)), eq(invoicesTable.userId, tradieUser.id)));

    if (!result) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ ...result.invoice, client: result.client, job: result.job });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get invoice");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invoices/:id/pay", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { paymentMethod, paidAt } = req.body;
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, parseId(req.params.id)), eq(invoicesTable.userId, tradieUser.id)));
    if (!invoice) { res.status(404).json({ error: "Not found" }); return; }

    const paidDate = paidAt ? new Date(paidAt) : new Date();
    const [updated] = await db
      .update(invoicesTable)
      .set({ status: "paid", paidAt: paidDate, paymentMethod, amountPaid: invoice.total })
      .where(eq(invoicesTable.id, invoice.id))
      .returning();

    // Update job amount paid
    if (invoice.jobId) {
      const jobInvoices = await db
        .select()
        .from(invoicesTable)
        .where(and(eq(invoicesTable.jobId, invoice.jobId), eq(invoicesTable.status, "paid")));
      const totalPaid = jobInvoices.reduce((sum, inv) => sum + parseFloat(inv.total ?? "0"), 0);
      await db
        .update(jobsTable)
        .set({ amountPaid: totalPaid.toFixed(2) })
        .where(eq(jobsTable.id, invoice.jobId));
    }

    await db.insert(notificationsTable).values({
      userId: tradieUser.id,
      type: "invoice_paid",
      message: `Invoice ${invoice.invoiceNumber} marked as paid`,
      actionUrl: `/invoices/${invoice.id}`,
    });

    res.json(updated);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to mark invoice paid");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/invoices/:id/remind", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, parseId(req.params.id)), eq(invoicesTable.userId, tradieUser.id)));
    if (!invoice) { res.status(404).json({ error: "Not found" }); return; }

    const now = new Date();
    const update: Record<string, unknown> = {};
    if (!invoice.reminder1SentAt) {
      update.reminder1SentAt = now;
    } else {
      update.reminder2SentAt = now;
    }

    const [updated] = await db
      .update(invoicesTable)
      .set(update)
      .where(eq(invoicesTable.id, invoice.id))
      .returning();

    await db.insert(notificationsTable).values({
      userId: tradieUser.id,
      type: "invoice_overdue",
      message: `Payment reminder sent for Invoice ${invoice.invoiceNumber}`,
      actionUrl: `/invoices/${invoice.id}`,
    });

    res.json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to send reminder");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
