import { createTRPCRouter, publicProcedure } from "./trpc";
import { tracesRouter } from "./routers/traces";

export const appRouter = createTRPCRouter({
  health: publicProcedure.query(() => {
    return { status: "ok" };
  }),
  traces: tracesRouter,
});

export type AppRouter = typeof appRouter;
