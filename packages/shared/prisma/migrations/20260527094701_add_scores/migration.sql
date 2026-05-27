-- CreateEnum
CREATE TYPE "ScoreDataType" AS ENUM ('NUMERIC', 'BOOLEAN', 'CATEGORICAL');

-- CreateEnum
CREATE TYPE "ScoreSource" AS ENUM ('API', 'UI', 'EVAL');

-- CreateTable
CREATE TABLE "score_configs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data_type" "ScoreDataType" NOT NULL,
    "description" TEXT,
    "min_value" DOUBLE PRECISION,
    "max_value" DOUBLE PRECISION,

    CONSTRAINT "score_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "observation_id" TEXT,
    "name" TEXT NOT NULL,
    "config_id" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "string_value" TEXT,
    "source" "ScoreSource" NOT NULL,
    "comment" TEXT,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "score_configs_project_id_idx" ON "score_configs"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "score_configs_project_id_name_key" ON "score_configs"("project_id", "name");

-- CreateIndex
CREATE INDEX "scores_project_id_trace_id_idx" ON "scores"("project_id", "trace_id");

-- CreateIndex
CREATE INDEX "scores_project_id_observation_id_idx" ON "scores"("project_id", "observation_id");

-- CreateIndex
CREATE INDEX "scores_project_id_name_idx" ON "scores"("project_id", "name");

-- CreateIndex
CREATE INDEX "scores_created_at_idx" ON "scores"("created_at");

-- AddForeignKey
ALTER TABLE "score_configs" ADD CONSTRAINT "score_configs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_trace_id_fkey" FOREIGN KEY ("trace_id") REFERENCES "Trace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_observation_id_fkey" FOREIGN KEY ("observation_id") REFERENCES "Observation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_config_id_fkey" FOREIGN KEY ("config_id") REFERENCES "score_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
