import mongoose, { Schema } from "mongoose";

export type StepState =
  | "QUEUED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";
export type StepType = "capability" | "control";
export type ControlType = "JOIN_ALL" | "SPLIT";

export interface StepDoc {
  _id: string; // string step id
  taskId: string; // Task._id
  type: StepType;
  control?: ControlType;
  capabilityKey?: string;
  assignedTo?: string; // employee id
  inputs: Record<string, any>;
  deps: string[]; // step ids this depends on
  state: StepState;
  result?: {
    status: "OK" | "NEEDS_INFO" | "ERROR";
    payload?: any;
    notes?: string;
  };
  retries: number;
  idempotencyKey?: string;

  // ✅ add these fields so step.service can set them
  startedAt?: Date;
  finishedAt?: Date;
  error?: string;

  createdAt: Date;
  updatedAt: Date;
}

const StepSchema = new Schema<StepDoc>(
  {
    _id: { type: String, required: true },
    taskId: { type: String, required: true, index: true },
    type: { type: String, enum: ["capability", "control"], required: true },
    control: { type: String, enum: ["JOIN_ALL", "SPLIT"] },
    capabilityKey: { type: String },
    assignedTo: { type: String },
    inputs: { type: Schema.Types.Mixed, default: {} },
    deps: { type: [String], default: [] },
    state: {
      type: String,
      enum: ["QUEUED", "RUNNING", "SUCCEEDED", "FAILED", "CANCELLED"],
      default: "QUEUED",
      index: true,
    },
    result: {
      status: { type: String, enum: ["OK", "NEEDS_INFO", "ERROR"] },
      payload: { type: Schema.Types.Mixed },
      notes: { type: String },
    },
    retries: { type: Number, default: 0 },
    idempotencyKey: { type: String },

    // ✅ timestamps for execution phase
    startedAt: { type: Date },
    finishedAt: { type: Date },
    error: { type: String },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

StepSchema.index({ taskId: 1, state: 1 });
StepSchema.index({ taskId: 1, _id: 1 });
StepSchema.index({ idempotencyKey: 1 }, { unique: false, sparse: true });

export const StepModel =
  (mongoose.models.Step as mongoose.Model<StepDoc>) ||
  mongoose.model<StepDoc>("Step", StepSchema);
