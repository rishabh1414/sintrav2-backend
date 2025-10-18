import { z } from "zod";

/**
 * ===== Enums =====
 */
export const TaskStateEnum = z.enum([
  "OPEN", // created, awaiting planning
  "PLANNING", // director building DAG
  "RUNNING", // at least one step active
  "REVIEW", // optional human/QA
  "DONE",
  "FAILED",
]);
export type TaskState = z.infer<typeof TaskStateEnum>;

export const StepStateEnum = z.enum([
  "QUEUED",
  "RUNNING",
  "SUCCEEDED",
  "FAILED",
  "CANCELLED",
]);
export type StepState = z.infer<typeof StepStateEnum>;

export const StepTypeEnum = z.enum(["capability", "control"]);
export type StepType = z.infer<typeof StepTypeEnum>;

export const ControlTypeEnum = z.enum(["JOIN_ALL", "SPLIT"]); // expand later
export type ControlType = z.infer<typeof ControlTypeEnum>;

/**
 * ===== Core Schemas =====
 */

export const BudgetSchema = z.object({
  tokens: z.number().int().nonnegative().default(0),
  seconds: z.number().int().nonnegative().default(0),
});

export const CapabilityRefSchema = z.object({
  capabilityKey: z.string().min(1), // e.g., "research_topic", "write_blog"
  assignedTo: z.string().optional(), // employee id (e.g., "employee.penn")
});

export const StepInputSchema = z.record(z.string(), z.any()).default({});
export const StepResultSchema = z
  .object({
    status: z.enum(["OK", "NEEDS_INFO", "ERROR"]).default("OK"),
    payload: z.any().optional(), // validated elsewhere (zod/ajv per-capability)
    notes: z.string().optional(),
  })
  .optional();

/** A single node in the DAG */
export const StepSchema = z.object({
  _id: z.string().min(1), // string id for readability
  taskId: z.string().min(1),
  type: StepTypeEnum,
  control: ControlTypeEnum.optional(), // if type === "control"
  capabilityKey: z.string().optional(), // if type === "capability"
  assignedTo: z.string().optional(), // employee id
  inputs: StepInputSchema,
  deps: z.array(z.string()).default([]), // stepIds this depends on
  state: StepStateEnum.default("QUEUED"),
  result: StepResultSchema,
  retries: z.number().int().nonnegative().default(0),
  idempotencyKey: z.string().optional(),
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type StepDTO = z.infer<typeof StepSchema>;

/** High-level task that owns a DAG of Steps */
export const TaskSchema = z.object({
  _id: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  inputs: z.record(z.string(), z.any()), // user-provided intent
  state: TaskStateEnum.default("OPEN"),
  budget: BudgetSchema.default({ tokens: 0, seconds: 0 }),
  graph: z
    .object({
      rootStepId: z.string().optional(),
    })
    .default({}),
  metrics: z
    .object({
      spent_tokens: z.number().int().nonnegative().default(0),
      startedAt: z.date().optional(),
      finishedAt: z.date().optional(),
    })
    .default({ spent_tokens: 0 }),
  createdBy: z.string().optional(), // user id
  createdAt: z.date().default(() => new Date()),
  updatedAt: z.date().default(() => new Date()),
});
export type TaskDTO = z.infer<typeof TaskSchema>;

/**
 * ===== Input Contracts =====
 */
export const TaskCreateInputSchema = z.object({
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  inputs: z.record(z.string(), z.any()),
  budget: BudgetSchema.default({ tokens: 120_000, seconds: 900 }),
});
export type TaskCreateInput = z.infer<typeof TaskCreateInputSchema>;

/**
 * Optional hint used by planner: list of desired capabilities and basic dependency rules.
 * (If not provided, planner can do LLM-based classification later.)
 */
export const TaskPlanHintSchema = z.object({
  desiredCapabilities: z.array(CapabilityRefSchema).optional(),
  // edges like: { from: "research", to: "write_blog" }
  edges: z
    .array(
      z.object({
        from: z.string(),
        to: z.string(),
      })
    )
    .optional(),
});
export type TaskPlanHint = z.infer<typeof TaskPlanHintSchema>;
