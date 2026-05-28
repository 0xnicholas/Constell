-- CreateEnum
CREATE TYPE "DatasetItemStatus" AS ENUM ('ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DatasetRunStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "input_schema" JSONB,
    "expected_output_schema" JSONB,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" "DatasetItemStatus" NOT NULL DEFAULT 'ACTIVE',
    "input" JSONB,
    "expected_output" JSONB,
    "metadata" JSONB,
    "source_trace_id" TEXT,
    "source_observation_id" TEXT,
    "dataset_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_run_presets" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "prompt_id" TEXT,
    "prompt_version" INTEGER,
    "model" TEXT NOT NULL,
    "model_params" JSONB,
    "eval_template_ids" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_run_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "DatasetRunStatus" NOT NULL DEFAULT 'PENDING',
    "metadata" JSONB,
    "dataset_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dataset_run_items" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "dataset_run_id" TEXT NOT NULL,
    "dataset_item_id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "observation_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dataset_run_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "datasets_project_id_idx" ON "datasets"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "datasets_id_project_id_key" ON "datasets"("id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "datasets_project_id_name_key" ON "datasets"("project_id", "name");

-- CreateIndex
CREATE INDEX "dataset_items_dataset_id_idx" ON "dataset_items"("dataset_id");

-- CreateIndex
CREATE INDEX "dataset_items_source_trace_id_idx" ON "dataset_items"("source_trace_id");

-- CreateIndex
CREATE INDEX "dataset_items_source_observation_id_idx" ON "dataset_items"("source_observation_id");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_run_presets_project_id_name_key" ON "dataset_run_presets"("project_id", "name");

-- CreateIndex
CREATE INDEX "dataset_runs_dataset_id_idx" ON "dataset_runs"("dataset_id");

-- CreateIndex
CREATE INDEX "dataset_runs_status_idx" ON "dataset_runs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_runs_id_project_id_key" ON "dataset_runs"("id", "project_id");

-- CreateIndex
CREATE UNIQUE INDEX "dataset_runs_dataset_id_project_id_name_key" ON "dataset_runs"("dataset_id", "project_id", "name");

-- CreateIndex
CREATE INDEX "dataset_run_items_dataset_run_id_idx" ON "dataset_run_items"("dataset_run_id");

-- CreateIndex
CREATE INDEX "dataset_run_items_dataset_item_id_idx" ON "dataset_run_items"("dataset_item_id");

-- CreateIndex
CREATE INDEX "dataset_run_items_trace_id_idx" ON "dataset_run_items"("trace_id");

-- AddForeignKey
ALTER TABLE "datasets" ADD CONSTRAINT "datasets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_items" ADD CONSTRAINT "dataset_items_dataset_id_project_id_fkey" FOREIGN KEY ("dataset_id", "project_id") REFERENCES "datasets"("id", "project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_presets" ADD CONSTRAINT "dataset_run_presets_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_runs" ADD CONSTRAINT "dataset_runs_dataset_id_project_id_fkey" FOREIGN KEY ("dataset_id", "project_id") REFERENCES "datasets"("id", "project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_run_id_project_id_fkey" FOREIGN KEY ("dataset_run_id", "project_id") REFERENCES "dataset_runs"("id", "project_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dataset_run_items" ADD CONSTRAINT "dataset_run_items_dataset_item_id_fkey" FOREIGN KEY ("dataset_item_id") REFERENCES "dataset_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
