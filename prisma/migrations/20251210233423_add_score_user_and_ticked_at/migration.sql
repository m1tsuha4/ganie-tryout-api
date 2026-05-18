-- AlterTable
ALTER TABLE "UserExamSession" ADD COLUMN     "correct_answers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "empty_answers" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ticked_at" TIMESTAMP(3),
ADD COLUMN     "wrong_answers" INTEGER NOT NULL DEFAULT 0;
