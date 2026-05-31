-- CreateTable
CREATE TABLE "Surveyor" (
    "id" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Surveyor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Surveyor_handle_key" ON "Surveyor"("handle");

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_authorId_fkey";

-- AlterTable
ALTER TABLE "Question" ADD COLUMN "surveyorId" TEXT,
ALTER COLUMN "authorId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_surveyorId_fkey" FOREIGN KEY ("surveyorId") REFERENCES "Surveyor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
