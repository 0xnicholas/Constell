import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req } = opts;

  // API key auth for programmatic access
  let apiKey: { projectId: string; apiKeyId: string } | null = null;
  if (req.headers.authorization) {
    try {
      apiKey = await validateApiKey(req.headers.authorization);
    } catch {
      apiKey = null;
    }
  }

  return {
    apiKey,
  };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof Error ? undefined : error.cause,
      },
    };
  },
});

export const createTRPCRouter = t.router;

/**
 * Middleware that enforces API key authentication.
 * Session auth will be added when the login UI is built (v0.3+).
 */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.apiKey) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      projectId: ctx.apiKey.projectId,
    },
  });
});

export const publicProcedure = t.procedure;
