import type { Request, Response, NextFunction } from "express";

/**
 * Check if user has required role in current workspace
 */
export function requireRole(allowedRoles: ("OWNER" | "ADMIN" | "MEMBER")[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const membership = (req as any).membership;
    if (!membership) {
      return res.status(403).json({ error: "Not a workspace member" });
    }
    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
