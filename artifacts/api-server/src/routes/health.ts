import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { APP_INFO } from "../lib/version";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.set("Cache-Control", "no-store");
  res.json({ ...data, ...APP_INFO });
});

export default router;
