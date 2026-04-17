-- DropForeignKey
ALTER TABLE "support_tickets" DROP CONSTRAINT "support_tickets_submittedById_fkey";

-- AlterTable
ALTER TABLE "support_tickets" ADD COLUMN     "guestEmail" TEXT,
ADD COLUMN     "guestName" TEXT,
ALTER COLUMN "submittedById" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
