import { Router } from "express";
import { askED } from "../services/ed.service";
import { MessageModel } from "../models/Message";
import { Employee } from "../models/Employee";

export const agentsRouter = Router();

// 💬 ED Chat Route
agentsRouter.post("/ed/ask", async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    const { chatEmployeeId, userText } = req.body;

    if (!workspaceId || !chatEmployeeId || !userText) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Save user message
    await MessageModel.create({
      workspaceId,
      employeeId: chatEmployeeId,
      sender: "user",
      text: userText,
      ts: Date.now(),
    });

    // Route through ED
    const edResponse = await askED({ workspaceId, chatEmployeeId, userText });

    let routedToName: string | undefined;
    if (edResponse.routedToId) {
      const routedEmp = await Employee.findById(edResponse.routedToId).lean();
      routedToName = routedEmp?.name;
    }

    // Save agent reply
    const agentMsg = await MessageModel.create({
      workspaceId,
      employeeId: chatEmployeeId,
      sender: "agent",
      text: edResponse.message,
      ts: Date.now(),
      routedTo: edResponse.routedToId,
      routedToName,
    });

    return res.json({
      message: agentMsg.text,
      routedToId: edResponse.routedToId,
      routedToName,
    });
  } catch (err) {
    console.error("[ED Ask] ❌", err);
    return res.status(500).json({ error: "ED ask failed" });
  }
});

// 📨 Get Message History
agentsRouter.get("/messages/:employeeId", async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    const { employeeId } = req.params;

    const messages = await MessageModel.find({ workspaceId, employeeId })
      .sort({ ts: 1 })
      .lean();

    res.json(messages);
  } catch (err) {
    console.error("[GET Messages] ❌", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// 👥 Get Employees
agentsRouter.get("/employees", async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    const employees = await Employee.find({ workspaceId }).lean();
    res.json(employees);
  } catch (err) {
    console.error("[GET Employees] ❌", err);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});
