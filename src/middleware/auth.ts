import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";

/**
 * Extracts Bearer token, verifies it, sets req.userId
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    const payload = AuthService.verifyToken(token);
    (req as any).userId = payload.uid;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * Optional: attach userId if present, but don’t fail
 */
export function maybeAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (token) {
      const payload = AuthService.verifyToken(token);
      (req as any).userId = payload.uid;
    }
  } catch {
    // ignore
  }
  next();
}
