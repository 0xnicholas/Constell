import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { authedProcedure, createTRPCRouter } from "../trpc";
import { prisma } from "@constell/shared/src/db";

export const datasetRunPresetsRouter = createTRPCRouter({
  list: authedProcedure
    .input(z.object({ projectId: z.string().optional() }))
    .query(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      return prisma.datasetRunPreset.findMany({
        where: { projectId },
        orderBy: { createdAt: "desc" },
      });
    }),

  create: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        name: z.string().min(1),
        description: z.string().optional(),
        promptId: z.string().optional(),
        promptVersion: z.number().optional(),
        model: z.string().min(1),
        modelParams: z.record(z.unknown()).optional(),
        evalTemplateIds: z.array(z.string()).default([]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      try {
        return await prisma.datasetRunPreset.create({
          data: {
            projectId,
            name: input.name,
            description: input.description,
            promptId: input.promptId,
            promptVersion: input.promptVersion,
            model: input.model,
            modelParams: (input.modelParams ?? undefined) as never,
            evalTemplateIds: input.evalTemplateIds,
          },
        });
      } catch (err) {
        if (err instanceof Error && err.message.includes("Unique constraint")) {
          throw new TRPCError({ code: "CONFLICT", message: "Preset name already exists" });
        }
        throw err;
      }
    }),

  update: authedProcedure
    .input(
      z.object({
        projectId: z.string().optional(),
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        promptId: z.string().optional(),
        promptVersion: z.number().optional(),
        model: z.string().min(1).optional(),
        modelParams: z.record(z.unknown()).optional(),
        evalTemplateIds: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      const data: Record<string, unknown> = {};
      if (input.name !== undefined) data.name = input.name;
      if (input.description !== undefined) data.description = input.description;
      if (input.promptId !== undefined) data.promptId = input.promptId;
      if (input.promptVersion !== undefined) data.promptVersion = input.promptVersion;
      if (input.model !== undefined) data.model = input.model;
      if (input.modelParams !== undefined) data.modelParams = input.modelParams;
      if (input.evalTemplateIds !== undefined) data.evalTemplateIds = input.evalTemplateIds;

      return prisma.datasetRunPreset.update({
        where: { id: input.id, projectId },
        data,
      });
    }),

  delete: authedProcedure
    .input(z.object({ projectId: z.string().optional(), id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const projectId = ctx.projectId ?? input.projectId;
      if (!projectId) throw new TRPCError({ code: "BAD_REQUEST", message: "projectId required" });

      await prisma.datasetRunPreset.delete({
        where: { id: input.id, projectId },
      });
      return { success: true };
    }),
});
