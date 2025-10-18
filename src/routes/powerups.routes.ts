import { Router } from "express";
import { PowerupService, PowerupRunInput } from "../services/powerup.service";
import { enqueuePowerupRun } from "../queues/powerup.queue";

export const powerupsRouter = Router();

/**
 * POST /api/powerups/run
 * Body: { workspaceId, powerupKey, inputs?, helperKey?, model? }
 * Query: ?async=true to enqueue and return a job id
 */
powerupsRouter.post("/run", async (req, res, next) => {
  try {
    const parsed = PowerupRunInput.parse(req.body);
    const useAsync = String(req.query.async ?? "").toLowerCase() === "true";

    if (useAsync) {
      const job = await enqueuePowerupRun(parsed);
      return res
        .status(202)
        .json({ enqueued: true, jobId: job.id, queue: job.queueName });
    }

    // synchronous run (good for short jobs)
    const result = await PowerupService.run(parsed);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/powerups/catalog
 * For now returns a minimal static list (replace with DB later)
 */
powerupsRouter.get("/catalog", async (_req, res) => {
  // In a real app, read from Mongo collection "powerups"
  res.json({
    items: [
      { key: "write_linkedin_post", name: "Write a LinkedIn Post" },
      { key: "write_blog", name: "Write a Blog Post" },
    ],
  });
});
