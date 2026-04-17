-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubmissionStatus" ADD VALUE 'pending_supervisor';
ALTER TYPE "SubmissionStatus" ADD VALUE 'pending_me';

-- AlterTable
ALTER TABLE "indicator_actuals" ADD COLUMN     "supervisedAt" TIMESTAMP(3),
ADD COLUMN     "supervisedById" TEXT,
ADD COLUMN     "supervisorNote" TEXT;

-- CreateTable
CREATE TABLE "reporting_period_locks" (
    "id" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "period" "ReportingPeriod" NOT NULL,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "lockedById" TEXT,
    "lockedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporting_period_locks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporting_calendars" (
    "id" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "period" "ReportingPeriod" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "reminderDays" INTEGER NOT NULL DEFAULT 7,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporting_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_comments" (
    "id" TEXT NOT NULL,
    "actualId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "comment" TEXT NOT NULL,
    "isInternal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "submission_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedType" TEXT,
    "relatedId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "category" TEXT NOT NULL DEFAULT 'general',
    "fiscalYear" TEXT,
    "period" TEXT,
    "institutionId" TEXT,
    "departmentId" TEXT,
    "unitId" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "framework_versions" (
    "id" TEXT NOT NULL,
    "versionLabel" TEXT NOT NULL,
    "fiscalYear" TEXT NOT NULL,
    "description" TEXT,
    "snapshot" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT NOT NULL,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "framework_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reporting_period_locks_fiscalYear_period_key" ON "reporting_period_locks"("fiscalYear", "period");

-- CreateIndex
CREATE UNIQUE INDEX "reporting_calendars_fiscalYear_period_key" ON "reporting_calendars"("fiscalYear", "period");

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_supervisedById_fkey" FOREIGN KEY ("supervisedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_period_locks" ADD CONSTRAINT "reporting_period_locks_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporting_calendars" ADD CONSTRAINT "reporting_calendars_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_actualId_fkey" FOREIGN KEY ("actualId") REFERENCES "indicator_actuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_comments" ADD CONSTRAINT "submission_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "framework_versions" ADD CONSTRAINT "framework_versions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "framework_versions" ADD CONSTRAINT "framework_versions_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
