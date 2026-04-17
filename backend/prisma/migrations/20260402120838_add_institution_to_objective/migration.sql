-- AlterTable
ALTER TABLE "strategic_objectives" ADD COLUMN     "institutionId" TEXT;

-- AddForeignKey
ALTER TABLE "strategic_objectives" ADD CONSTRAINT "strategic_objectives_institutionId_fkey" FOREIGN KEY ("institutionId") REFERENCES "institutions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
