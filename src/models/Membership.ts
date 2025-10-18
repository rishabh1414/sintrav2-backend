import mongoose, { Schema } from "mongoose";

export interface MembershipDoc {
  _id: string;
  userId: string;
  workspaceId: string;
  role: "OWNER" | "ADMIN" | "MEMBER";
  invitedBy?: string;
  invitedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const MembershipSchema = new Schema<MembershipDoc>(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    workspaceId: { type: String, required: true, index: true },
    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "MEMBER"],
      default: "MEMBER",
    },
    invitedBy: { type: String },
    invitedAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

MembershipSchema.index({ workspaceId: 1, userId: 1 }, { unique: true });

export const MembershipModel =
  (mongoose.models.Membership as mongoose.Model<MembershipDoc>) ||
  mongoose.model<MembershipDoc>("Membership", MembershipSchema);
