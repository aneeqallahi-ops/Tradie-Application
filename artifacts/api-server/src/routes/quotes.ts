import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db, quotesTable, quoteLineItemsTable, clientsTable, notificationsTable, jobsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import {
  generateQuoteNumber, generateJobNumber, getSopaText, getDepositLimit
} from "../lib/calculations";

interface LineItemInput {
  description: string;
  quantity?: string;
  unitCost?: string;
  markupPercent?: string;
  unitPrice?: string;
  lineTotal?: string;
  isInternal?: boolean;
}

const router: IRouter = Router();

router.get("/quotes", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { status } = req.query;
    let query = db
      .select({
        quote: quotesTable,
        client: clientsTable,
      })
      .from(quotesTable)
      .leftJoin(clientsTable, eq(quotesTable.clientId, clientsTable.id))
      .where(eq(quotesTable.userId, tradieUser.id))
      .$dynamic();

    if (status) {
      query = query.where(and(eq(quotesTable.userId, tradieUser.id), eq(quotesTable.status, status as string)));
    }

    const results = await query.orderBy(sql`${quotesTable.createdAt} DESC`);
    res.json(results.map(r => ({ ...r.quote, client: r.client })));
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get quotes");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const {
      clientId, title, description, state, validUntil,
      lineItems = [], depositPercent = 0, travelKm = 0, internalNotes
    } = req.body;

    // Validate clientId ownership
    if (clientId) {
      const [client] = await db.select({ id: clientsTable.id }).from(clientsTable)
        .where(and(eq(clientsTable.id, parseInt(clientId)), eq(clientsTable.userId, tradieUser.id)));
      if (!client) { res.status(400).json({ error: "Invalid clientId" }); return; }
    }

    // Calculate totals from line items
    let subtotal = 0;
    for (const item of lineItems) {
      const qty = parseFloat(item.quantity ?? "1");
      const unitCost = parseFloat(item.unitCost ?? "0");
      const markup = parseFloat(item.markupPercent ?? "0");
      const unitPrice = unitCost * (1 + markup / 100);
      const lineTotal = qty * unitPrice;
      item.unitPrice = unitPrice.toFixed(2);
      item.lineTotal = lineTotal.toFixed(2);
      subtotal += lineTotal;
    }

    // Add travel cost
    const travelCost = parseFloat(travelKm) * 0.88;
    subtotal += travelCost;

    const gstAmount = subtotal * 0.1;
    const total = subtotal + gstAmount;
    const depositAmount = total * (parseFloat(depositPercent) / 100);

    // Check deposit compliance
    const depositLimit = getDepositLimit(state, total);
    let depositCompliant = true;
    if (depositLimit.maxPercent !== null && parseFloat(depositPercent) > depositLimit.maxPercent) {
      depositCompliant = false;
    }
    if (depositLimit.maxFixed !== null && depositAmount > depositLimit.maxFixed) {
      depositCompliant = false;
    }

    // Get next sequence number
    const [lastQuote] = await db
      .select({ quoteNumber: quotesTable.quoteNumber })
      .from(quotesTable)
      .where(eq(quotesTable.userId, tradieUser.id))
      .orderBy(sql`${quotesTable.createdAt} DESC`)
      .limit(1);

    let seqNum = 1;
    if (lastQuote?.quoteNumber) {
      const parts = lastQuote.quoteNumber.split("-");
      seqNum = parseInt(parts[parts.length - 1]) + 1;
    }

    const [quote] = await db
      .insert(quotesTable)
      .values({
        userId: tradieUser.id,
        clientId: clientId ? parseInt(clientId) : null,
        quoteNumber: generateQuoteNumber(seqNum),
        title, description,
        state: state || tradieUser.state || "VIC",
        subtotal: subtotal.toFixed(2),
        gstAmount: gstAmount.toFixed(2),
        total: total.toFixed(2),
        depositPercent: depositPercent.toString(),
        depositAmount: depositAmount.toFixed(2),
        depositCompliant,
        travelKm: travelKm.toString(),
        travelCost: travelCost.toFixed(2),
        internalNotes,
        validUntil: validUntil || null,
        status: "draft",
      })
      .returning();

    // Insert line items
    if (lineItems.length > 0) {
      await db.insert(quoteLineItemsTable).values(
        lineItems.map((item: LineItemInput, idx: number) => ({
          quoteId: quote.id,
          description: item.description,
          quantity: item.quantity ?? "1",
          unitCost: item.unitCost ?? "0",
          markupPercent: item.markupPercent ?? "0",
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          isInternal: item.isInternal ?? false,
          sortOrder: idx,
        }))
      );
    }

    const savedLineItems = await db
      .select()
      .from(quoteLineItemsTable)
      .where(eq(quoteLineItemsTable.quoteId, quote.id))
      .orderBy(quoteLineItemsTable.sortOrder);

    res.status(201).json({ ...quote, lineItems: savedLineItems });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to create quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/quotes/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(and(eq(quotesTable.id, parseId(req.params.id)), eq(quotesTable.userId, tradieUser.id)));
    if (!quote) { res.status(404).json({ error: "Not found" }); return; }

    const lineItems = await db
      .select()
      .from(quoteLineItemsTable)
      .where(eq(quoteLineItemsTable.quoteId, quote.id))
      .orderBy(quoteLineItemsTable.sortOrder);

    const [client] = quote.clientId
      ? await db.select().from(clientsTable).where(and(eq(clientsTable.id, quote.clientId), eq(clientsTable.userId, tradieUser.id)))
      : [null];

    res.json({ ...quote, lineItems, client, sopaText: getSopaText(quote.state) });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/quotes/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { title, description, state, validUntil, depositPercent, internalNotes, status } = req.body;
    const [updated] = await db
      .update(quotesTable)
      .set({ title, description, state, validUntil, depositPercent, internalNotes, status })
      .where(and(eq(quotesTable.id, parseId(req.params.id)), eq(quotesTable.userId, tradieUser.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    const updatedLineItems = await db
      .select()
      .from(quoteLineItemsTable)
      .where(eq(quoteLineItemsTable.quoteId, updated.id))
      .orderBy(quoteLineItemsTable.sortOrder);
    res.json({ ...updated, lineItems: updatedLineItems });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to update quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes/:id/send", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [updated] = await db
      .update(quotesTable)
      .set({ status: "sent", sentAt: new Date() })
      .where(and(eq(quotesTable.id, parseId(req.params.id)), eq(quotesTable.userId, tradieUser.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    await db.insert(notificationsTable).values({
      userId: tradieUser.id,
      type: "quote_sent",
      message: `Quote ${updated.quoteNumber} has been sent to the client`,
      actionUrl: `/quotes/${updated.id}`,
    });
    res.json(updated);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to send quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/quotes/:id/convert", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(and(eq(quotesTable.id, parseId(req.params.id)), eq(quotesTable.userId, tradieUser.id)));
    if (!quote) { res.status(404).json({ error: "Not found" }); return; }

    // Get next job number
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
        clientId: quote.clientId,
        quoteId: quote.id,
        jobNumber: generateJobNumber(seqNum),
        title: quote.title,
        description: quote.description,
        state: quote.state,
        status: "active",
        subtotal: quote.subtotal,
        gstAmount: quote.gstAmount,
        total: quote.total,
      })
      .returning();

    await db
      .update(quotesTable)
      .set({ status: "accepted", acceptedAt: new Date() })
      .where(eq(quotesTable.id, quote.id));

    // Notification
    await db.insert(notificationsTable).values({
      userId: tradieUser.id,
      type: "quote_converted",
      message: `Quote ${quote.quoteNumber} has been converted to Job ${job.jobNumber}`,
      actionUrl: `/jobs/${job.id}`,
    });

    res.status(201).json(job);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to convert quote");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
