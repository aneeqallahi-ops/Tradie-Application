import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db, clientsTable, jobsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";

const router: IRouter = Router();

router.get("/clients", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const clients = await db
      .select()
      .from(clientsTable)
      .where(eq(clientsTable.userId, tradieUser.id))
      .orderBy(clientsTable.name);
    res.json(clients);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get clients");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/clients", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { name, type, email, phone, address, abn } = req.body;
    const [client] = await db
      .insert(clientsTable)
      .values({ userId: tradieUser.id, name, type, email, phone, address, abn })
      .returning();
    res.status(201).json(client);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to create client");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/clients/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const clientId = parseId(req.params.id);
    const [client] = await db
      .select()
      .from(clientsTable)
      .where(and(eq(clientsTable.id, clientId), eq(clientsTable.userId, tradieUser.id)));
    if (!client) { res.status(404).json({ error: "Not found" }); return; }
    const jobs = await db
      .select()
      .from(jobsTable)
      .where(and(eq(jobsTable.clientId, clientId), eq(jobsTable.userId, tradieUser.id)));
    res.json({ ...client, jobs });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get client");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/clients/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { name, type, email, phone, address, abn } = req.body;
    const [updated] = await db
      .update(clientsTable)
      .set({ name, type, email, phone, address, abn })
      .where(and(eq(clientsTable.id, parseId(req.params.id)), eq(clientsTable.userId, tradieUser.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to update client");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/clients/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    await db
      .delete(clientsTable)
      .where(and(eq(clientsTable.id, parseId(req.params.id)), eq(clientsTable.userId, tradieUser.id)));
    res.json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to delete client");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
