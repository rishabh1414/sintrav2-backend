import mongoose, { Schema } from "mongoose";

export interface PowerupDoc {
  _id: string; // stable key, e.g. "write_blog"
  name: string;
  description?: string;
  categories: string[]; // e.g., ["marketing","content"]
  tools: string[]; // e.g., ["web_search","brand_memory"]
  modelDefault?: string; // e.g., "gpt-4o-mini"

  // JSON Schema for inputs/outputs (runtime validated via AJV in service)
  inputSchema?: Record<string, any>;
  outputSchema?: Record<string, any>;

  systemPrompt: string;

  // Multi-tenant override: if set, this is scoped to a workspace and
  // overrides the global power-up with same _id.
  workspaceId?: string;

  enabled: boolean;
  version: number; // increment on breaking changes
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null; // soft delete
}

const PowerupSchema = new Schema<PowerupDoc>(
  {
    _id: { type: String, required: true }, // key
    name: { type: String, required: true },
    description: { type: String },
    categories: { type: [String], default: [] },
    tools: { type: [String], default: [] },
    modelDefault: { type: String },
    inputSchema: { type: Schema.Types.Mixed },
    outputSchema: { type: Schema.Types.Mixed },
    systemPrompt: { type: String, required: true },
    workspaceId: { type: String, index: true }, // null/undefined => global
    enabled: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1 },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

// Ensure only one active override per (workspaceId,_id)
PowerupSchema.index({ _id: 1, workspaceId: 1, deletedAt: 1 }, { unique: true });

export const PowerupModel =
  (mongoose.models.Powerup as mongoose.Model<PowerupDoc>) ||
  mongoose.model<PowerupDoc>("Powerup", PowerupSchema);
