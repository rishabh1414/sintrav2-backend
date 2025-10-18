import { Queue, Worker, QueueEvents, JobsOptions } from "bullmq";
import { getRedis } from "../config/redis";
import { StepService } from "../services/step.service";

export const QUEUE_NAME_STEP = "step-executor";
const connection = getRedis();

export const stepQueue = new Queue(QUEUE_NAME_STEP, { connection });
export const stepEvents = new QueueEvents(QUEUE_NAME_STEP, { connection });

const defaultJobOpts: JobsOptions = {
  removeOnComplete: 1000,
  removeOnFail: 500,
  attempts: 2,
  backoff: { type: "exponential", delay: 2000 },
};

export async function enqueueStep(stepId: string) {
  return stepQueue.add(
    "execute-step",
    { stepId },
    { ...defaultJobOpts, jobId: stepId }
  );
}

// Worker
export const stepWorker = new Worker(
  QUEUE_NAME_STEP,
  async (job) => {
    const { stepId } = job.data as { stepId: string };
    return await StepService.executeStep(stepId);
  },
  { connection, concurrency: 4 }
);

stepWorker.on("completed", (job) => {
  console.log(`✅ Step executed: ${job.id}`);
});
stepWorker.on("failed", (job, err) => {
  console.error(`❌ Step failed: ${job?.id}`, err?.message || err);
});
