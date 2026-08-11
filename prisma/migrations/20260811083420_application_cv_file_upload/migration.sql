-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "cvFileData" BYTEA,
ADD COLUMN     "cvFileMimeType" TEXT,
ADD COLUMN     "cvFileName" TEXT,
ALTER COLUMN "cvText" DROP NOT NULL;
