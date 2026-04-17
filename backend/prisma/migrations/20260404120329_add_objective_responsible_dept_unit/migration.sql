-- AlterTable
ALTER TABLE "strategic_objectives" ADD COLUMN     "responsibleDepartmentId" TEXT,
ADD COLUMN     "responsibleUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_responsibleUnitId_fkey" FOREIGN KEY ("responsibleUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
