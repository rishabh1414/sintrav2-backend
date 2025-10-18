import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { tenantMiddleware } from "../middleware/tenant";
import { requireRole } from "../middleware/role";
import { PowerupCatalogService } from "../services/powerupCatalog.service";

/**
 * Admin routes for managing the Power-Up catalog.
 * For global catalog: call without x-workspace-id header.
 * For workspace overrides: include x-workspace-id and require ADMIN/OWNER.
 */
export const powerupsAdminRouter = Router();

/**
 * GET /api/powerups/catalog
 * Lists effective catalog (global + workspace overrides)
 */
powerupsAdminRouter.get(
  "/catalog",
  requireAuth,
  tenantMiddleware, // optional if you want per-workspace filtering; if not present, only globals
  async (req, res, next) => {
    try {
      const list = await PowerupCatalogService.listCatalog(req.workspaceId);
      res.json({ items: list });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/powerups
 * Create a new power-up (global or workspace-scoped)
 * Body must include: _id, name, systemPrompt (and optional schemas)
 */
powerupsAdminRouter.post(
  "/",
  requireAuth,
  tenantMiddleware,
  requireRole(["ADMIN", "OWNER"]),
  async (req, res, next) => {
    try {
      const payload = req.body || {};
      // If you want to force per-workspace creation when header is present:
      if (req.workspaceId && payload.workspaceId == null) {
        payload.workspaceId = req.workspaceId;
      }
      const doc = await PowerupCatalogService.create(payload);
      res.status(201).json({ powerup: doc });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * PATCH /api/powerups/:id
 * Update a power-up in the current scope (global if no workspace, otherwise override)
 */
powerupsAdminRouter.patch(
  "/:id",
  requireAuth,
  tenantMiddleware,
  requireRole(["ADMIN", "OWNER"]),
  async (req, res, next) => {
    try {
      const updated = await PowerupCatalogService.update(
        req.params.id,
        req.body,
        req.workspaceId
      );
      res.json({ powerup: updated });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/powerups/:id
 * Soft delete (marks deletedAt and disables)
 */
powerupsAdminRouter.delete(
  "/:id",
  requireAuth,
  tenantMiddleware,
  requireRole(["OWNER"]),
  async (req, res, next) => {
    try {
      const out = await PowerupCatalogService.remove(
        req.params.id,
        req.workspaceId
      );
      res.json(out);
    } catch (err) {
      next(err);
    }
  }
);
