import { Router, Request, Response } from "express";
import { MessageModel } from "../models/Message";
import { getWorkspaceId } from "../utils/workspace";

export const messagesRouter = Router();

// GET /api/messages/:employeeId
messagesRouter.get("/:employeeId", async (req: Request, res: Response) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { employeeId } = req.params;

    if (!workspaceId) {
      return res.status(400).json({ error: "Missing x-workspace-id header" });
    }

    const history = await MessageModel.find({ workspaceId, employeeId })
      .sort({ ts: 1 })
      .lean();

    // Always return an array (even if empty) so the client doesn't break
    return res.json(history);
  } catch (err: any) {
    return res
      .status(500)
      .json({ error: err?.message || "Failed to load messages" });
  }
});
