/*
  Warnings:

  - You are about to drop the column `nis` on the `users` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "users_nis_key";

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "description" TEXT,
ALTER COLUMN "color" DROP NOT NULL,
ALTER COLUMN "color" SET DEFAULT '#3b82f6';

-- AlterTable
ALTER TABLE "users" DROP COLUMN "nis";
