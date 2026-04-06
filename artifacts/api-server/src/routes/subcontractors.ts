import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db } from "@workspace/db";
import { subcontractorsTable, subcontractorPaymentsTable } from "@workspace/db";
import { eq, and, sum } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { getFinancialYear } from "../lib/calculations";

const router: IRouter = Router();

router.get("/subcontractors", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const subs = await db
      .select()
      .from(subcontractorsTable)
      .where(eq(subcontractorsTable.userId, tradieUser.id))
      .orderBy(subcontractorsTable.name);
    res.json(subs);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get subcontractors");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/subcontractors", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { name, abn, address, email, phone } = req.body;
    const [sub] = await db
      .insert(subcontractorsTable)
      .values({ userId: tradieUser.id, name, abn, address, email, phone })
      .returning();
    res.status(201).json(sub);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to create subcontractor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/subcontractors/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { name, abn, address, email, phone } = req.body;
    const [updated] = await db
      .update(subcontractorsTable)
      .set({ name, abn, address, email, phone })
      .where(and(eq(subcontractorsTable.id, parseId(req.params.id)), eq(subcontractorsTable.userId, tradieUser.id)))
      .returning();
    if (!updated) { res.status(404).json({ error: "Not found" }); return; }
    res.json(updated);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to update subcontractor");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/subcontractors/tpar", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const currentFY = getFinancialYear(new Date());

    const subs = await db
      .select()
      .from(subcontractorsTable)
      .where(eq(subcontractorsTable.userId, tradieUser.id));

    const [totalResult] = await db
      .select({ total: sum(subcontractorPaymentsTable.amount) })
      .from(subcontractorPaymentsTable)
      .leftJoin(subcontractorsTable, eq(subcontractorPaymentsTable.subcontractorId, subcontractorsTable.id))
      .where(
        and(
          eq(subcontractorsTable.userId, tradieUser.id),
          eq(subcontractorPaymentsTable.financialYear, currentFY),
        ),
      );

    res.json({
      subcontractors: subs,
      totalPaidThisFY: parseFloat(totalResult.total ?? "0"),
      financialYear: currentFY,
      tparDueDate: "28 August",
    });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get TPAR summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
