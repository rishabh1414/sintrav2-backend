import { Router } from "express";
import { nanoid } from "nanoid";
import { TaskModel } from "../models/Task";
import { StepModel } from "../models/Step";
import { TaskCreateInputSchema } from "../schemas/task.schema";
import { enqueuePlanTask } from "../queues";
import { requireAuth } from "../middleware/auth";
import { tenantMiddleware } from "../middleware/tenant";

export const tasksRouter = Router();

/**
 * POST /api/tasks
 * Body: { title, inputs?, budget? }
 * - workspaceId is taken from tenant middleware (x-workspace-id), not from body.
 * Query: ?plan=true to enqueue planner immediately
 */
tasksRouter.post("/", requireAuth, tenantMiddleware, async (req, res, next) => {
  try {
    // accept body but override workspaceId with tenant header
    const parsed = TaskCreateInputSchema.parse({
      ...req.body,
      workspaceId: req.workspaceId!, // from tenant middleware
    });

    const _id = nanoid(12);
    const task = await TaskModel.create({
      _id,
      workspaceId: parsed.workspaceId,
      title: parsed.title,
      inputs: parsed.inputs ?? {},
      budget: parsed.budget ?? { tokens: 120_000, seconds: 900 },
      state: "OPEN",
      createdBy: req.userId,
    });

    const shouldPlan = String(req.query.plan ?? "").toLowerCase() === "true";
    if (shouldPlan) {
      await enqueuePlanTask(task._id);
    }

    res.status(201).json({ task, enqueuedPlan: shouldPlan });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/tasks/:id
 * Query: ?includeSteps=true to also return steps
 */
tasksRouter.get(
  "/:id",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const task = await TaskModel.findById(id).lean();
      if (!task || task.workspaceId !== req.workspaceId) {
        return res.status(404).json({ error: "Task not found" });
      }

      const includeSteps =
        String(req.query.includeSteps ?? "").toLowerCase() === "true";
      if (!includeSteps) return res.json({ task });

      const steps = await StepModel.find({ taskId: id })
        .sort({ createdAt: 1 })
        .lean();
      res.json({ task, steps });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/tasks/:id/plan
 * Enqueue planner job
 */
tasksRouter.post(
  "/:id/plan",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const task = await TaskModel.findById(id).lean();
      if (!task || task.workspaceId !== req.workspaceId) {
        return res.status(404).json({ error: "Task not found" });
      }
      await enqueuePlanTask(id);
      res.status(202).json({ ok: true, enqueued: true });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/tasks/:id/stream
 * Server-Sent Events (SSE) stream of task + steps.
 * Implementation uses simple polling (no Mongo change streams needed).
 */
tasksRouter.get(
  "/:id/stream",
  requireAuth,
  tenantMiddleware,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const task = await TaskModel.findById(id).lean();
      if (!task || task.workspaceId !== req.workspaceId) {
        return res.status(404).json({ error: "Task not found" });
      }

      // SSE headers
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders?.();

      const send = (event: string, data: any) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Initial payload
      const steps = await StepModel.find({ taskId: id })
        .sort({ createdAt: 1 })
        .lean();
      send("snapshot", { task, steps });

      let lastHash = JSON.stringify({
        taskState: task.state,
        steps: steps.map((s) => ({ id: s._id, state: s.state })),
      });

      const interval = setInterval(async () => {
        try {
          const t = await TaskModel.findById(id).lean();
          if (!t) {
            send("end", { reason: "deleted" });
            clearInterval(interval);
            res.end();
            return;
          }
          const ss = await StepModel.find({ taskId: id })
            .sort({ createdAt: 1 })
            .lean();

          const curHash = JSON.stringify({
            taskState: t.state,
            steps: ss.map((s) => ({ id: s._id, state: s.state })),
          });
          if (curHash !== lastHash) {
            lastHash = curHash;
            send("update", { task: t, steps: ss });
          }

          // auto-close when task is terminal
          if (t.state === "DONE" || t.state === "FAILED") {
            send("end", { reason: "terminal", state: t.state });
            clearInterval(interval);
            res.end();
          }
        } catch (e) {
          send("error", { message: (e as any)?.message ?? "poll_error" });
        }
      }, 1500);

      req.on("close", () => {
        clearInterval(interval);
      });
    } catch (err) {
      next(err);
    }
  }
);
