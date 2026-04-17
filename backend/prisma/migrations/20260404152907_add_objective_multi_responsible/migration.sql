-- DropForeignKey
ALTER TABLE "strategic_objectives" DROP CONSTRAINT "strategic_objectives_responsibleDepartmentId_fkey";

-- DropForeignKey
ALTER TABLE "strategic_objectives" DROP CONSTRAINT "strategic_objectives_responsibleUnitId_fkey";

-- AlterTable
ALTER TABLE "strategic_objectives" DROP COLUMN "responsibleDepartmentId",
DROP COLUMN "responsibleUnitId";

-- CreateTable
CREATE TABLE "objective_responsibles" (
    "id" TEXT NOT NULL,
    "objectiveId" TEXT NOT NULL,
    "institutionId" TEXT,
    "departmentId" TEXT,
    "unitId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "objective_responsibles_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "objective_responsibles" ADD CONSTRAINT "objective_responsibles_objectiveId_fkey" FOREIGN KEY ("objectiveId") REFERENCES "strategic_objectives"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_responsibles" ADD CONSTRAINT "objective_responsibles_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_responsibles" ADD CONSTRAINT "objective_responsibles_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "objective_responsibles" ADD CONSTRAINT "objective_responsibles_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
