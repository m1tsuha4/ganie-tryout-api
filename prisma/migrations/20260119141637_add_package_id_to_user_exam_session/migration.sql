/*
  Warnings:

  - A unique constraint covering the columns `[user_id,exam_id,package_id]` on the table `UserExamSession` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `package_id` to the `UserExamSession` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "UserExamSession_user_id_exam_id_key";

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "payment_proof_url" TEXT;

-- AlterTable
ALTER TABLE "UserExamSession" ADD COLUMN     "package_id" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "UserExamSession_user_id_exam_id_package_id_key" ON "UserExamSession"("user_id", "exam_id", "package_id");

-- AddForeignKey
ALTER TABLE "UserExamSession" ADD CONSTRAINT "UserExamSession_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "Package"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
