-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;

-- AlterTable
ALTER TABLE "indicator_actuals" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "strategic_objectives" ADD COLUMN     "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0;
