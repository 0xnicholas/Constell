import { initTRPC, TRPCError } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";
import superjson from "superjson";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth";
import { validateApiKey } from "~/features/public-api/server/apiKeyAuth";

export const createTRPCContext = async (opts: CreateNextContextOptions) => {
  const { req, res } = opts;

  // Try session auth first
  const session = await getServerSession(req, res, authOptions);

  // Fall back to API key auth for programmatic access
  let apiKey: { projectId: string; apiKeyId: string } | null = null;
  if (!session && req.headers.authorization) {
    try {
      apiKey = await validateApiKey(req.headers.authorization);
    } catch {
      apiKey = null;
    }
  }

  return {
    session,
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
 * Middleware that enforces authentication (session OR API key).
 */
export const authedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.session && !ctx.apiKey) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      // Normalize projectId from whichever auth mechanism succeeded
      projectId: ctx.apiKey?.projectId ?? null,
    },
  });
});

export const publicProcedure = t.procedure;
