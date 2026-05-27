-- CreateEnum
CREATE TYPE "AnnotationStatus" AS ENUM ('PENDING', 'ASSIGNED', 'ANNOTATED', 'REVIEWED');

-- CreateTable
CREATE TABLE "annotation_queues" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "score_config_id" TEXT,

    CONSTRAINT "annotation_queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "annotation_queue_items" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "queue_id" TEXT NOT NULL,
    "trace_id" TEXT NOT NULL,
    "status" "AnnotationStatus" NOT NULL DEFAULT 'PENDING',
    "assigned_to" TEXT,
    "score_value" DOUBLE PRECISION,
    "string_value" TEXT,
    "comment" TEXT,
    "reviewed_by" TEXT,

    CONSTRAINT "annotation_queue_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "annotation_queues_project_id_idx" ON "annotation_queues"("project_id");

-- CreateIndex
CREATE UNIQUE INDEX "annotation_queues_project_id_name_key" ON "annotation_queues"("project_id", "name");

-- CreateIndex
CREATE INDEX "annotation_queue_items_queue_id_status_idx" ON "annotation_queue_items"("queue_id", "status");

-- CreateIndex
CREATE INDEX "annotation_queue_items_assigned_to_status_idx" ON "annotation_queue_items"("assigned_to", "status");

-- AddForeignKey
ALTER TABLE "annotation_queues" ADD CONSTRAINT "annotation_queues_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_queues" ADD CONSTRAINT "annotation_queues_score_config_id_fkey" FOREIGN KEY ("score_config_id") REFERENCES "score_configs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_queue_items" ADD CONSTRAINT "annotation_queue_items_queue_id_fkey" FOREIGN KEY ("queue_id") REFERENCES "annotation_queues"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_queue_items" ADD CONSTRAINT "annotation_queue_items_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "annotation_queue_items" ADD CONSTRAINT "annotation_queue_items_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
