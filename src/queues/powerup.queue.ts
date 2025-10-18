import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq";
import { getRedis } from "../config/redis";
import {
  PowerupService,
  PowerupRunInputType,
} from "../services/powerup.service";

const connection = getRedis();

export const QUEUE_NAME_POWERUP = "powerup";

export const powerupQueue = new Queue(QUEUE_NAME_POWERUP, { connection });
export const powerupEvents = new QueueEvents(QUEUE_NAME_POWERUP, {
  connection,
});

const defaultJobOpts: JobsOptions = {
  removeOnComplete: 500,
  removeOnFail: 200,
  attempts: 2,
  backoff: { type: "exponential", delay: 2000 },
};

export async function enqueuePowerupRun(payload: PowerupRunInputType) {
  return powerupQueue.add("powerup-run", payload, {
    ...defaultJobOpts,
    jobId: `powerup:${payload.workspaceId}:${payload.powerupKey}:${Date.now()}`,
  });
}

// Worker (optional to start in the same process; otherwise create a separate entrypoint)
export const powerupWorker = new Worker(
  QUEUE_NAME_POWERUP,
  async (job) => {
    const payload = job.data as PowerupRunInputType;
    const res = await PowerupService.run(payload);
    return res;
  },
  { connection, concurrency: 3 }
);

powerupWorker.on("completed", (job, result) => {
  console.log(`✅ Powerup completed ${job.id}`, {
    powerupKey: (job.data as any)?.powerupKey,
    runId: (result as any)?.runId,
  });
});
powerupWorker.on("failed", (job, err) => {
  console.error(`❌ Powerup failed ${job?.id}`, err);
});
