/*
  Warnings:

  - You are about to drop the column `book_condition` on the `loans` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "loans" DROP COLUMN "book_condition",
ADD COLUMN     "is_damaged" BOOLEAN NOT NULL DEFAULT false;

-- DropEnum
DROP TYPE "BookCondition";
