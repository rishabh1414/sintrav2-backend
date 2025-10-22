import { Schema, model } from "mongoose";

const MessageSchema = new Schema({
  workspaceId: { type: String, required: true },
  chatEmployeeId: { type: String, required: true }, // <— keep this name consistent
  sender: { type: String, enum: ["user", "agent", "system"], required: true },
  text: { type: String, required: true },
  routedTo: { type: String },
  routedToName: { type: String },
  userId: { type: String, required: true }, // <— critical for per-user scoping
  ts: { type: Number, required: true },
});

// Fast queries by tenant + employee + user
MessageSchema.index({ workspaceId: 1, chatEmployeeId: 1, userId: 1, ts: 1 });

export const MessageModel = model("Message", MessageSchema);
