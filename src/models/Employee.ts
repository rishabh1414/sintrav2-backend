import { Schema, model, Document } from "mongoose";

export interface EmployeeDoc extends Document {
  workspaceId: string;
  key: string;
  name: string;
  role: string;
  description?: string;
  enabled: boolean;
  avatarUrl?: string;
  systemPrompt: string;
  capabilities: string[];
  tools: string[];
  theme?: { from?: string; to?: string; text?: string };
}

const EmployeeSchema = new Schema<EmployeeDoc>(
  {
    workspaceId: { type: String, required: true, index: true },
    key: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    role: { type: String, required: true },
    description: String,
    enabled: { type: Boolean, default: true },
    avatarUrl: String,
    systemPrompt: {
      type: String,
      required: true,
      default: "You are an AI employee. Respond helpfully based on your role.",
    },
    capabilities: { type: [String], default: [] },
    tools: { type: [String], default: [] },
    theme: {
      from: String,
      to: String,
      text: String,
    },
  },
  { timestamps: true }
);

export const Employee = model<EmployeeDoc>("Employee", EmployeeSchema);
