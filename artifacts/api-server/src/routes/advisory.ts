import { Router, type IRouter, type Request, type Response } from "express";
import { db, advisoryRequestsTable, notificationsTable, tradieUsersTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { requireAdvisoryAdmin, isAdvisoryAdmin } from "../middlewares/requireAdvisoryAdmin";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { parseId, BadRequestError } from "../lib/params";
const router: IRouter = Router();

const VALID_URGENCY = ["this_week", "this_month", "no_rush"] as const;
const VALID_SOURCE = ["manual", "tax_position", "benchmark_alert", "strategy_engine", "deductible_prompt"] as const;
const VALID_STATUS = ["pending", "in_progress", "completed"] as const;
type Urgency = typeof VALID_URGENCY[number];
type SourceModule = typeof VALID_SOURCE[number];
type AdvisoryStatus = typeof VALID_STATUS[number];

const STATUS_NOTIFICATION: Record<AdvisoryStatus, string> = {
  pending: "Your advisory request is pending review.",
  in_progress: "A specialist has started working on your advisory request.",
  completed: "Your advisory request has been marked complete.",
};

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

// Admin: lightweight check so the frontend knows whether to surface the admin tools
router.get("/advisory/admin/me", requireAuth, async (req: Request, res: Response) => {
  const replitUserId = getReplitUserId(req);
  res.json({ isAdmin: isAdvisoryAdmin(replitUserId) });
});

// Admin: list every advisory request across all tradie users
router.get("/advisory/admin/requests", requireAdvisoryAdmin, async (req: Request, res: Response) => {
  try {
    const rows = await db
      .select({
        request: advisoryRequestsTable,
        owner: {
          id: tradieUsersTable.id,
          businessName: tradieUsersTable.businessName,
          email: tradieUsersTable.email,
        },
      })
      .from(advisoryRequestsTable)
      .leftJoin(tradieUsersTable, eq(advisoryRequestsTable.userId, tradieUsersTable.id))
      .orderBy(desc(advisoryRequestsTable.createdAt));

    const requests = rows.map(r => ({ ...r.request, owner: r.owner }));
    res.json({ requests });
  } catch (err) {
    req.log.error({ err }, "Failed to list all advisory requests");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Admin: update the status of any advisory request and notify the owner
router.patch("/advisory/requests/:id/status", requireAdvisoryAdmin, async (req: Request, res: Response) => {
  try {
    const requestId = parseId(req.params.id);
    const body = req.body as Record<string, unknown>;

    if (!VALID_STATUS.includes(body.status as AdvisoryStatus)) {
      res.status(400).json({ error: `status must be one of: ${VALID_STATUS.join(", ")}` });
      return;
    }
    const status = body.status as AdvisoryStatus;

    const [updated] = await db
      .update(advisoryRequestsTable)
      .set({ status })
      .where(eq(advisoryRequestsTable.id, requestId))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Advisory request not found" });
      return;
    }

    if (updated.userId != null) {
      db.insert(notificationsTable)
        .values({
          userId: updated.userId,
          type: "Advisory Update",
          message: STATUS_NOTIFICATION[status],
          isRead: false,
          actionUrl: "/advisory",
        })
        .catch(err => req.log.warn({ err }, "Failed to create advisory status notification"));
    }

    res.json({ request: updated });
  } catch (err) {
    if (err instanceof BadRequestError) {
      res.status(400).json({ error: err.message });
      return;
    }
    req.log.error({ err }, "Failed to update advisory request status");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
