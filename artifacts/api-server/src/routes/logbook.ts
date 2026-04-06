import { Router, type IRouter, type Request, type Response } from "express";
import { parseId, BadRequestError } from "../lib/params";
import { db } from "@workspace/db";
import { vehicleTripsTable, tradieUsersTable } from "@workspace/db";
import { eq, and, sum, count, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/requireAuth";
import { getOrCreateTradieUser, getReplitUserId } from "./me";
import { ATO_KM_RATE, getFinancialYearRange, calculateAustralianIncomeTax } from "../lib/calculations";

const router: IRouter = Router();

const LOGBOOK_WEEKS = 12;

router.get("/logbook", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const [user] = await db
      .select({
        vehicleMake: tradieUsersTable.vehicleMake,
        vehicleModel: tradieUsersTable.vehicleModel,
        vehicleOdometer: tradieUsersTable.vehicleOdometer,
        logbookStartDate: tradieUsersTable.logbookStartDate,
      })
      .from(tradieUsersTable)
      .where(eq(tradieUsersTable.id, tradieUser.id));

    const active = !!(user?.vehicleMake && user?.logbookStartDate);

    let weekNumber: number | null = null;
    let daysRemaining: number | null = null;
    if (active && user?.logbookStartDate) {
      const start = new Date(user.logbookStartDate);
      const daysDiff = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
      weekNumber = Math.min(LOGBOOK_WEEKS, Math.floor(daysDiff / 7) + 1);
      daysRemaining = Math.max(0, LOGBOOK_WEEKS * 7 - daysDiff);
    }

    let tripsThisWeek = 0;
    if (active) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekStartStr = weekStart.toISOString().split("T")[0];
      const [tripCount] = await db
        .select({ count: count() })
        .from(vehicleTripsTable)
        .where(and(
          eq(vehicleTripsTable.userId, tradieUser.id),
          sql`${vehicleTripsTable.tripDate} >= ${weekStartStr}`
        ));
      tripsThisWeek = Number(tripCount?.count ?? 0);
    }

    res.json({
      active,
      startDate: user?.logbookStartDate ?? null,
      vehicleMake: user?.vehicleMake ?? null,
      vehicleModel: user?.vehicleModel ?? null,
      odometerStart: user?.vehicleOdometer ? parseFloat(user.vehicleOdometer) : null,
      weekNumber,
      daysRemaining,
      tripsThisWeek,
    });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get logbook");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logbook/setup", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { vehicleMake, vehicleModel, odometerStart } = req.body;
    const startDate = new Date().toISOString().split("T")[0];

    await db
      .update(tradieUsersTable)
      .set({
        vehicleMake,
        vehicleModel,
        vehicleOdometer: String(parseFloat(odometerStart ?? "0")),
        logbookStartDate: startDate,
      })
      .where(eq(tradieUsersTable.id, tradieUser.id));

    res.json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to setup logbook");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/logbook/trips", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const trips = await db
      .select()
      .from(vehicleTripsTable)
      .where(eq(vehicleTripsTable.userId, tradieUser.id))
      .orderBy(sql`${vehicleTripsTable.tripDate} DESC`);
    res.json(trips);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get trips");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/logbook/trips", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { tripDate, startLocation, endLocation, distanceKm, purpose, jobId, isBusiness, notes } = req.body;
    const [trip] = await db
      .insert(vehicleTripsTable)
      .values({
        userId: tradieUser.id,
        tripDate: tripDate || new Date().toISOString().split("T")[0],
        startLocation, endLocation,
        distanceKm: distanceKm.toString(),
        purpose: purpose || "job_site",
        jobId: jobId ? parseInt(jobId) : null,
        isBusiness: isBusiness !== false,
        notes,
      })
      .returning();
    res.status(201).json(trip);
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to log trip");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.delete("/logbook/trips/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    await db
      .delete(vehicleTripsTable)
      .where(and(eq(vehicleTripsTable.id, parseId(req.params.id)), eq(vehicleTripsTable.userId, tradieUser.id)));
    res.json({ success: true });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to delete trip");
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/logbook/summary", requireAuth, async (req: Request, res: Response) => {
  try {
    const tradieUser = await getOrCreateTradieUser(getReplitUserId(req));
    const { start: fyStart, end: fyEnd } = getFinancialYearRange();

    const [user] = await db
      .select({ logbookStartDate: tradieUsersTable.logbookStartDate })
      .from(tradieUsersTable)
      .where(eq(tradieUsersTable.id, tradieUser.id));

    const [result] = await db
      .select({
        totalKm: sum(vehicleTripsTable.distanceKm),
        businessKm: sum(
          sql`CASE WHEN ${vehicleTripsTable.isBusiness} THEN ${vehicleTripsTable.distanceKm} ELSE 0 END`
        ),
        totalTrips: count(),
      })
      .from(vehicleTripsTable)
      .where(and(
        eq(vehicleTripsTable.userId, tradieUser.id),
        sql`${vehicleTripsTable.tripDate} >= ${fyStart.toISOString().split("T")[0]}`,
        sql`${vehicleTripsTable.tripDate} <= ${fyEnd.toISOString().split("T")[0]}`
      ));

    let weekNumber = 1;
    let weeksRemaining = LOGBOOK_WEEKS;
    let daysRemaining = LOGBOOK_WEEKS * 7;
    let fyDaysElapsed = 1;
    if (user?.logbookStartDate) {
      const start = new Date(user.logbookStartDate);
      const daysDiff = Math.floor((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24));
      weekNumber = Math.min(LOGBOOK_WEEKS, Math.floor(daysDiff / 7) + 1);
      daysRemaining = Math.max(0, LOGBOOK_WEEKS * 7 - daysDiff);
      weeksRemaining = Math.max(0, LOGBOOK_WEEKS - weekNumber);
      fyDaysElapsed = Math.max(1, daysDiff);
    }

    const totalKm = parseFloat(result.totalKm ?? "0");
    const businessKm = parseFloat(result.businessKm ?? "0");
    const businessPercent = totalKm > 0 ? (businessKm / totalKm) * 100 : 0;
    const actualDeduction = businessKm * ATO_KM_RATE;
    const dailyKmRate = businessKm / fyDaysElapsed;
    const projectedAnnualDeduction = dailyKmRate * 365 * ATO_KM_RATE;

    const taxable = 80000;
    const { totalTax: withDeduction } = calculateAustralianIncomeTax(Math.max(0, taxable - actualDeduction));
    const { totalTax: withoutDeduction } = calculateAustralianIncomeTax(taxable);
    const estimatedTaxSaving = withoutDeduction - withDeduction;

    const trips = await db
      .select()
      .from(vehicleTripsTable)
      .where(and(
        eq(vehicleTripsTable.userId, tradieUser.id),
        sql`${vehicleTripsTable.tripDate} >= ${fyStart.toISOString().split("T")[0]}`,
        sql`${vehicleTripsTable.tripDate} <= ${fyEnd.toISOString().split("T")[0]}`
      ))
      .orderBy(sql`${vehicleTripsTable.tripDate} DESC`)
      .limit(50);

    res.json({
      totalKm, businessKm, businessPercent: Math.round(businessPercent),
      projectedAnnualDeduction,
      estimatedTaxSaving,
      trips,
      weekNumber, weeksRemaining, daysRemaining,
      logbookComplete: weekNumber >= LOGBOOK_WEEKS,
    });
  } catch (err) {
    if (err instanceof BadRequestError) throw err;
    req.log.error({ err }, "Failed to get logbook summary");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
