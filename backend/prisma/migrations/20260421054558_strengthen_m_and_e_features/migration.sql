-- CreateEnum
CREATE TYPE "IndicatorType" AS ENUM ('output_indicator', 'outcome_indicator', 'impact_indicator', 'process_indicator');

-- CreateEnum
CREATE TYPE "ProgressDirection" AS ENUM ('increasing', 'decreasing', 'stable');

-- CreateEnum
CREATE TYPE "IndicatorStatus" AS ENUM ('active', 'discontinued', 'under_revision', 'retired');

-- AlterTable
ALTER TABLE "indicator_actuals" ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "supervisorReason" TEXT;

-- AlterTable
ALTER TABLE "indicators" ADD COLUMN     "collectionMethod" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "indicatorStatus" "IndicatorStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "indicatorType" "IndicatorType",
ADD COLUMN     "maxValue" DOUBLE PRECISION,
ADD COLUMN     "minValue" DOUBLE PRECISION,
ADD COLUMN     "progressDirection" "ProgressDirection" NOT NULL DEFAULT 'increasing',
ADD COLUMN     "verificationSource" TEXT;

-- CreateTable
CREATE TABLE "disaggregations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isGlobal" BOOLEAN NOT NULL DEFAULT true,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disaggregations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disaggregation_options" (
    "id" TEXT NOT NULL,
    "disaggregationId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "code" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disaggregation_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actual_disaggregations" (
    "id" TEXT NOT NULL,
    "actualId" TEXT NOT NULL,
    "indicatorId" TEXT NOT NULL,
    "disaggregationId" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "value" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actual_disaggregations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "theory_of_change" (
    "id" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "narrative" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "theory_of_change_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toc_assumptions" (
    "id" TEXT NOT NULL,
    "tocId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "category" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toc_assumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "toc_risks" (
    "id" TEXT NOT NULL,
    "tocId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "likelihood" TEXT,
    "impact" TEXT,
    "mitigation" TEXT,
    "orderNo" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "toc_risks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "disaggregation_options_disaggregationId_label_key" ON "disaggregation_options"("disaggregationId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "actual_disaggregations_actualId_disaggregationId_optionId_key" ON "actual_disaggregations"("actualId", "disaggregationId", "optionId");

-- CreateIndex
CREATE UNIQUE INDEX "theory_of_change_level_referenceId_key" ON "theory_of_change"("level", "referenceId");

-- AddForeignKey
ALTER TABLE "disaggregation_options" ADD CONSTRAINT "disaggregation_options_disaggregationId_fkey" FOREIGN KEY ("disaggregationId") REFERENCES "disaggregations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_disaggregations" ADD CONSTRAINT "actual_disaggregations_actualId_fkey" FOREIGN KEY ("actualId") REFERENCES "indicator_actuals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_disaggregations" ADD CONSTRAINT "actual_disaggregations_indicatorId_fkey" FOREIGN KEY ("indicatorId") REFERENCES "indicators"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_disaggregations" ADD CONSTRAINT "actual_disaggregations_disaggregationId_fkey" FOREIGN KEY ("disaggregationId") REFERENCES "disaggregations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "actual_disaggregations" ADD CONSTRAINT "actual_disaggregations_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "disaggregation_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "theory_of_change" ADD CONSTRAINT "theory_of_change_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toc_assumptions" ADD CONSTRAINT "toc_assumptions_tocId_fkey" FOREIGN KEY ("tocId") REFERENCES "theory_of_change"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "toc_risks" ADD CONSTRAINT "toc_risks_tocId_fkey" FOREIGN KEY ("tocId") REFERENCES "theory_of_change"("id") ON DELETE CASCADE ON UPDATE CASCADE;
