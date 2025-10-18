import mongoose, { Schema } from "mongoose";

export interface WorkspaceDoc {
  _id: string; // nanoid or ulid
  name: string;
  slug: string;
  ownerId: string; // User._id
  plan: {
    tier: "free" | "pro" | "enterprise";
    helpersAllowed: number;
    powerupsAllowed: number;
  };
  settings: {
    locale?: string;
    timezone?: string;
    branding?: {
      logoUrl?: string;
      primaryColor?: string;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

const WorkspaceSchema = new Schema<WorkspaceDoc>(
  {
    _id: { type: String, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    plan: {
      tier: {
        type: String,
        enum: ["free", "pro", "enterprise"],
        default: "free",
      },
      helpersAllowed: { type: Number, default: 5 },
      powerupsAllowed: { type: Number, default: 20 },
    },
    settings: {
      locale: { type: String },
      timezone: { type: String },
      branding: {
        logoUrl: { type: String },
        primaryColor: { type: String },
      },
    },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } }
);

WorkspaceSchema.index({ slug: 1 }, { unique: true });
WorkspaceSchema.index({ ownerId: 1 });

export const WorkspaceModel =
  (mongoose.models.Workspace as mongoose.Model<WorkspaceDoc>) ||
  mongoose.model<WorkspaceDoc>("Workspace", WorkspaceSchema);
