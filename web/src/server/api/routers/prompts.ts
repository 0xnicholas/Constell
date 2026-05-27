import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { prisma } from "@constell/shared/src/db";

import {
  getPromptFromCache,
  setPromptInCache,
  invalidatePromptCache,
} from "@constell/shared/src/server";
import Redis from "ioredis";

const redis = new Redis({
  host: process.env.REDIS_HOST || "localhost",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_AUTH,
  maxRetriesPerRequest: 1,
});

export const promptsRouter = createTRPCRouter({
  list: authedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      return prisma.prompt.findMany({
        where: { projectId },
        include: {
          versions: {
            include: { labels: true },
            orderBy: { version: "desc" },
            take: 1,
          },
        },
        orderBy: { updatedAt: "desc" },
      });
    }),

  create: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string().min(1).max(128),
        content: z.string().min(1),
        config: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      const prompt = await prisma.prompt.create({
        data: {
          projectId,
          name: input.name,
          versions: {
            create: {
              version: 1,
              content: input.content,
              config: (input.config ?? {}) as Prisma.InputJsonValue,
              createdBy: ctx.session?.user?.email ?? "api",
            },
          },
        },
        include: { versions: true },
      });
      await invalidatePromptCache(projectId, input.name, redis);
      return prompt;
    }),

  detail: authedProcedure
    .input(z.object({ projectId: z.string().optional(), name: z.string() }))
    .query(async ({ ctx, input }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      const prompt = await prisma.prompt.findFirst({
        where: { projectId, name: input.name },
        include: {
          versions: { include: { labels: true }, orderBy: { version: "desc" } },
        },
      });
      if (!prompt) throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      return prompt;
    }),

  createVersion: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string(),
        content: z.string().min(1),
        config: z.record(z.unknown()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      const prompt = await prisma.prompt.findFirst({
        where: { projectId, name: input.name },
      });
      if (!prompt) throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      const maxVersion = await prisma.promptVersion.aggregate({
        where: { promptId: prompt.id },
        _max: { version: true },
      });
      const nextVersion = (maxVersion._max.version ?? 0) + 1;
      const version = await prisma.promptVersion.create({
        data: {
          promptId: prompt.id,
          version: nextVersion,
          content: input.content,
          config: (input.config ?? {}) as Prisma.InputJsonValue,
          createdBy: ctx.session?.user?.email ?? "api",
        },
      });
      await invalidatePromptCache(projectId, input.name, redis);
      return version;
    }),

  setLabel: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string(),
        version: z.number().int().positive(),
        label: z.string().min(1).max(64),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });
      const prompt = await prisma.prompt.findFirst({
        where: { projectId, name: input.name },
      });
      if (!prompt) throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });
      const version = await prisma.promptVersion.findFirst({
        where: { promptId: prompt.id, version: input.version },
      });
      if (!version) throw new TRPCError({ code: "NOT_FOUND", message: "Version not found" });
      await prisma.promptVersionLabel.upsert({
        where: {
          promptVersionId_label: {
            promptVersionId: version.id,
            label: input.label,
          },
        },
        create: { promptVersionId: version.id, label: input.label },
        update: {},
      });
      await invalidatePromptCache(projectId, input.name, redis);
      return { ok: true };
    }),

  getByLabel: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string(),
        label: z.string().default("latest"),
      })
    )
    .query(async ({ ctx, input }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const cached = await getPromptFromCache(projectId, input.name, input.label, redis);
      if (cached) return cached;

      const prompt = await prisma.prompt.findFirst({
        where: { projectId, name: input.name },
        include: {
          versions: {
            include: { labels: true },
            orderBy: { version: "desc" },
          },
        },
      });
      if (!prompt) throw new TRPCError({ code: "NOT_FOUND", message: "Prompt not found" });

      const version =
        input.label === "latest"
          ? prompt.versions[0]
          : prompt.versions.find((v) => v.labels.some((l) => l.label === input.label));
      if (!version)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Version with label '${input.label}' not found`,
        });

      const result = {
        content: version.content,
        config: version.config as Record<string, unknown> | null,
        version: version.version,
      };
      await setPromptInCache(projectId, input.name, input.label, result, redis);
      return result;
    }),
});
