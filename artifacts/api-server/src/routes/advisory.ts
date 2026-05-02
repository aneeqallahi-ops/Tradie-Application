import { Router, type IRouter, type Request, type Response } from "express";
import { db, advisoryRequestsTable, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
const router: IRouter = Router();

const VALID_URGENCY = ["this_week", "this_month", "no_rush"] as const;
const VALID_SOURCE = ["manual", "tax_position", "benchmark_alert", "strategy_engine", "deductible_prompt"] as const;
type Urgency = typeof VALID_URGENCY[number];
type SourceModule = typeof VALID_SOURCE[number];

router.get("/advisory/requests", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const requests = await db
      .select()
      .from(advisoryRequestsTable)
      .where(eq(advisoryRequestsTable.userId, tradieUser.id))
      .orderBy(desc(advisoryRequestsTable.createdAt));
    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Failed to get advisory requests");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/advisory/requests", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const body = req.body as Record<string, unknown>;

    const serviceType = typeof body.serviceType === "string" && body.serviceType.length > 0 ? body.serviceType.slice(0, 100) : null;
    if (!serviceType) {
      res.status(400).json({ error: "serviceType is required" });
      return;
    }
    const currentIncome = typeof body.currentIncome === "number" && body.currentIncome >= 0 ? body.currentIncome : null;
    const helpNeeded = typeof body.helpNeeded === "string" ? body.helpNeeded.slice(0, 2000) : null;
    const urgency: Urgency = VALID_URGENCY.includes(body.urgency as Urgency) ? (body.urgency as Urgency) : "no_rush";
    const sourceModule: SourceModule = VALID_SOURCE.includes(body.sourceModule as SourceModule) ? (body.sourceModule as SourceModule) : "manual";

    const [created] = await db
      .insert(advisoryRequestsTable)
      .values({
        userId: tradieUser.id,
        serviceType,
        currentIncome: currentIncome != null ? String(currentIncome) : null,
        helpNeeded: helpNeeded ?? null,
        urgency,
        status: "pending",
        sourceModule,
      })
      .returning();

    db.insert(notificationsTable)
      .values({
        userId: tradieUser.id,
        type: "Advisory Request",
        message: "We've received your request — a specialist will be in touch within 1 business day.",
        isRead: false,
        actionUrl: "/advisory",
      })
      .catch(err => req.log.warn({ err }, "Failed to create advisory notification"));

    res.status(201).json({ request: created });
  } catch (err) {
    req.log.error({ err }, "Failed to create advisory request");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
