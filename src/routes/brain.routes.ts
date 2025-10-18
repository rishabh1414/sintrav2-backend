import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { tenantMiddleware } from "../middleware/tenant";
import { BrainService } from "../services/brain.service";

export const brainRouter = Router();

/**
 * POST /api/brain/ingest
 * Body: { text: string }
 */
brainRouter.post(
  "/ingest",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const workspaceId = (req as any).workspaceId as string;
      const { text } = req.body || {};
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required (string)" });
      }
      const rec = await BrainService.ingest(workspaceId, text);
      res.status(201).json(rec);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/brain/search?q=...&limit=5
 */
brainRouter.get(
  "/search",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const workspaceId = (req as any).workspaceId as string;
      const q = String(req.query.q || "").trim();
      const limit = Number(req.query.limit || 5);
      if (!q) return res.status(400).json({ error: "q is required" });

      const hits = await BrainService.search(workspaceId, q, limit);
      res.json({ items: hits });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/brain/:id
 */
brainRouter.delete(
  "/:id",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const workspaceId = (req as any).workspaceId as string;
      const { id } = req.params;
      const ok = await BrainService.remove(workspaceId, id);
      res.json(ok);
    } catch (err) {
      next(err);
    }
  }
);
