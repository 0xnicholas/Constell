import { PrismaAdapter } from "@next-auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import type { NextAuthOptions } from "next-auth";
import { prisma } from "@constell/shared/src/db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        // Phase C: minimal viable login — look up user by email only (no password hashing yet)
        if (!credentials?.email) return null;
        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        return user ? { id: user.id, email: user.email, name: user.name } : null;
      },
    }),
  ],
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        // Resolve first project from user's first membership → organization → project
        const membership = await prisma.membership.findFirst({
          where: { userId: user.id },
          include: {
            organization: {
              include: {
                projects: { take: 1, orderBy: { createdAt: "asc" } },
              },
            },
          },
        });
        const projectId = membership?.organization?.projects[0]?.id ?? null;
        token.projectId = projectId;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.userId as string;
        session.projectId = token.projectId ?? null;
      }
      return session;
    },
  },
};
