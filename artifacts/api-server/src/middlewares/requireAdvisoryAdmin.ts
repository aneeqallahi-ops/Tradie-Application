import { type Request, type Response, type NextFunction } from "express";

function getAdminUserIds(): Set<string> {
  const raw = process.env.ADVISORY_ADMIN_USER_IDS ?? "";
  return new Set(
    raw
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0),
  );
}

export function isAdvisoryAdmin(replitUserId: string | undefined): boolean {
  if (!replitUserId) return false;
  return getAdminUserIds().has(replitUserId);
}

export function requireAdvisoryAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const user = req.user as { id?: string } | undefined;
  if (!isAdvisoryAdmin(user?.id)) {
    res.status(403).json({ error: "Advisory admin access required" });
    return;
  }
  next();
}
