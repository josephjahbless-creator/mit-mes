-- CreateEnum
CREATE TYPE "OwnerType" AS ENUM ('Institution', 'Department', 'Unit');

-- AlterTable
ALTER TABLE "indicators" ADD COLUMN "ownerType" "OwnerType";
ALTER TABLE "indicators" ADD COLUMN "ownerInstitutionId" TEXT;
ALTER TABLE "indicators" ADD COLUMN "ownerDepartmentId" TEXT;
ALTER TABLE "indicators" ADD COLUMN "ownerUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_ownerInstitutionId_fkey" FOREIGN KEY ("ownerInstitutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_ownerDepartmentId_fkey" FOREIGN KEY ("ownerDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "indicators" ADD CONSTRAINT "indicators_ownerUnitId_fkey" FOREIGN KEY ("ownerUnitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
