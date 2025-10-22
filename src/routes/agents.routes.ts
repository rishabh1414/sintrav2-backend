// src/routes/agents.routes.ts
import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth"; // ← make sure this sets req.userId
import { MessageModel } from "../models/Message";
import { Employee } from "../models/Employee";
import { askED } from "../services/ed.service";

export const agentsRouter = Router();

/**
 * POST /api/agents/ed/ask
 * Body:
 * {
 *   employeeId?: string,       // preferred
 *   chatEmployeeId?: string,   // legacy alias
 *   userText: string
 * }
 * Headers:
 *   Authorization: Bearer <token>
 *   x-workspace-id: <workspaceId>
 */
agentsRouter.post("/ed/ask", requireAuth, async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    const { chatEmployeeId, userText } = req.body;
    const userId = (req as any).userId;

    if (!workspaceId || !chatEmployeeId || !userText) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (!userId) {
      return res.status(401).json({ error: "Unauthenticated" });
    }

    // 1) store the user’s message scoped by userId
    await MessageModel.create({
      workspaceId,
      chatEmployeeId,
      sender: "user",
      text: userText,
      userId,
      ts: Date.now(),
    });

    // 2) get ED’s response (and potential routing)
    const edResponse = await askED({ workspaceId, chatEmployeeId, userText });

    let routedToId = edResponse.routedToId;
    let routedToName: string | undefined = edResponse.routedToName;

    if (routedToId && !routedToName) {
      const routedEmp = await Employee.findById(routedToId)
        .select("name")
        .lean();
      routedToName = routedEmp?.name;
    }

    // 3) store the agent/system message scoped by userId
    const agentMsg = await MessageModel.create({
      workspaceId,
      chatEmployeeId,
      sender: "agent",
      text: edResponse.message || "(no response)",
      ts: Date.now(),
      routedTo: routedToId,
      routedToName,
      userId, // <— IMPORTANT
    });

    return res.json({
      message: agentMsg.text,
      routedToId,
      routedToName,
    });
  } catch (err) {
    console.error("[ED Ask] Error:", err);
    return res.status(500).json({ error: "ED ask failed" });
  }
});
