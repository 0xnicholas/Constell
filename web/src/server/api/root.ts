import { createTRPCRouter, publicProcedure } from "./trpc";
import { tracesRouter } from "./routers/traces";
import { promptsRouter } from "./routers/prompts";
import { metricsRouter } from "./routers/metrics";
import { scoresRouter } from "./routers/scores";
import { evalsRouter } from "./routers/evals";
import { annotationsRouter } from "./routers/annotations";
import { datasetsRouter } from "./routers/datasets";
import { datasetItemsRouter } from "./routers/datasetItems";
import { datasetRunsRouter } from "./routers/datasetRuns";
import { datasetRunPresetsRouter } from "./routers/datasetRunPresets";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  traces: tracesRouter,
  prompts: promptsRouter,
  metrics: metricsRouter,
  scores: scoresRouter,
  evals: evalsRouter,
  annotations: annotationsRouter,
  datasets: datasetsRouter,
  datasetItems: datasetItemsRouter,
  datasetRuns: datasetRunsRouter,
  datasetRunPresets: datasetRunPresetsRouter,
});

export type AppRouter = typeof appRouter;
