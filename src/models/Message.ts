// src/models/Message.ts
import { Schema, model } from "mongoose";

const MessageSchema = new Schema({
  workspaceId: { type: String, required: true },

  // Support both old & new names
  employeeId: { type: String }, // legacy
  chatEmployeeId: { type: String }, // new

  sender: { type: String, enum: ["user", "agent", "system"], required: true },
  text: { type: String, required: true },

  routedTo: { type: String },
  routedToName: { type: String },

  userId: { type: String, required: true },
  ts: { type: Number, required: true },
});

// Fill missing alias automatically
MessageSchema.pre("validate", function (next) {
  // @ts-ignore
  if (!this.employeeId && this.chatEmployeeId) {
    // @ts-ignore
    this.employeeId = this.chatEmployeeId;
  }
  // @ts-ignore
  if (!this.chatEmployeeId && this.employeeId) {
    // @ts-ignore
    this.chatEmployeeId = this.employeeId;
  }
  next();
});

export const MessageModel = model("Message", MessageSchema);
