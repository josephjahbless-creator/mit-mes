-- AlterTable
ALTER TABLE "indicator_actuals" ADD COLUMN     "departmentId" TEXT,
ADD COLUMN     "unitId" TEXT;

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
