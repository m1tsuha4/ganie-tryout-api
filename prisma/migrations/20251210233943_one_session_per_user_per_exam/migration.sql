/*
  Warnings:

  - A unique constraint covering the columns `[user_id,exam_id]` on the table `UserExamSession` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "UserExamSession_user_id_exam_id_key" ON "UserExamSession"("user_id", "exam_id");
