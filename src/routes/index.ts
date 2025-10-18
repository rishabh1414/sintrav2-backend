import { Router } from "express";
import { authRouter } from "./auth.routes";
import { workspacesRouter } from "./workspaces.routes";
import { employeesRouter } from "./employees.routes";
import { powerupsRouter } from "./powerups.routes";
import { tasksRouter } from "./tasks.routes";
import { stepsRouter } from "./steps.routes";
import { brainRouter } from "./brain.routes";
import { agentsRouter } from "./agents.routes";
import { messagesRouter } from "./messages.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/workspaces", workspacesRouter);
apiRouter.use("/employees", employeesRouter);
apiRouter.use("/powerups", powerupsRouter);
apiRouter.use("/tasks", tasksRouter);
apiRouter.use("/steps", stepsRouter);
apiRouter.use("/brain", brainRouter);
apiRouter.use("/agents", agentsRouter);
apiRouter.use("/messages", messagesRouter);

apiRouter.get("/ping", (_req, res) => res.json({ pong: true }));
