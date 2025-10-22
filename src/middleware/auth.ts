// src/middlewares/auth.ts
import type { Request, Response, NextFunction } from "express";
import { AuthService } from "../services/auth.service";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [, token] = header.split(" ");
    if (!token) return res.status(401).json({ error: "Missing Bearer token" });

    const payload = AuthService.verifyToken(token); // must decode to { uid: string }
    (req as any).userId = payload.uid; // <— set userId
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

export function maybeAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const header = req.headers.authorization || "";
    const [scheme, token] = header.split(" ");
    if (scheme?.toLowerCase() === "bearer" && token) {
      const payload = AuthService.verifyToken(token);
      (req as any).userId = payload.uid;
      (req as any).user = { id: payload.uid };
    }
  } catch {
    // ignore
  }
  next();
}
