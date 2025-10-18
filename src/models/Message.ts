import { Schema, model, Document } from "mongoose";

export interface MessageDoc extends Document {
  workspaceId: string;
  employeeId: string;
  sender: "user" | "agent";
  text: string;
  ts: number;
  steps?: any[];
  routedTo?: string;
}

const MessageSchema = new Schema<MessageDoc>(
  {
    workspaceId: { type: String, required: true, index: true },
    employeeId: { type: String, required: true, index: true },
    sender: { type: String, enum: ["user", "agent"], required: true },
    text: { type: String, required: true },
    ts: { type: Number, required: true, default: () => Date.now() },
    steps: { type: Array, default: [] },
    routedTo: { type: String },
  },
  { timestamps: true }
);

MessageSchema.index({ workspaceId: 1, employeeId: 1, ts: 1 });

export const MessageModel = model<MessageDoc>("Message", MessageSchema);
