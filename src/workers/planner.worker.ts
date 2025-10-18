import { Worker } from "bullmq";
import { getRedis } from "../config/redis";
import { QUEUE_NAMES } from "../queues";
import { PlannerService } from "../services/planner.service";

const connection = getRedis();

export const plannerWorker = new Worker(
  QUEUE_NAMES.PLANNER,
  async (job) => {
    try {
      const { taskId } = job.data as { taskId: string };
      if (!taskId) throw new Error("Missing taskId");
      const res = await PlannerService.planTask(taskId);
      return res;
    } catch (err) {
      // Let BullMQ capture the error; also rethrow for proper failure status
      console.error("Planner job error:", err);
      throw err;
    }
  },
  { connection, concurrency: 2 }
);

plannerWorker.on("completed", (job, result) => {
  console.log(`✅ Planner completed: ${job.id}`, result);
});

plannerWorker.on("failed", (job, err) => {
  console.error(`❌ Planner failed: ${job?.id}`, err?.message || err);
});
