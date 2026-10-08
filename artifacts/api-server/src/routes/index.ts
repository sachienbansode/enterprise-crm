import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAdmin, requireSuperAdmin } from "../lib/session";
import healthRouter from "./health";
import authRouter from "./auth";
import clientsRouter from "./clients";
import serviceRequestsRouter from "./service-requests";
import slaConfigRouter from "./sla-config";
import documentsRouter from "./documents";
import usersRouter from "./users";
import aiRouter from "./ai";
import adminRouter from "./admin";
import leadsRouter from "./leads";
import dealsRouter from "./deals";
import dashboardRouter from "./dashboard";
import teamsRouter from "./teams";
import notificationsRouter from "./notifications";
import workflowsRouter from "./workflows";
import configRouter from "./config";
import piiMaskingRouter from "./pii-masking";
import auditRouter from "./audit";
import systemStatusRouter from "./system-status";
import activityRouter from "./activity";

const router: IRouter = Router();

// ── Role guards (every route already requires a signed-in session — see app.ts) ──
// Reads are open to signed-in users unless sensitive; changes to configuration need an admin.
const adminForWrites = (req: Request, res: Response, next: NextFunction) =>
  req.method === "GET" ? next() : requireAdmin(req, res, next);
const adminArea = (req: Request, res: Response, next: NextFunction) => {
  if (/^\/m365-config|^\/test-|^\/send-test/.test(req.path)) return requireSuperAdmin(req, res, next);
  if (req.method === "GET" && /^\/(verticals-config|user-roles|users)\b/.test(req.path)) return next();
  return requireAdmin(req, res, next);
};

// Per-user data: callers can only act as themselves (the browser used to pass any email / userId)
const setQuery = (req: Request, patch: Record<string, string>) =>
  Object.defineProperty(req, "query", { value: { ...req.query, ...patch }, writable: true, configurable: true });
const ownCalendarOnly = (req: Request, _res: Response, next: NextFunction) => {
  if ((req.user?.role || "").toLowerCase() !== "super admin") {
    setQuery(req, { email: req.user!.email });
    if (req.body && typeof req.body === "object" && "organizerEmail" in req.body) req.body.organizerEmail = req.user!.email;
  }
  next();
};
const ownNotificationsOnly = (req: Request, _res: Response, next: NextFunction) => {
  setQuery(req, { userId: req.user!.id });
  if (req.body && typeof req.body === "object" && "userId" in req.body) req.body.userId = req.user!.id;
  next();
};

const aiArea = (req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith("/config/reveal")) return requireSuperAdmin(req, res, next);
  if (req.path === "/config" && req.method !== "GET") return requireAdmin(req, res, next);
  if (req.path.startsWith("/logs")) return requireAdmin(req, res, next);
  return next();
};


router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/clients", clientsRouter);
router.use("/service-requests", serviceRequestsRouter);
router.use("/sla-config", adminForWrites, slaConfigRouter);
router.use("/documents", documentsRouter);
router.use("/users", adminForWrites, usersRouter);
router.use("/ai", aiArea, aiRouter);
router.use("/admin", adminArea, adminRouter);
router.use("/leads", leadsRouter);
router.use("/deals", dealsRouter);
router.use("/dashboard", dashboardRouter);
router.use("/teams", ownCalendarOnly, teamsRouter);
router.use("/notifications", ownNotificationsOnly, notificationsRouter);
router.use("/workflows", workflowsRouter);
router.use("/config", adminForWrites, configRouter);
router.use("/pii-masking", adminForWrites, piiMaskingRouter);
router.use("/audit-logs", requireAdmin, auditRouter);
router.use("/system-status", requireAdmin, systemStatusRouter);
router.use("/activity", activityRouter);

export default router;
