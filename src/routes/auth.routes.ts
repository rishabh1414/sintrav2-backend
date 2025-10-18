import { Router } from "express";
import { z } from "zod";
import {
  AuthService,
  SignUpSchema,
  LoginSchema,
} from "../services/auth.service";
import { requireAuth } from "../middleware/auth";

export const authRouter = Router();

/**
 * POST /api/auth/signup
 * { email, password, name? }
 */
authRouter.post("/signup", async (req, res, next) => {
  try {
    const input = SignUpSchema.parse(req.body);
    const result = await AuthService.signup(input);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/auth/login
 * { email, password }
 */
authRouter.post("/login", async (req, res, next) => {
  try {
    const input = LoginSchema.parse(req.body);
    const result = await AuthService.login(input);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/auth/me
 * Bearer token required
 */
authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const userId = (req as any).userId as string;
    const me = await AuthService.me(userId);
    res.json(me);
  } catch (err) {
    next(err);
  }
});
