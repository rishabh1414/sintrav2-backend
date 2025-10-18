import { Router } from "express";
import { nanoid } from "nanoid";
import { WorkspaceModel } from "../models/Workspace";
import { MembershipModel } from "../models/Membership";
import { requireAuth } from "../middleware/auth";

export const workspacesRouter = Router();

/**
 * GET /api/workspaces
 * List workspaces the current user belongs to
 */
workspacesRouter.get("/", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const memberships = await MembershipModel.find({ userId }).lean();
    const ids = memberships.map((m) => m.workspaceId);

    const workspaces = await WorkspaceModel.find({ _id: { $in: ids } }).lean();
    res.json({ items: workspaces });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/workspaces
 * Create a new workspace (the current user becomes owner)
 */
workspacesRouter.post("/", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Name is required" });

    const id = nanoid(10);
    const slug = `${name}-${id}`.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const workspace = await WorkspaceModel.create({
      _id: id,
      name,
      slug,
      ownerId: userId,
      plan: { tier: "free", helpersAllowed: 5, powerupsAllowed: 20 },
      settings: {},
    });

    await MembershipModel.create({
      _id: nanoid(12),
      userId,
      workspaceId: workspace._id,
      role: "OWNER",
    });

    res.status(201).json({ workspace });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/workspaces/:id
 * Get details of a single workspace
 */
workspacesRouter.get("/:id", requireAuth, async (req, res, next) => {
  try {
    const ws = await WorkspaceModel.findById(req.params.id).lean();
    if (!ws) return res.status(404).json({ error: "Workspace not found" });
    res.json(ws);
  } catch (err) {
    next(err);
  }
});
