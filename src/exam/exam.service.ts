import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ExamRepository } from "./exam.repository";
import { isExpired, remainingSeconds, shuffle } from "./util";
import { acquireLock, redis, releaseLock } from "../common/utils/redis.util";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ExamService {
  constructor(
    private readonly repo: ExamRepository,
    private readonly prisma: PrismaService,
  ) {}

  async startPackageForUser(userId: string, packageId: number) {
    const userPackage = await this.repo.findUserPackage(userId, packageId);
    if (!userPackage) {
      throw new ForbiddenException("User is not allowed to start this package");
    }

    const packageExam = await this.repo.findPackageExamWithQeustions(packageId);
    const created: Array<any> = [];
    for (const pe of packageExam) {
      const questionIds = pe.exam.questions.map((q) => q.id);
      const questionOrder = shuffle(questionIds);
      const choiceOrder = {};
      for (const q of pe.exam.questions) {
        choiceOrder[q.id] = shuffle(q.question_choices.map((qc) => qc.id));
      }
      const session = await this.repo.createUserExamSession({
        user_id: userId,
        exam_id: pe.exam.id,
        question_order: questionOrder,
        choice_order: choiceOrder,
      });
      created.push(session);
      await redis.hset(`session:${session.id}:meta`, {
        userId,
        examId: String(pe.exam.id),
      });
    }
    return created;
  }

  async getCurrentQuestion(sessionId: number, userId: string, index?: number) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new ForbiddenException("Session not found");
    }
    if (session.user_id !== userId) {
      throw new ForbiddenException(
        "User is not allowed to access this session",
      );
    }
    if (session.completed_at) {
      throw new ForbiddenException("Session is already completed");
    }

    const exam = await this.repo.findByExamId(session.exam_id);
    const durationMin: number = exam?.duration ?? 0;

    if (!session.started_at) {
      const now = new Date();
      await this.repo.updateSessionPositionRaw(sessionId, { started_at: now });
      session.started_at = now;
    }

    if (isExpired(session.started_at, durationMin)) {
      await this.repo.updateSessionPositionRaw(sessionId, {
        completed_at: new Date(),
      });
      throw new ForbiddenException("Time is up for this exam");
    }

    const pos = session.current_position ?? 0;
    const qOrder = session.question_order as number[];
    const idx = index === undefined ? pos : index;

    if (idx < 0 || idx >= qOrder.length) {
      throw new BadRequestException("Invalid question index");
    }

    const qid = qOrder[idx];
    const question = await this.repo.findQuestionWithChoices(qid);
    if (!question) {
      throw new ForbiddenException("Question not found");
    }

    const choiceOrderObj = session.choice_order as Record<string, number[]>;
    const orderChoiceIds =
      choiceOrderObj?.[String(qid)] ??
      question.question_choices.map((c) => c.id);
    const orderedChoices = orderChoiceIds.map((cid) => {
      const c = question.question_choices.find((x) => x.id === cid);
      if (!c) {
        throw new ForbiddenException("Choice not found");
      }
      return { id: c.id, choice_text: c.choice_text };
    });

    const expiresAt = session.started_at
      ? new Date(
          session.started_at.getTime() + durationMin * 60 * 1000,
        ).toISOString()
      : undefined;

    return {
      sessionId: session.id,
      examId: session.exam_id,
      questionId: question.id,
      questionText: question.question_text,
      orderedChoices: orderedChoices,
      position: pos,
      totalQuestions: qOrder.length,
      secondsLeft: remainingSeconds(session.started_at, durationMin),
      expiresAt: expiresAt,
    };
  }

  async submitAnswer(
    sessionId: number,
    userId: string,
    questionId: number,
    choiceId: number,
    index?: number,
  ) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new ForbiddenException("Session not found");
    }
    if (session.user_id !== userId) {
      throw new ForbiddenException(
        "User is not allowed to access this session",
      );
    }
    if (session.completed_at) {
      throw new ForbiddenException("Session is already completed");
    }

    const exam = await this.repo.findByExamId(session.exam_id);
    const durationMin: number = exam?.duration ?? 0;

    if (!session.started_at) {
      const now = new Date();
      await this.repo.updateSessionPositionRaw(sessionId, { started_at: now });
      session.started_at = now;
    }

    if (isExpired(session.started_at, durationMin)) {
      await this.repo.updateSessionPositionRaw(sessionId, {
        completed_at: new Date(),
      });
      throw new ForbiddenException("Time is up for this exam");
    }

    const qOrder = session.question_order as number[];
    if (!Array.isArray(qOrder) || qOrder.length === 0) {
      throw new InternalServerErrorException("Session has no questions");
    }

    let idx: number;
    if (index !== undefined) {
      idx = index;
      if (!Number.isInteger(idx) || idx < 0 || idx >= qOrder.length) {
        throw new BadRequestException("Invalid question index");
      }
      if (qOrder[idx] !== questionId) {
        throw new BadRequestException(
          "QuestionId does not match the provided index",
        );
      }
    } else {
      idx = qOrder.findIndex((q) => q === questionId);
      if (idx === -1)
        throw new BadRequestException(
          "Question does not belong to this session",
        );
    }

    const lockKey = `session:${sessionId}:q:${questionId}:lock`;
    const got = await acquireLock(lockKey, 5);
    if (!got) {
      throw new ForbiddenException("Session is already in use");
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        // find existing answer (atomic within transaction)
        const existing = await tx.userAnswer.findFirst({
          where: { session_id: sessionId, question_id: questionId },
        });

        if (existing) {
          await tx.userAnswer.update({
            where: { id: existing.id },
            data: { choice_id: choiceId },
          });
        } else {
          await tx.userAnswer.create({
            data: {
              session_id: sessionId,
              question_id: questionId,
              choice_id: choiceId,
            },
          });
        }

        // fetch answered question ids within tx
        const answeredRows = await tx.userAnswer.findMany({
          where: { session_id: sessionId },
          select: { question_id: true },
        });
        const answeredSet = new Set(answeredRows.map((r) => r.question_id));

        // compute first unanswered index
        let newPos = qOrder.length;
        for (let i = 0; i < qOrder.length; i++) {
          if (!answeredSet.has(qOrder[i])) {
            newPos = i;
            break;
          }
        }

        const updateData: any = { current_position: newPos };
        if (newPos >= qOrder.length) {
          updateData.completed_at = new Date();
        }

        await tx.userExamSession.update({
          where: { id: sessionId },
          data: updateData,
        });
      });
    } finally {
      await releaseLock(lockKey);
    }

    const updated = await this.repo.findSessionById(sessionId);
    if (!updated) {
      throw new ForbiddenException("Session not found");
    }
    if (isExpired(updated.started_at, durationMin)) {
      await this.repo.updateSessionPositionRaw(sessionId, {
        completed_at: new Date(),
      });
      return {
        finished: true,
        nextPosition: updated.current_position,
        secondsLeft: 0,
        expiresAt: null,
      };
    }
    const expiresAt = updated.started_at
      ? new Date(
          updated.started_at.getTime() + durationMin * 60 * 1000,
        ).toISOString()
      : undefined;
    return {
      finished: !!updated.completed_at,
      nextPosition: updated.current_position,
      secondsLeft: remainingSeconds(updated.started_at, durationMin),
      expiresAt,
    };
  }

  async resumeSession(sessionId: number, userId: string) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new ForbiddenException("Session not found");
    }
    if (session.user_id !== userId) {
      throw new ForbiddenException(
        "User is not allowed to access this session",
      );
    }
    if (session.completed_at) {
      throw new ForbiddenException("Session is already completed");
    }

    const questionOrder = session.question_order as number[];
    if (!Array.isArray(questionOrder)) {
      throw new InternalServerErrorException("Invalid session question order");
    }

    const pos = session.current_position ?? 0;
    const total = questionOrder.length;
    const finished = !!session.completed_at;

    let nextQuestionId: number | null = null;

    if (!finished && pos < total) {
      nextQuestionId = questionOrder[pos];
    }

    return {
      sessionId: session.id,
      examId: session.exam_id,
      currentPosition: pos,
      totalQuestions: total,
      completed: finished,
      nextQuestionId,
    };
  }
}
