import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  workspaceId: { type: String, required: true, index: true },
  employeeId: { type: String, required: true },
  sender: { type: String, enum: ["user", "agent"], required: true },
  text: { type: String, required: true },
  ts: { type: Number, required: true },
  routedTo: { type: String },
  routedToName: { type: String },
});

export const MessageModel = mongoose.model("Message", messageSchema);
