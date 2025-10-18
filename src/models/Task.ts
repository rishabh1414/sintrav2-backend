import mongoose, { Schema, Types } from "mongoose";
import { TaskState } from "../schemas/task.schema";

export interface TaskDoc {
  _id: string;
  workspaceId: string;
  title: string;
  inputs: Record<string, any>;
  state: TaskState;
  budget: { tokens: number; seconds: number };
  graph: { rootStepId?: string };
  metrics: {
    spent_tokens: number;
    startedAt?: Date;
    finishedAt?: Date;
  };
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<TaskDoc>(
  {
    _id: { type: String, required: true }, // use nanoid or ULID as string ids
    workspaceId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    inputs: { type: Schema.Types.Mixed, default: {} },
    state: {
      type: String,
      enum: ["OPEN", "PLANNING", "RUNNING", "REVIEW", "DONE", "FAILED"],
      default: "OPEN",
      index: true,
    },
    budget: {
      tokens: { type: Number, default: 0 },
      seconds: { type: Number, default: 0 },
    },
    graph: {
      rootStepId: { type: String },
    },
    metrics: {
      spent_tokens: { type: Number, default: 0 },
      startedAt: { type: Date },
      finishedAt: { type: Date },
    },
    createdBy: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Basic helper index suggestions
TaskSchema.index({ workspaceId: 1, createdAt: -1 });
TaskSchema.index({ state: 1, workspaceId: 1 });

export const TaskModel =
  (mongoose.models.Task as mongoose.Model<TaskDoc>) ||
  mongoose.model<TaskDoc>("Task", TaskSchema);
