import { Schema, model, Document } from "mongoose";

export interface MessageDoc extends Document {
  workspaceId: string;
  employeeId: string;
  sender: "user" | "agent" | "system";
  structured?: any;
  text: string;
}

const MessageSchema = new Schema<MessageDoc>(
  {
    workspaceId: { type: String, required: true },
    employeeId: { type: String, required: true },
    sender: { type: String, enum: ["user", "agent", "system"], required: true },
    text: { type: String, required: true },
    structured: { type: Object },
  },
  { timestamps: true }
);

export const Message = model<MessageDoc>("Message", MessageSchema);
