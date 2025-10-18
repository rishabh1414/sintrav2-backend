import { Router } from "express";
import { Employee } from "../models/Employee";
import { authGuardStrict } from "../middleware/authGuardStrict"; // you already use this
import { getWorkspaceId } from "../utils/workspace"; // you added this

export const employeesRouter = Router();

/**
 * GET /api/employees?page=1&limit=50
 * List employees for the current workspace
 */
employeesRouter.get("/", authGuardStrict, async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Employee.find({ workspaceId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Employee.countDocuments({ workspaceId }),
    ]);

    res.json({ items, total, page, limit });
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to load employees" });
  }
});

/**
 * GET /api/employees/:id
 * Fetch a single employee by Mongo _id (scoped to workspace)
 */
employeesRouter.get("/:id", authGuardStrict, async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params;
    const emp = await Employee.findOne({ _id: id, workspaceId });
    if (!emp) return res.status(404).json({ error: "Employee not found" });
    res.json(emp);
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? "Failed to load employee" });
  }
});

/**
 * POST /api/employees
 * Create a new employee in the current workspace
 * Body:
 * {
 *   key: string (unique),
 *   name: string,
 *   role: string,
 *   description?: string,
 *   avatarUrl?: string,
 *   systemPrompt?: string,
 *   capabilities?: string[],
 *   tools?: string[],
 *   theme?: { from?: string; to?: string; text?: string }
 * }
 */
employeesRouter.post("/", authGuardStrict, async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);

    const {
      key,
      name,
      role,
      description,
      avatarUrl,
      systemPrompt,
      capabilities,
      tools,
      theme,
      enabled,
    } = req.body ?? {};

    // Minimal validation
    if (!key || !name || !role) {
      return res.status(400).json({ error: "key, name and role are required" });
    }

    // Enforce uniqueness per workspace (your schema has unique on key globally;
    // this extra check makes nicer errors scoped to workspace)
    const existing = await Employee.findOne({ workspaceId, key });
    if (existing) {
      return res
        .status(409)
        .json({ error: `Employee with key "${key}" already exists` });
    }

    const doc = await Employee.create({
      workspaceId,
      key,
      name,
      role,
      description,
      avatarUrl,
      systemPrompt:
        systemPrompt ??
        "You are an AI employee. Respond helpfully based on your role.",
      capabilities: Array.isArray(capabilities) ? capabilities : [],
      tools: Array.isArray(tools) ? tools : [],
      theme,
      enabled: typeof enabled === "boolean" ? enabled : true,
    });

    res.status(201).json(doc);
  } catch (err: any) {
    // Handle Mongo duplicate key nicely
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "Duplicate key. 'key' must be unique." });
    }
    res
      .status(500)
      .json({ error: err?.message ?? "Failed to create employee" });
  }
});
