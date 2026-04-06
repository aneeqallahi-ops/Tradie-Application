import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db, notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";

const router: IRouter = Router();

router.get("/notifications", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const notifications = await db
      .select()
      .from(notificationsTable)
      .where(eq(notificationsTable.userId, tradieUser.id))
      .orderBy(desc(notificationsTable.createdAt));
    res.json(notifications);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get notifications");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notifications/read-all", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(eq(notificationsTable.userId, tradieUser.id));
    res.json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to mark all notifications read");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/notifications/:id/read", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [updated] = await db
      .update(notificationsTable)
      .set({ isRead: true })
      .where(and(
        eq(notificationsTable.id, parseId(req.params.id)),
        eq(notificationsTable.userId, tradieUser.id)
      ))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to mark notification read");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
