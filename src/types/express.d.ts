// Ensure this file is included in tsconfig.json:
// "include": ["src/**/*.ts", "src/types/**/*.d.ts"]

import "express-serve-static-core";

declare module "express-serve-static-core" {
  /** Core membership info (your existing structure) */
  interface Membership {
    _id: string;
    userId: string;
    workspaceId: string;
    role: "OWNER" | "ADMIN" | "MEMBER";
    invitedBy?: string;
    invitedAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
    __v?: number;
  }

  /** Authenticated user info attached by middleware */
  interface UserPayload {
    id: string;
    role?: "admin" | "user";
    email?: string;
  }

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
