import { createTRPCRouter, publicProcedure } from "./trpc";
import { tracesRouter } from "./routers/traces";
import { promptsRouter } from "./routers/prompts";
import { metricsRouter } from "./routers/metrics";
import { scoresRouter } from "./routers/scores";
import { evalsRouter } from "./routers/evals";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  traces: tracesRouter,
  prompts: promptsRouter,
  metrics: metricsRouter,
  scores: scoresRouter,
  evals: evalsRouter,
});

export type AppRouter = typeof appRouter;
