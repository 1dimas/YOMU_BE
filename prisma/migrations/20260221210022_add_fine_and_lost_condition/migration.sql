-- AlterEnum
ALTER TYPE "BookCondition" ADD VALUE 'LOST';

-- AlterTable
ALTER TABLE "loans" ADD COLUMN     "fine_amount" INTEGER;
