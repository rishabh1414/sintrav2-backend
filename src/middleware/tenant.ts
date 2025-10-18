import type { Request, Response, NextFunction } from "express";
import { MembershipModel } from "../models/Membership";

/**
 * Tenant middleware
 * Reads `x-workspace-id` header (or query param `workspaceId`)
 * Verifies the user belongs to that workspace
 * Attaches `req.workspaceId` and `req.membership`
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const workspaceId =
      (req.headers["x-workspace-id"] as string) ||
      (req.query.workspaceId as string) ||
      null;

    if (!workspaceId) {
      return res.status(400).json({ error: "Missing workspaceId" });
    }

    // In production, you’d get userId from JWT/session
    const userId = (req as any).userId;
    if (!userId) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const membership = await MembershipModel.findOne({ workspaceId, userId });
    if (!membership) {
      return res
        .status(403)
        .json({ error: "Access denied for this workspace" });
    }

    (req as any).workspaceId = workspaceId;
    (req as any).membership = membership;
    next();
  } catch (err) {
    next(err);
  }
}
