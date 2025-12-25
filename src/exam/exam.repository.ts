import { Injectable } from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ExamRepository {
  constructor(private readonly prismaService: PrismaService) {}

  async findUserPackage(userId: string, packageId: number) {
    return this.prismaService.userPackage.findFirst({
      where: {
        package_id: packageId,
        user_id: userId,
      },
    });
  }

  async findPackageExamWithQeustions(packageId: number) {
    return this.prismaService.packageExam.findMany({
      where: { package_id: packageId },
      include: {
        exam: {
          include: {
            questions: {
              include: {
                question_choices: true,
              },
            },
          },
        },
      },
      orderBy: { exam: { id: "asc" } },
    });
  }

  async createUserExamSession(data: {
    user_id: string;
    exam_id: number;
    question_order: number[];
    choice_order: Record<number, number[]>;
  }) {
    return this.prismaService.userExamSession.create({
      data,
    });
  }

  async findSessionById(sessionId: number) {
    return this.prismaService.userExamSession.findUnique({
      where: { id: sessionId },
    });
  }

  async createUserAnswer(
    tx: any,
    payload: { session_id: number; question_id: number; choice_id: number },
  ) {
    return tx.userAnswer.create({ data: payload });
  }

  async updateSessionPostion(
    tx: any,
    sessionId: number,
    data: Partial<{ current_position: number; completed_at: Date }>,
  ) {
    return tx.userExamSession.update({ where: { id: sessionId }, data });
  }

  async findQuestionWithChoices(questionId: number) {
    return this.prismaService.question.findUnique({
      where: { id: questionId },
      include: { question_choices: true },
    });
  }

  async findByExamId(examId: number) {
    return this.prismaService.exam.findUnique({
      where: { id: examId },
    });
  }

  async updateSessionPositionRaw(sessionId: number, data: any) {
    const safeData: Record<string, any> = {};

    if (data.started_at !== undefined) safeData.started_at = data.started_at;
    if (data.completed_at !== undefined)
      safeData.completed_at = data.completed_at;
    if (data.current_position !== undefined)
      safeData.current_position = data.current_position;

    return this.prismaService.userExamSession.update({
      where: { id: sessionId },
      data: safeData as any,
    });
  }

  async findExistingSessionForUserExam(userId: string, examId: number) {
    return this.prismaService.userExamSession.findFirst({
      where: {
        exam_id: examId,
        user_id: userId,
      },
    });
  }

  async findUserAnswerForSessionQuestion(
    sessionId: number,
    questionId: number,
  ) {
    return this.prismaService.userAnswer.findFirst({
      where: {
        session_id: sessionId,
        question_id: questionId,
      },
    });
  }

  async findAnswerForSession(sessionId: number) {
    return this.prismaService.userAnswer.findMany({
      where: { session_id: sessionId },
      select: { question_id: true },
    });
  }

  async updateTick(sessionId: number, now: Date) {
    return this.prismaService.userExamSession.update({
      where: { id: sessionId },
      data: { ticked_at: now },
    });
  }

  async findUserAnswer(sessionId: number) {
    return this.prismaService.userAnswer.findMany({
      where: { session_id: sessionId },
      include: { choice: true },
    });
  }

  async updateSessionScore(tx: any, sessionId: number, data: {
    correct_answers?: number;
    wrong_answers?: number;
    empty_answers?: number;
    score?: number;
    completed_at?: Date
  }) {
    return tx.UserExamSession.update({
      where: { id: sessionId },
      data,
    });
  }
}
