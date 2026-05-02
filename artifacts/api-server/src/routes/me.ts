import { Router, type IRouter, type Request, type Response } from "express";
import { db, tradieUsersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";

const router: IRouter = Router();

export function getReplitUserId(req: Request): string {
  const user = req.user as { id: string } | undefined;
  return user?.id ?? "";
}

async function getOrCreateTradieUser(replitUserId: string) {
  const existing = await db
    .select()
    .from(tradieUsersTable)
    .where(eq(tradieUsersTable.replitUserId, replitUserId))
    .limit(1);

  if (existing.length > 0) return existing[0];

  const [newUser] = await db
    .insert(tradieUsersTable)
    .values({ replitUserId, onboardingComplete: false })
    .returning();
  return newUser;
}

router.get("/auth/me", requireAuth, async (req: Request, res: Response) => {
  try {
    const replitUserId = getReplitUserId(req);
    const tradieUser = await getOrCreateTradieUser(replitUserId);
    res.json({
      user: tradieUser,
      needsOnboarding: !tradieUser.onboardingComplete,
    });
  } catch (err) {
    req.log.error({ err }, "Failed to get user");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/auth/onboard", requireAuth, async (req: Request, res: Response) => {
  try {
    const replitUserId = getReplitUserId(req);
    const tradieUser = await getOrCreateTradieUser(replitUserId);
    const {
      businessName, abn, gstRegistered, state, email, phone,
      hourlyRate, defaultMarkupPercent, profitFirstTaxPercent, profitFirstExpensesPercent,
      tradeType, annualTurnoverBand
    } = req.body;

    const [updated] = await db
      .update(tradieUsersTable)
      .set({
        businessName, abn, gstRegistered, state, email, phone,
        hourlyRate, defaultMarkupPercent, profitFirstTaxPercent, profitFirstExpensesPercent,
        tradeType, annualTurnoverBand,
        onboardingComplete: true,
      })
      .where(eq(tradieUsersTable.id, tradieUser.id))
      .returning();

    res.json({ user: updated, needsOnboarding: false });
  } catch (err) {
    req.log.error({ err }, "Failed to onboard user");
    res.status(500).json({ error: "Internal server error" });
  }
});

export { getOrCreateTradieUser };
export default router;
