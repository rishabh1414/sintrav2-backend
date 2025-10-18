import { Router, Request, Response } from "express";
import { Employee } from "../models/Employee";

export const employeesRouter = Router();

function getWorkspaceId(req: Request) {
  const ws = req.header("x-workspace-id");
  if (!ws)
    throw Object.assign(new Error("Missing workspaceId"), { status: 400 });
  return ws;
}

// GET /api/employees?page=1&limit=50
employeesRouter.get("/", async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const page = Math.max(parseInt(String(req.query.page ?? 1), 10), 1);
    const limit = Math.min(
      Math.max(parseInt(String(req.query.limit ?? 20), 10), 1),
      100
    );

    const [items, total] = await Promise.all([
      Employee.find({ workspaceId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit),
      Employee.countDocuments({ workspaceId }),
    ]);

    res.json({ items, total, page, limit });
  } catch (err: any) {
    res
      .status(err?.status || 500)
      .json({ error: err?.message || "Failed to list employees" });
  }
});

// GET /api/employees/:id
employeesRouter.get("/:id", async (req, res) => {
  try {
    const workspaceId = getWorkspaceId(req);
    const { id } = req.params;

    const emp = await Employee.findOne({ _id: id, workspaceId });
    if (!emp) return res.status(404).json({ error: "Employee not found" });

    res.json(emp);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to load employee" });
  }
});
