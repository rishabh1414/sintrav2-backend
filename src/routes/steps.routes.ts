import { Router } from "express";
import { StepModel } from "../models/Step";
import { requireAuth } from "../middleware/auth";
import { tenantMiddleware } from "../middleware/tenant";
import { enqueueStep } from "../queues/step.queue";

export const stepsRouter = Router();

/**
 * GET /api/steps/:id
 * Fetch a single step by ID
 */
stepsRouter.get(
  "/:id",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const step = await StepModel.findById(id).lean();
      if (!step) return res.status(404).json({ error: "Step not found" });
      res.json(step);
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/steps/:id/run
 * Manually enqueue a step execution (useful for testing)
 */
stepsRouter.post(
  "/:id/run",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const step = await StepModel.findById(id);
      if (!step) return res.status(404).json({ error: "Step not found" });
      await enqueueStep(step._id);
      res.json({ enqueued: true, stepId: step._id });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/tasks/:taskId/steps
 * List all steps for a task
 */
stepsRouter.get(
  "/task/:taskId",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const { taskId } = req.params;
      const steps = await StepModel.find({ taskId })
        .sort({ createdAt: 1 })
        .lean();
      res.json({ items: steps });
    } catch (err) {
      next(err);
    }
  }
);
