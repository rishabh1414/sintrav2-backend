import { Request } from "express";

/**
 * Pulls workspace id from header `x-workspace-id`.
 * Falls back to req.user?.workspaceId if you attach it in auth.
 */
export function getWorkspaceId(req: Request): string | null {
  const fromHeader = (
    req.headers["x-workspace-id"] as string | undefined
  )?.trim();
  if (fromHeader) return fromHeader;

  const fromUser = (req as any).user?.workspaceId as string | undefined;
  return fromUser?.trim() || null;
}
