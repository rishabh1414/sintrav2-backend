import type { Request, Response, NextFunction } from "express";

export class HttpError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

/**
 * Use as the last app.use(errorHandler) in app.ts
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const status =
    typeof err?.statusCode === "number"
      ? err.statusCode
      : typeof err?.status === "number"
      ? err.status
      : 500;

  const message =
    process.env.NODE_ENV === "production"
      ? status >= 500
        ? "Internal Server Error"
        : err?.message || "Error"
      : err?.message || "Error";

  if (status >= 500) {
    // eslint-disable-next-line no-console
    console.error("Unhandled error:", err);
  }

  res.status(status).json({
    error: message,
    details: err?.details ?? undefined,
    code: err?.code ?? undefined,
  });
}
