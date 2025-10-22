// src/models/Powerup.ts
import mongoose, { Schema, Document, Model } from "mongoose";

export type PowerupInputField =
  | {
      name: string;
      label?: string;
      type:
        | "text"
        | "longtext"
        | "select"
        | "number"
        | "url"
        | "email"
        | "date";
      required?: boolean;
      options?: string[];
    }
  | { name: string; label?: string; type: "boolean"; required?: boolean };

export interface PowerupDoc extends Document {
  workspaceId: string;
  key: string; // unique per workspace
  name: string;
  description?: string;
  // Either route by category OR pin to a specific employee
  employeeCategory?: string;
  assignedEmployeeId?: string | null;

  inputs?: PowerupInputField[];
  systemPrompt?: string;
  outputFormat?: string;
  active: boolean;

  createdBy?: string | null;
  updatedAt: Date;
  createdAt: Date;
}

const PowerupSchema = new Schema<PowerupDoc>(
  {
    workspaceId: { type: String, required: true, index: true },
    key: { type: String, required: true },
    name: { type: String, required: true },
    description: { type: String },

    employeeCategory: { type: String },
    assignedEmployeeId: { type: String, default: null },

    inputs: [
      {
        name: { type: String, required: true },
        label: { type: String },
        type: {
          type: String,
          enum: [
            "text",
            "longtext",
            "select",
            "number",
            "url",
            "email",
            "date",
            "boolean",
          ],
          required: true,
        },
        required: { type: Boolean, default: false },
        options: [{ type: String }],
      },
    ],

    systemPrompt: { type: String },
    outputFormat: { type: String },
    active: { type: Boolean, default: true },

    createdBy: { type: String, default: null },
  },
  { timestamps: true }
);

// Unique per workspace
PowerupSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export const Powerup: Model<PowerupDoc> =
  mongoose.models.Powerup ||
  mongoose.model<PowerupDoc>("Powerup", PowerupSchema);
