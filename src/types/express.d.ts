// Ensure this file is included by tsconfig ("include": ["src/**/*.ts", "src/types/**/*.d.ts"])
import "express-serve-static-core";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
    workspaceId?: string;
    membership?: {
      _id: string;
      userId: string;
      workspaceId: string;
      role: "OWNER" | "ADMIN" | "MEMBER";
      invitedBy?: string;
      invitedAt?: Date;
      createdAt?: Date;
      updatedAt?: Date;
      __v?: number;
    };
  }
}
