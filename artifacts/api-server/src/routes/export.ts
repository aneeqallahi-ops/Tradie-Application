import { Router, type IRouter, type Request, type Response } from "express";
import { jsPDF } from "jspdf";
import { requireAuth } from "../middlewares/requireAuth";
import { db, invoicesTable, quotesTable, jobsTable, clientsTable, tradieUsersTable, expensesTable, vehicleTripsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { parseId, BadRequestError } from "../lib/params";
import { getOrCreateTradieUser, getReplitUserId } from "./me";

const router: IRouter = Router();

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}

function formatDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

router.get("/export/invoice/:id/pdf", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const invoiceId = parseId(req.params.id);

    const [invoice] = await db
      .select()
      .from(invoicesTable)
      .where(and(eq(invoicesTable.id, invoiceId), eq(invoicesTable.userId, tradieUser.id)));

    if (!invoice) {
      res.status(404).json({ error: "Invoice not found" });
      return;
    }

    const [job] = invoice.jobId
      ? await db.select().from(jobsTable).where(and(eq(jobsTable.id, invoice.jobId), eq(jobsTable.userId, tradieUser.id)))
      : [null];
    const [client] = job?.clientId
      ? await db.select().from(clientsTable).where(and(eq(clientsTable.id, job.clientId), eq(clientsTable.userId, tradieUser.id)))
      : [null];
    const [user] = await db.select().from(tradieUsersTable).where(eq(tradieUsersTable.id, tradieUser.id));

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("TAX INVOICE", margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(user?.businessName || "Your Business", margin, y);
    y += 6;
    if (user?.abn) { doc.text(`ABN: ${user.abn}`, margin, y); y += 5; }

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Invoice #: ${invoice.invoiceNumber || `INV-${invoice.id}`}`, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDate(invoice.createdAt)}`, margin, y);
    y += 5;
    doc.text(`Due: ${formatDate(invoice.dueDate)}`, margin, y);
    y += 10;

    if (client) {
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(client.name, margin, y);
      y += 5;
      if (client.email) { doc.text(client.email, margin, y); y += 5; }
      if (client.abn) { doc.text(`ABN: ${client.abn}`, margin, y); y += 5; }
      y += 5;
    }

    if (job) {
      doc.setFont("helvetica", "bold");
      doc.text("For:", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(job.title || "Work completed", margin, y);
      y += 10;
    }

    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Subtotal (excl. GST)", margin + 2, y + 5.5);
    doc.text("GST (10%)", 110, y + 5.5);
    doc.text("Total", 155, y + 5.5);
    y += 10;

    doc.setFont("helvetica", "normal");
    const subtotal = parseFloat(String(invoice.subtotal || 0));
    const gstAmount = parseFloat(String(invoice.gstAmount || 0));
    const total = parseFloat(String(invoice.total || 0));
    doc.text(formatCurrency(subtotal), margin + 2, y);
    doc.text(formatCurrency(gstAmount), 110, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(total), 155, y);
    y += 15;

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("Payment is due within 7 days of invoice date unless otherwise agreed.", margin, y);
    y += 5;
    doc.text("This document is a tax invoice for GST purposes.", margin, y);

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="invoice-${invoice.invoiceNumber || invoice.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "PDF export error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/export/quote/:id/pdf", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const quoteId = parseId(req.params.id);

    const [quote] = await db
      .select()
      .from(quotesTable)
      .where(and(eq(quotesTable.id, quoteId), eq(quotesTable.userId, tradieUser.id)));

    if (!quote) {
      res.status(404).json({ error: "Quote not found" });
      return;
    }

    const [client] = quote.clientId
      ? await db.select().from(clientsTable).where(and(eq(clientsTable.id, quote.clientId), eq(clientsTable.userId, tradieUser.id)))
      : [null];
    const [user] = await db.select().from(tradieUsersTable).where(eq(tradieUsersTable.id, tradieUser.id));

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const margin = 20;
    let y = margin;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.text("QUOTE", margin, y);
    y += 10;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(user?.businessName || "Your Business", margin, y);
    y += 6;
    if (user?.abn) { doc.text(`ABN: ${user.abn}`, margin, y); y += 5; }

    y += 5;
    doc.setFont("helvetica", "bold");
    doc.text(`Quote #: ${quote.quoteNumber || `Q-${quote.id}`}`, margin, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${formatDate(quote.createdAt)}`, margin, y);
    y += 5;
    if (quote.validUntil) { doc.text(`Valid Until: ${formatDate(quote.validUntil)}`, margin, y); y += 5; }
    y += 10;

    if (client) {
      doc.setFont("helvetica", "bold");
      doc.text("Prepared For:", margin, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(client.name, margin, y);
      y += 10;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(quote.title || "Scope of Works", margin, y);
    y += 7;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    if (quote.description) { doc.text(quote.description, margin, y, { maxWidth: 170 }); y += 10; }

    y += 5;
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, y, 170, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Subtotal (excl. GST)", margin + 2, y + 5.5);
    doc.text("GST (10%)", 110, y + 5.5);
    doc.text("Total", 155, y + 5.5);
    y += 10;

    doc.setFont("helvetica", "normal");
    const subtotal = parseFloat(String(quote.subtotal || 0));
    const gstAmount = parseFloat(String(quote.gstAmount || 0));
    const total = parseFloat(String(quote.total || 0));
    doc.text(formatCurrency(subtotal), margin + 2, y);
    doc.text(formatCurrency(gstAmount), 110, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(total), 155, y);
    y += 10;

    const depositAmount = parseFloat(String(quote.depositAmount || 0));
    if (depositAmount > 0) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Deposit Required: ${formatCurrency(depositAmount)} (${quote.depositPercent}%)`, margin, y);
      y += 10;
    }

    doc.setFontSize(7);
    doc.setTextColor(100);
    doc.text("This payment claim is made and served under the applicable Building and Construction Industry Security of Payment Act.", margin, y, { maxWidth: 170 });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="quote-${quote.quoteNumber || quote.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Quote PDF export error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/export/data.csv", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));

    const invoices = await db.select().from(invoicesTable).where(eq(invoicesTable.userId, tradieUser.id));
    const expenses = await db.select().from(expensesTable).where(eq(expensesTable.userId, tradieUser.id));

    const rows: string[] = [];
    rows.push("Type,Date,Description,Amount,GST,Status");

    for (const inv of invoices) {
      rows.push([
        "Invoice",
        inv.createdAt ? new Date(inv.createdAt).toISOString().split("T")[0] : "",
        `Invoice ${inv.invoiceNumber}`,
        inv.total ?? "0",
        inv.gstAmount ?? "0",
        inv.status ?? "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }

    for (const exp of expenses) {
      rows.push([
        "Expense",
        exp.expenseDate ?? "",
        `${exp.category ?? ""} - ${exp.vendor ?? ""}`,
        exp.amount ?? "0",
        exp.gstClaimable ?? "0",
        "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(","));
    }

    const csv = rows.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=tradeledger-export.csv");
    res.send(csv);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "CSV export error");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/export/logbook.pdf", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));

    const trips = await db.select().from(vehicleTripsTable)
      .where(eq(vehicleTripsTable.userId, tradieUser.id))
      .orderBy(vehicleTripsTable.tripDate);

    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Vehicle Logbook", 14, 22);
    doc.setFontSize(10);
    doc.text("Generated by TradeLedger", 14, 30);

    let y = 45;
    doc.setFontSize(9);
    doc.text("Date", 14, y);
    doc.text("From", 50, y);
    doc.text("To", 100, y);
    doc.text("KM", 150, y);
    doc.text("Business", 165, y);
    y += 5;
    doc.line(14, y, 196, y);
    y += 5;

    for (const trip of trips) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(String(trip.tripDate ?? ""), 14, y);
      doc.text(String(trip.startLocation ?? "").substring(0, 20), 50, y);
      doc.text(String(trip.endLocation ?? "").substring(0, 20), 100, y);
      doc.text(String(trip.distanceKm ?? ""), 150, y);
      doc.text(trip.isBusiness ? "Yes" : "No", 165, y);
      y += 7;
    }

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=logbook.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Logbook PDF export error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
