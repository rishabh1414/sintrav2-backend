import { Router, Request, Response } from "express";
import { MessageModel } from "../models/Message";
import { getWorkspaceId } from "../utils/workspace";
import { requireAuth } from "../middleware/auth";

export const messagesRouter = Router();

// GET /api/messages/:employeeId — load chat for this user+employee
messagesRouter.get("/:employeeId", requireAuth, async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    const chatEmployeeId = req.params.employeeId; // route param
    const userId = (req as any).userId;

    if (!workspaceId || !chatEmployeeId) {
      return res
        .status(400)
        .json({ error: "Missing workspaceId or employeeId" });
    }
    if (!userId) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    const messages = await MessageModel.find({
      workspaceId,
      chatEmployeeId, // <— must match the model field name
      userId, // <— filter by the current user
    })
      .sort({ ts: 1 })
      .lean();

    res.json(messages);
  } catch (err) {
    console.error("[GET Messages] Error:", err);
    res.status(500).json({ error: "Failed to load messages" });
  }
});
