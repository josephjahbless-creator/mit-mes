-- CreateEnum
CREATE TYPE "SwotCategory" AS ENUM ('strength', 'weakness', 'opportunity', 'threat');

-- CreateTable
CREATE TABLE "swot_entries" (
    "id" TEXT NOT NULL,
    "category" "SwotCategory" NOT NULL,
    "area" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "institutionId" TEXT,
    "fiscalYear" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "swot_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "swot_entries" ADD CONSTRAINT "swot_entries_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "swot_entries" ADD CONSTRAINT "swot_entries_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
