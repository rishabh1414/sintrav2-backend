import { Router } from "express";
import OpenAI from "openai";
import { MessageModel } from "../models/Message";
import { Employee } from "../models/Employee";
import { getWorkspaceId } from "../utils/workspace";

export const agentsRouter = Router();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// POST /api/agents/ed/ask
agentsRouter.post("/ed/ask", async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { employeeId, text } = req.body as {
      employeeId?: string;
      text?: string;
    };

    if (!workspaceId) {
      return res.status(400).json({ error: "Missing x-workspace-id header" });
    }
    if (!employeeId || !text?.trim()) {
      return res
        .status(400)
        .json({ error: "employeeId and text are required" });
    }

    // Optional: fetch employee to use their systemPrompt / role
    const employee = await Employee.findOne({
      _id: employeeId,
      workspaceId,
    }).lean();
    if (!employee) return res.status(404).json({ error: "Employee not found" });

    const systemPrompt =
      employee.systemPrompt ||
      "You are a professional AI executive director. Respond concisely and precisely. No headers/footers/greetings.";

    // 1) Persist the USER message right away
    const userMsg = await MessageModel.create({
      workspaceId,
      employeeId,
      sender: "user",
      text: text.trim(),
      ts: Date.now(),
    });

    // 2) Call OpenAI for a professional reply
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `Employee: ${employee.name} (${
            employee.role
          })\nUser request: ${text.trim()}`,
        },
      ],
      temperature: 0.6,
      max_tokens: 600,
    });

    const reply =
      completion.choices?.[0]?.message?.content?.trim() ||
      "I couldn't generate a response.";

    // 3) Persist the AGENT message
    const agentMsg = await MessageModel.create({
      workspaceId,
      employeeId,
      sender: "agent",
      text: reply,
      ts: Date.now(),
    });

    return res.json({
      message: reply,
      saved: { user: userMsg._id, agent: agentMsg._id },
    });
  } catch (err) {
    console.error("❌ ED Agent error:", err);
    const message =
      err instanceof Error ? err.message : "Failed to process agent message";
    return res.status(500).json({ error: message });
  }
});
