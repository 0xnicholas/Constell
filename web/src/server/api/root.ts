import { createTRPCRouter, publicProcedure } from "./trpc";
import { tracesRouter } from "./routers/traces";
import { promptsRouter } from "./routers/prompts";
import { metricsRouter } from "./routers/metrics";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  traces: tracesRouter,
  prompts: promptsRouter,
  metrics: metricsRouter,
});

export type AppRouter = typeof appRouter;
