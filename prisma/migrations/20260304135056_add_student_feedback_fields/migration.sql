-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "reported_damaged" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "student_note" TEXT;

-- CreateIndex
CREATE INDEX "loans_book_id_idx" ON "loans"("book_id");
