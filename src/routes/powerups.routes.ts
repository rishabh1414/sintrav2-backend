import { Router, Request, Response, NextFunction } from "express";
import { Powerup, PowerupDoc } from "../models/Powerup";

export const powerupsRouter = Router();

// Minimal role check. Replace with real middleware if you have it.
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req.headers["x-user-role"] as string) || "";
  if (role.toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
}

/**
 * GET /api/powerups
 * List powerups in this workspace.
 */
powerupsRouter.get("/", async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    if (!workspaceId)
      return res.status(400).json({ error: "Missing x-workspace-id" });

    const items = await Powerup.find({ workspaceId }).sort({ name: 1 }).lean();
    res.json(items);
  } catch (err) {
    console.error("[PowerUps] GET error:", err);
    res.status(500).json({ error: "Failed to load powerups" });
  }
});

/**
 * POST /api/powerups
 * Upsert a SINGLE powerup by key.
 * Body: { key, name, description?, employeeCategory?, assignedEmployeeId?, inputs?, systemPrompt?, outputFormat?, active? }
 */
powerupsRouter.post("/", requireAdmin, async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    if (!workspaceId)
      return res.status(400).json({ error: "Missing x-workspace-id" });

    const payload = req.body as Partial<PowerupDoc> & {
      key?: string;
      name?: string;
    };
    if (!payload.key || !payload.name) {
      return res
        .status(400)
        .json({ error: "Missing required fields: key, name" });
    }

    const update = {
      workspaceId,
      name: payload.name,
      description: payload.description ?? "",
      employeeCategory: payload.employeeCategory ?? undefined,
      assignedEmployeeId: payload.assignedEmployeeId ?? null,
      inputs: payload.inputs ?? [],
      systemPrompt: payload.systemPrompt ?? "",
      outputFormat: payload.outputFormat ?? "",
      active: payload.active ?? true,
      createdBy: (req as any).user?.id ?? null,
      updatedAt: new Date(),
    };

    const upserted = await Powerup.findOneAndUpdate(
      { workspaceId, key: payload.key },
      { $set: update },
      { new: true, upsert: true }
    );

    res.json(upserted);
  } catch (err: any) {
    console.error("[PowerUps] POST error:", err);
    if (err?.code === 11000) {
      return res
        .status(409)
        .json({ error: "Duplicate key for this workspace" });
    }
    res.status(500).json({ error: "Failed to upsert powerup" });
  }
});

/**
 * POST /api/powerups/bulk
 * Bulk upsert by key (array).
 */
powerupsRouter.post("/bulk", requireAdmin, async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    if (!workspaceId)
      return res.status(400).json({ error: "Missing x-workspace-id" });

    const items = (Array.isArray(req.body) ? req.body : []) as Array<
      Partial<PowerupDoc> & { key?: string; name?: string }
    >;
    if (!items.length)
      return res.status(400).json({ error: "Body must be an array" });

    const ops = items
      .filter((p) => p.key && p.name)
      .map((p) => ({
        updateOne: {
          filter: { workspaceId, key: p.key },
          update: {
            $set: {
              workspaceId,
              name: p.name,
              description: p.description ?? "",
              employeeCategory: p.employeeCategory ?? undefined,
              assignedEmployeeId: p.assignedEmployeeId ?? null,
              inputs: p.inputs ?? [],
              systemPrompt: p.systemPrompt ?? "",
              outputFormat: p.outputFormat ?? "",
              active: p.active ?? true,
              createdBy: (req as any).user?.id ?? null,
              updatedAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

    if (!ops.length) return res.status(400).json({ error: "No valid items" });

    const result = await Powerup.bulkWrite(ops, { ordered: false });
    res.json({ ok: true, result });
  } catch (err) {
    console.error("[PowerUps] BULK error:", err);
    res.status(500).json({ error: "Failed to bulk upsert powerups" });
  }
});

/**
 * DELETE /api/powerups/:key
 * Delete one powerup by key.
 */
powerupsRouter.delete("/:key", requireAdmin, async (req, res) => {
  try {
    const workspaceId = req.headers["x-workspace-id"] as string;
    const key = req.params.key;
    if (!workspaceId)
      return res.status(400).json({ error: "Missing x-workspace-id" });
    if (!key) return res.status(400).json({ error: "Missing key param" });

    await Powerup.deleteOne({ workspaceId, key });
    res.json({ ok: true });
  } catch (err) {
    console.error("[PowerUps] DELETE error:", err);
    res.status(500).json({ error: "Failed to delete powerup" });
  }
});
