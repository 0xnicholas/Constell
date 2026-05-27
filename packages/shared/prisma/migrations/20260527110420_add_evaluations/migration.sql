-- CreateEnum
CREATE TYPE "EvalRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "eval_templates" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt" TEXT NOT NULL,
    "output_schema" JSONB,
    "score_name" TEXT NOT NULL,
    "score_data_type" "ScoreDataType" NOT NULL,
    "model" TEXT NOT NULL DEFAULT 'gpt-4o-mini',
    "temperature" DOUBLE PRECISION DEFAULT 0.0,

    CONSTRAINT "eval_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "eval_runs" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "status" "EvalRunStatus" NOT NULL DEFAULT 'PENDING',
    "from_date" TIMESTAMP(3),
    "to_date" TIMESTAMP(3),
    "trace_count" INTEGER,
    "processed_count" INTEGER,
    "score_count" INTEGER,
    "average_score" DOUBLE PRECISION,
    "error_message" TEXT,
    "job_id" TEXT,

    CONSTRAINT "eval_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eval_templates_project_id_idx" ON "eval_templates"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "eval_templates_project_id_name_key" ON "eval_templates"("project_id", "name");

-- CreateIndex
CREATE INDEX "eval_runs_project_id_template_id_idx" ON "eval_runs"("project_id", "template_id");

-- CreateIndex
CREATE INDEX "eval_runs_status_idx" ON "eval_runs"("status");

-- AddForeignKey
ALTER TABLE "eval_templates" ADD CONSTRAINT "eval_templates_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eval_runs" ADD CONSTRAINT "eval_runs_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "eval_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;
