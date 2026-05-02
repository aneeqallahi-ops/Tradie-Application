import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import meRouter from "./me";
import dashboardRouter from "./dashboard";
import clientsRouter from "./clients";
import quotesRouter from "./quotes";
import jobsRouter from "./jobs";
import invoicesRouter from "./invoices";
import expensesRouter from "./expenses";
import logbookRouter from "./logbook";
import subcontractorsRouter from "./subcontractors";
import settingsRouter from "./settings";
import notificationsRouter from "./notifications";
import uploadsRouter from "./uploads";
import exportRouter from "./export";
import taxRouter from "./tax";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(meRouter);
router.use(dashboardRouter);
router.use(clientsRouter);
router.use(quotesRouter);
router.use(jobsRouter);
router.use(invoicesRouter);
router.use(expensesRouter);
router.use(logbookRouter);
router.use(subcontractorsRouter);
router.use(settingsRouter);
router.use(notificationsRouter);
router.use(uploadsRouter);
router.use(exportRouter);
router.use(taxRouter);

export default router;
