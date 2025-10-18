// src/services/auth.service.ts
import { nanoid } from "nanoid";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import argon2 from "argon2";
import { z } from "zod";
import { env } from "../config/env";
import { UserModel } from "../models/User";
import { WorkspaceModel } from "../models/Workspace";
import { MembershipModel } from "../models/Membership";

export const SignUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).optional(),
});

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type JwtPayload = { uid: string };

export class AuthService {
  static signToken(
    payload: JwtPayload,
    expiresInSeconds: number = 7 * 24 * 60 * 60
  ) {
    const opts: SignOptions = { expiresIn: expiresInSeconds };
    const secret: Secret = env.JWT_SECRET as Secret;
    return jwt.sign(payload, secret, opts);
  }

  static verifyToken(token: string) {
    const secret: Secret = env.JWT_SECRET as Secret;
    return jwt.verify(token, secret) as JwtPayload;
  }

  static async signup(input: z.infer<typeof SignUpSchema>) {
    const email = input.email.toLowerCase();

    const exists = await UserModel.findOne({ email });
    if (exists) {
      const err: any = new Error("Email already registered");
      err.statusCode = 409;
      throw err;
    }

    const userId = nanoid(12);
    const passwordHash = await argon2.hash(input.password);

    const user = await UserModel.create({
      _id: userId,
      email,
      passwordHash,
      name: input.name,
      status: "active",
    });

    // Create a default workspace for the user
    const wsId = nanoid(10);
    const base = (input.name || email.split("@")[0]).toLowerCase();
    const slug = `${base}-${wsId}`.replace(/[^a-z0-9-]/g, "");

    await WorkspaceModel.create({
      _id: wsId,
      name: input.name ? `${input.name}'s Workspace` : "My Workspace",
      slug,
      ownerId: user._id,
      plan: { tier: "free", helpersAllowed: 5, powerupsAllowed: 20 },
      settings: {},
    });

    await MembershipModel.create({
      _id: nanoid(12),
      userId: user._id,
      workspaceId: wsId,
      role: "OWNER",
    });

    await UserModel.updateOne(
      { _id: user._id },
      { $set: { defaultWorkspaceId: wsId } }
    );

    const token = this.signToken({ uid: user._id });

    return {
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        defaultWorkspaceId: wsId,
      },
      workspace: { _id: wsId, slug },
    };
  }

  static async login(input: z.infer<typeof LoginSchema>) {
    const email = input.email.toLowerCase();

    const user = await UserModel.findOne({ email });
    if (!user || !user.passwordHash) {
      const err: any = new Error("Invalid credentials");
      err.statusCode = 401;
      throw err;
    }

    const ok = await argon2.verify(user.passwordHash, input.password);
    if (!ok) {
      const err: any = new Error("Invalid credentials");
      err.statusCode = 401;
      throw err;
    }

    const token = this.signToken({ uid: user._id });

    return {
      token,
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        defaultWorkspaceId: user.defaultWorkspaceId,
      },
    };
  }

  static async me(userId: string) {
    const user = await UserModel.findById(userId).lean();
    if (!user) {
      const err: any = new Error("User not found");
      err.statusCode = 404;
      throw err;
    }
    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      defaultWorkspaceId: user.defaultWorkspaceId,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
    };
  }
}
