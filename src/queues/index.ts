import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq";
import { getRedis } from "../config/redis";

const connection = getRedis(); // ioredis instance

// ---- Queue Names ----
export const QUEUE_NAMES = {
  PLANNER: "planner",
  // add more later: POWERUP, INDEXING, WEBHOOK, SCHEDULER, ...
} as const;

// ---- Queues ----
export const plannerQueue = new Queue(QUEUE_NAMES.PLANNER, { connection });

// Queue events (optional, useful for logging/metrics)
export const plannerEvents = new QueueEvents(QUEUE_NAMES.PLANNER, {
  connection,
});

// Default job options (tweak as needed)
export const defaultJobOpts: JobsOptions = {
  removeOnComplete: 1000,
  removeOnFail: 1000,
  attempts: 2,
  backoff: { type: "exponential", delay: 2000 },
};

// ---- Helpers ----
export async function enqueuePlanTask(taskId: string) {
  return plannerQueue.add(
    "plan-task",
    { taskId },
    {
      ...defaultJobOpts,
      jobId: `plan:${taskId}`, // idempotent: same task won't enqueue dupes
    }
  );
}

// Export a registry if you add more queues later
export const Queues = {
  planner: plannerQueue,
};
