-- CreateEnum
CREATE TYPE "TypeQuestion" AS ENUM ('Verbal', 'Kuantitatif', 'Penalaran', 'StructureAndExpression', 'ReadingComprehension');

-- AlterTable
ALTER TABLE "Question" ADD COLUMN     "type_question" "TypeQuestion" NOT NULL DEFAULT 'Verbal';
