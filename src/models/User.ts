import mongoose, { Schema } from "mongoose";

export interface UserDoc {
  _id: string; // e.g., nanoid
  email: string;
  passwordHash?: string; // optional if you go magic-link/OAuth
  name?: string;
  avatar?: string;
  defaultWorkspaceId?: string;
  status: "active" | "invited" | "disabled";
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<UserDoc>(
  {
    _id: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String },
    name: { type: String },
    avatar: { type: String },
    defaultWorkspaceId: { type: String },
    status: {
      type: String,
      enum: ["active", "invited", "disabled"],
      default: "active",
      index: true,
    },
    lastLoginAt: { type: Date },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

UserSchema.index({ email: 1 }, { unique: true });

export const UserModel =
  (mongoose.models.User as mongoose.Model<UserDoc>) ||
  mongoose.model<UserDoc>("User", UserSchema);
