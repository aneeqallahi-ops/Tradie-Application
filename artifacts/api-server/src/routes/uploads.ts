import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { requireAuth } from "../middlewares/requireAuth";
import { getReplitUserId } from "./me";

const router: IRouter = Router();

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const userId = (req.user as { id?: string } | undefined)?.id ?? "anonymous";
    const userDir = path.join(uploadsDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `receipt_${crypto.randomBytes(16).toString("hex")}${ext}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Invalid file type. Allowed: jpg, png, webp, heic, pdf"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post("/uploads/receipt", requireAuth, upload.single("receipt"), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const replitUserId = getReplitUserId(req);
  const baseUrl = process.env.REPLIT_DEV_DOMAIN
    ? `https://${process.env.REPLIT_DEV_DOMAIN}`
    : `http://localhost:${process.env.PORT || 3000}`;
  const fileUrl = `${baseUrl}/api/uploads/${encodeURIComponent(replitUserId)}/${req.file.filename}`;
  res.json({ fileUrl, filename: req.file.filename });
});

router.get("/uploads/:userId/:filename", requireAuth, (req: Request, res: Response) => {
  const replitUserId = getReplitUserId(req);
  const requestedUserId = decodeURIComponent(String(req.params.userId));

  if (requestedUserId !== replitUserId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const filename = path.basename(String(req.params.filename));
  if (!filename.startsWith("receipt_")) {
    res.status(403).json({ error: "Access denied" });
    return;
  }

  const filePath = path.join(uploadsDir, requestedUserId, filename);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }
  res.sendFile(filePath);
});

export default router;
