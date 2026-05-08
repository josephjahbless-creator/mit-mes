-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "FormulaType" ADD VALUE 'yoy_growth';
ALTER TYPE "FormulaType" ADD VALUE 'weighted_score';
ALTER TYPE "FormulaType" ADD VALUE 'cost_per_output';
ALTER TYPE "FormulaType" ADD VALUE 'ppt_change';
ALTER TYPE "FormulaType" ADD VALUE 'binary';
ALTER TYPE "FormulaType" ADD VALUE 'rate_per_n';
ALTER TYPE "FormulaType" ADD VALUE 'average_value';
