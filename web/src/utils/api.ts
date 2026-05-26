import { createTRPCNext } from "@trpc/next";
import { httpBatchLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "~/server/api/root";

function getBaseUrl() {
  if (typeof window !== "undefined") return "";
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const api = createTRPCNext<AppRouter>({
  transformer: superjson,
  config() {
    return {
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
        }),
      ],
      queryClientConfig: {
        defaultOptions: {
          queries: { staleTime: 5 * 1000 },
        },
      },
    };
  },
  ssr: false,
});
