import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & { id: string };
    projectId: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    projectId?: string | null;
  }
}
