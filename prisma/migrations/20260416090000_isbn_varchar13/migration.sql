-- Strip dashes from existing ISBN data first
UPDATE "books" SET "isbn" = REPLACE("isbn", '-', '') WHERE "isbn" LIKE '%-%';

-- AlterTable: change isbn column from text to varchar(13)
ALTER TABLE "books" ALTER COLUMN "isbn" SET DATA TYPE VARCHAR(13);
