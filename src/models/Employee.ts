import mongoose, { Document, Schema } from "mongoose";

export interface EmployeeDoc extends Document {
  workspaceId: string;
  name: string;
  role?: string;
  capabilities: string[];
  systemPrompt?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const employeeSchema = new Schema<EmployeeDoc>(
  {
    workspaceId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    role: { type: String },
    capabilities: { type: [String], default: [] },
    systemPrompt: { type: String },
    avatarUrl: { type: String },
  },
  { timestamps: true }
);

export const Employee = mongoose.model<EmployeeDoc>("Employee", employeeSchema);
