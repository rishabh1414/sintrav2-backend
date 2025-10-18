import { Schema, model } from "mongoose";

const messageSchema = new Schema({
  workspaceId: {
    type: String,
    required: true, // ✅ this is why it's failing when undefined
  },
  employeeId: {
    type: String,
    required: true,
  },
  sender: {
    type: String,
    enum: ["user", "agent"],
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  ts: {
    type: Number,
    required: true,
  },
  routedTo: {
    type: String,
    required: false,
  },
});

export const MessageModel = model("Message", messageSchema);
