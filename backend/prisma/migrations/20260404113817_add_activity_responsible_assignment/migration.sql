-- AlterTable
ALTER TABLE "activities" ADD COLUMN     "responsibleDepartmentId" TEXT,
ADD COLUMN     "responsibleInstitutionId" TEXT,
ADD COLUMN     "responsibleUnitId" TEXT;

-- AlterTable
ALTER TABLE "indicator_actuals" ADD COLUMN     "activityId" TEXT;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_responsibleInstitutionId_fkey" FOREIGN KEY ("responsibleInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_responsibleUnitId_fkey" FOREIGN KEY ("responsibleUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicator_actuals" ADD CONSTRAINT "indicator_actuals_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "activities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
