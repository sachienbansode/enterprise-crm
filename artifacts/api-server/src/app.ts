import express, { type Express } from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { requireAuth } from "./lib/session";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.set("trust proxy", "loopback"); // nginx on the same host sets X-Forwarded-*
// Same-origin app: only allow cross-origin calls from origins listed in CORS_ORIGIN
app.use(cors({ origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : false }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Root-level health check — must respond 200 for deployment platform health checks
app.get("/healthz", (_req, res) => res.json({ status: "ok" }));
app.get("/health", (_req, res) => res.json({ status: "ok" }));

// Every /api route requires a valid session except the login flow (see lib/session.ts PUBLIC)
app.use("/api", requireAuth, router);

if (process.env.NODE_ENV === "production") {
  const crmDist = path.resolve(__dirname, "../../crm/dist/public");
  app.use("/crm", express.static(crmDist, { index: "index.html" }));
  app.get("/crm/*splat", (_req, res) => {
    res.sendFile(path.join(crmDist, "index.html"));
  });
  app.get("/", (_req, res) => res.redirect("/crm/"));
}

export default app;
