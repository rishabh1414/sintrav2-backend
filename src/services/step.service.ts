import { StepModel } from "../models/Step";
import { TaskModel } from "../models/Task";
import { PowerupService } from "./powerup.service";
import { BrainService } from "./brain.service";
import { enqueueStep } from "../queues/step.queue";

/**
 * StepService
 * - Executes individual steps (capability or control).
 * - Updates step state to RUNNING → SUCCEEDED/FAILED.
 * - After success, enqueues any dependents whose deps are all SUCCEEDED.
 */
export class StepService {
  static async executeStep(stepId: string) {
    const step = await StepModel.findById(stepId);
    if (!step) throw new Error(`Step not found: ${stepId}`);

    // Only run steps that are ready
    if (step.state !== "QUEUED") {
      return { skipped: true, reason: `state=${step.state}` };
    }

    // Make sure all dependencies are satisfied
    if (step.deps && step.deps.length > 0) {
      const pendingDeps = await StepModel.countDocuments({
        _id: { $in: step.deps },
        state: { $ne: "SUCCEEDED" },
      });
      if (pendingDeps > 0) {
        // Deps not done yet; skip without changing state (will be retried later)
        return { skipped: true, reason: "deps_not_satisfied" };
      }
    }

    step.state = "RUNNING";
    step.startedAt = new Date();
    await step.save();

    try {
      // We need the workspaceId for Brain/Powerup; get it from the parent task
      const task = await TaskModel.findById(step.taskId).lean();
      if (!task) throw new Error(`Task not found for step ${stepId}`);
      const workspaceId = task.workspaceId;

      let payload: any = {};

      if (step.type === "capability" && step.capabilityKey) {
        // Optional: fetch a bit of brain context
        const brainContext =
          (await BrainService.search(
            workspaceId,
            String(step.inputs?.taskTitle ?? task.title ?? ""),
            3
          )) || [];

        const run = await PowerupService.run({
          workspaceId,
          powerupKey: step.capabilityKey,
          inputs: { ...(step.inputs || {}), brainContext },
          helperKey: step.assignedTo,
          model: "gpt-4o-mini", // ✅ provide model, per your PowerupService schema
        });

        payload = run.output;
        step.result = { status: "OK", payload };
      } else if (step.type === "control") {
        if (step.control === "SPLIT") {
          payload = { status: "split_triggered" };
          step.result = { status: "OK", payload };
        } else if (step.control === "JOIN_ALL") {
          payload = { status: "join_completed" };
          step.result = { status: "OK", payload };
        } else {
          step.result = { status: "ERROR", notes: "Unknown control type" };
          throw new Error("Unknown control type");
        }
      } else {
        step.result = { status: "ERROR", notes: "Unknown step type" };
        throw new Error("Unknown step type");
      }

      step.state = "SUCCEEDED"; // ✅ use enum value we defined
      step.finishedAt = new Date();
      await step.save();

      // Advance the graph: enqueue dependents that are now unblocked
      await this.enqueueReadyDependents(step.taskId, step._id);
      return { completed: true, output: payload };
    } catch (err: any) {
      step.state = "FAILED";
      step.finishedAt = new Date();
      step.error = err?.message ?? "Unknown error";
      await step.save();
      throw err;
    }
  }

  /**
   * For all steps in the same task that depend on `completedStepId`,
   * if all their deps are SUCCEEDED, enqueue them for execution.
   */
  static async enqueueReadyDependents(taskId: string, completedStepId: string) {
    const dependents = await StepModel.find({
      taskId,
      deps: completedStepId,
      state: "QUEUED",
    }).lean();

    for (const s of dependents) {
      const remaining = await StepModel.countDocuments({
        _id: { $in: s.deps || [] },
        state: { $ne: "SUCCEEDED" },
      });
      if (remaining === 0) {
        await enqueueStep(s._id); // fire off execution
      }
    }

    // If no steps are left in nonterminal states, close the task
    const stillActive = await StepModel.countDocuments({
      taskId,
      state: { $in: ["QUEUED", "RUNNING"] },
    });

    if (stillActive === 0) {
      // Either all succeeded or some failed; decide how you want to mark the task
      const failures = await StepModel.countDocuments({
        taskId,
        state: "FAILED",
      });
      const task = await TaskModel.findById(taskId);
      if (task) {
        if (failures > 0) {
          task.state = "FAILED";
        } else {
          task.state = "DONE";
          task.metrics.finishedAt = new Date();
        }
        await task.save();
      }
    }
  }
}
