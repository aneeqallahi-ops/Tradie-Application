import { Router, type IRouter, type Request, type Response } from "express";
import { db, tradieUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";

const router: IRouter = Router();

router.get("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    res.json(tradieUser);
  } catch (err) {
    req.log.error({ err }, "Failed to get settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put("/settings", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const {
      businessName, abn, gstRegistered, state, email, phone,
      hourlyRate, defaultMarkupPercent, profitFirstTaxPercent,
      profitFirstExpensesPercent, logoUrl, tradeType, annualTurnoverBand
    } = req.body;

    const [updated] = await db
      .update(tradieUsersTable)
      .set({
        businessName, abn, gstRegistered, state, email, phone,
        hourlyRate, defaultMarkupPercent, profitFirstTaxPercent,
        profitFirstExpensesPercent, logoUrl, tradeType, annualTurnoverBand,
      })
      .where(eq(tradieUsersTable.id, tradieUser.id))
      .returning();

    res.json(updated);
  } catch (err) {
    req.log.error({ err }, "Failed to update settings");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
