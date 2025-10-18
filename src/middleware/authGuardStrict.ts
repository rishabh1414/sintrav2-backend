import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthClaims {
  uid: string;
  workspaceId?: string;
}

const JWT_SECRET = process.env.JWT_SECRET || "changeme";

export function authGuardStrict(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res
      .status(401)
      .json({ error: "Missing or invalid Authorization header" });
  }

  const token = authHeader.substring(7);
  let claims: AuthClaims;

  try {
    claims = jwt.verify(token, JWT_SECRET) as AuthClaims;
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }

  // Accept workspaceId either from header or token
  const wsId = (req.headers["x-workspace-id"] as string) || claims.workspaceId;
  if (!wsId) {
    return res.status(400).json({ error: "Missing workspaceId" });
  }

  (req as any).auth = {
    userId: claims.uid,
    workspaceId: wsId,
  };

  next();
}
