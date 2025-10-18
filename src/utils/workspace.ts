import { Request } from "express";

/**
 * Extracts the workspace ID from the `x-workspace-id` header.
 * Returns undefined if not provided.
 */
export function getWorkspaceId(req: Request): string | undefined {
  const workspaceId = req.header("x-workspace-id");
  return workspaceId && workspaceId.trim() !== "" ? workspaceId : undefined;
}
