import { nanoid } from "nanoid";
import { TaskModel, TaskDoc } from "../models/Task";
import { StepModel, StepDoc } from "../models/Step";
import { RouterService } from "./router.service";

type PlanHint = {
  desiredCapabilities?: { capabilityKey: string; assignedTo?: string }[];
  edges?: { from: string; to: string }[];
};

/**
 * Director/Planner:
 * - Builds a DAG of steps for a Task.
 * - Assigns employees per capability using RouterService when not preassigned.
 * - Sets task RUNNING after planning to let workers consume.
 */
export class PlannerService {
  static async planTask(taskId: string) {
    const task = await TaskModel.findById(taskId);
    if (!task) throw new Error("Task not found");

    if (task.state !== "OPEN") {
      return { planned: false, reason: `state=${task.state}` };
    }

    task.state = "PLANNING";
    await task.save();

    const workspaceId = task.workspaceId;
    const id = () => nanoid(12);
    const steps: StepDoc[] = [];

    // Root node
    const rootStepId = id();
    steps.push({
      _id: rootStepId,
      taskId: task._id,
      type: "control",
      control: "SPLIT",
      inputs: { title: task.title, inputs: task.inputs },
      deps: [],
      state: "QUEUED",
      retries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Plan hints (optional)
    const planHint = ((task.inputs?.planHint as PlanHint) ?? {}) as PlanHint;
    const desired = (planHint.desiredCapabilities ?? []).filter(
      (d) => d?.capabilityKey && typeof d.capabilityKey === "string"
    );

    const capabilityList =
      desired.length > 0
        ? desired
        : [{ capabilityKey: "do_task" as const, assignedTo: undefined }];

    // Capability steps (+ auto-assign if needed)
    const capIdMap = new Map<string, string>(); // capabilityKey -> stepId
    for (const cap of capabilityList) {
      const stepId = id();
      capIdMap.set(cap.capabilityKey, stepId);

      let assignedTo = cap.assignedTo;
      if (!assignedTo) {
        assignedTo =
          (await RouterService.assignCapability(
            workspaceId,
            cap.capabilityKey
          )) ?? undefined;
      }

      steps.push({
        _id: stepId,
        taskId: task._id,
        type: "capability",
        capabilityKey: cap.capabilityKey,
        assignedTo: assignedTo ?? undefined,
        inputs: {
          taskTitle: task.title,
          taskInputs: task.inputs,
          // NOTE: downstream workers can enrich with Brain search results if needed
        },
        deps: [rootStepId],
        state: "QUEUED",
        retries: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Apply dependency edges (from → to)
    for (const e of planHint.edges ?? []) {
      const fromId = capIdMap.get(e.from);
      const toId = capIdMap.get(e.to);
      if (!fromId || !toId) continue;
      const toStep = steps.find((s) => s._id === toId);
      if (toStep && !toStep.deps.includes(fromId)) toStep.deps.push(fromId);
    }

    // JOIN node if multiple terminals
    let joinId: string | undefined;
    if (capabilityList.length > 1) {
      joinId = id();
      steps.push({
        _id: joinId,
        taskId: task._id,
        type: "control",
        control: "JOIN_ALL",
        inputs: {},
        deps: Array.from(capIdMap.values()),
        state: "QUEUED",
        retries: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    await StepModel.insertMany(steps);

    task.graph.rootStepId = rootStepId;
    task.state = "RUNNING";
    task.metrics.startedAt = new Date();
    await task.save();

    return {
      planned: true,
      taskId: task._id,
      rootStepId,
      capabilityStepIds: Array.from(capIdMap.values()),
      joinStepId: joinId,
      count: steps.length,
    };
  }
}
