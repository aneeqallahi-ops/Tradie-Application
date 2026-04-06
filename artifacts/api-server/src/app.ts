import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { authMiddleware } from "./middlewares/authMiddleware";
import { BadRequestError } from "./lib/params";

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
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(authMiddleware);

app.use("/api", router);

if (process.env.NODE_ENV === "production") {
  const staticDir = path.resolve(__dirname, "../../tradeledger-v2/dist/public");
  app.use(express.static(staticDir));
  app.get("*", (_req: Request, res: Response) => {
    res.sendFile(path.join(staticDir, "index.html"));
  });
}

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof BadRequestError) {
    res.status(400).json({ error: err.message });
    return;
  }
  res.status(500).json({ error: "Internal server error" });
});

export default app;
