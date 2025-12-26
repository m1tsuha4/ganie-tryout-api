import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";
import { ExamRepository } from "./exam.repository";
import {
  computeSecondsLeftForSession,
  isExpired,
  remainingSeconds,
  shuffle,
} from "./util";
import { getScoringConstants } from "src/common/constants/scoring.constants";
import { acquireLock, redis, releaseLock } from "../common/utils/redis.util";
import { PrismaService } from "src/prisma/prisma.service";

@Injectable()
export class ExamService {
  constructor(
    private readonly repo: ExamRepository,
    private readonly prisma: PrismaService,
  ) {}

  // If the gap between last tick and now is larger than this threshold
  // we consider the client was offline and should NOT count that gap
  // toward elapsed time. Threshold set to 30s (30_000 ms).
  private readonly OFFLINE_THRESHOLD_MS = 30_000;

  private async handleTick(sessionId: number, session: any, now: Date) {
    const prevTick: Date | null = session.ticked_at ?? null;

    if (prevTick) {
      const gap = now.getTime() - prevTick.getTime();
      if (gap > this.OFFLINE_THRESHOLD_MS) {
        // Client was likely offline; shift started_at forward by gap
        if (session.started_at) {
          const newStarted = new Date(session.started_at.getTime() + gap);
          await this.repo.updateSessionPositionRaw(sessionId, {
            started_at: newStarted,
          });
          await this.repo.updateTick(sessionId, now);
          session.started_at = newStarted;
          session.ticked_at = now;
          return;
        }
      }
    }

    // Normal case: just update ticked_at
    await this.repo.updateTick(sessionId, now);
    session.ticked_at = now;
  }

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

      // If a session for this user+exam already exists, return it (do not reset)
      const existing = await this.repo.findExistingSessionForUserExam(
        userId,
        pe.exam.id,
      );
      if (existing) {
        created.push(existing);
        await redis.hset(`session:${existing.id}:meta`, {
          userId,
          examId: String(pe.exam.id),
        });
        continue;
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

    const now = new Date();
    await this.handleTick(sessionId, session, now);

    const secondsLeft = computeSecondsLeftForSession(session, durationMin);
    if (secondsLeft <= 0) {
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

    const existingAnswer = await this.repo.findUserAnswerForSessionQuestion(
      sessionId,
      qid,
    );
    const selectedChoiceId = existingAnswer?.choice_id ?? null;

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
      selectedChoiceId: selectedChoiceId,
      secondsLeft: secondsLeft,
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

    const now = new Date();
    await this.handleTick(sessionId, session, now);

    const secondsLeft = computeSecondsLeftForSession(session, durationMin);
    if (secondsLeft <= 0) {
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
      if (Number(qOrder[idx]) !== questionId) {
        throw new BadRequestException(
          "QuestionId does not match the provided index",
        );
      }
    } else {
      // qOrder may contain numeric IDs or stringified numbers (JSON). Normalize when comparing.
      idx = qOrder.findIndex((q) => Number(q) === questionId);
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

        const answeredRows = await tx.userAnswer.findMany({
          where: { session_id: sessionId },
          select: { question_id: true },
        });
        // Normalize answered IDs to strings for reliable comparison with qOrder JSON values
        const answeredSet = new Set(
          answeredRows.map((r) => String(r.question_id)),
        );

        // compute first unanswered index
        let newPos = qOrder.length;
        for (let i = 0; i < qOrder.length; i++) {
          if (!answeredSet.has(String(qOrder[i]))) {
            newPos = i;
            break;
          }
        }

        const updateData: any = { current_position: newPos };
        // Do NOT auto-mark session as completed when all questions are answered.
        // Allow client to review and explicitly submit. Time expiry still finalizes session.

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
    if (computeSecondsLeftForSession(updated, durationMin) <= 0) {
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
      secondsLeft: computeSecondsLeftForSession(updated, durationMin),
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

  async pingSession(sessionId: number, userId: string) {
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new ForbiddenException("Session not found");
    }
    if (session.user_id !== userId) {
      throw new ForbiddenException(
        "User is not allowed to access this session",
      );
    }

    const now = new Date();
    // If session hasn't started yet, set started_at.
    // Otherwise update tick handling which will pause for offline gaps.
    if (!session.started_at) {
      await this.repo.updateSessionPositionRaw(sessionId, { started_at: now });
      session.started_at = now;
      await this.handleTick(sessionId, session, now);
    } else {
      await this.handleTick(sessionId, session, now);
    }

    const exam = await this.repo.findByExamId(session.exam_id);
    const durationMin: number = exam?.duration ?? 0;
    const lastTick = session.ticked_at ?? new Date();
    const startedAt = session.started_at ?? lastTick;
    const elapsedSec = Math.floor(
      (lastTick.getTime() - startedAt.getTime()) / 1000,
    );
    const secondsleft = Math.max(0, durationMin * 60 - elapsedSec);

    if (secondsleft <= 0) {
      await this.finalizeSession(sessionId, session.started_at, exam, now);
      return {
        secondsLeft: 0,
        expiresAt: session.started_at
          ? new Date(
              session.started_at.getTime() + durationMin * 60 * 1000,
            ).toISOString()
          : null,
      };
    }

    return {
      secondsLeft: secondsleft,
      expiresAt: session.started_at
        ? new Date(
            session.started_at.getTime() + durationMin * 60 * 1000,
          ).toISOString()
        : null,
    };
  }

  // Explicit submit endpoint: finalize session (compute score and mark completed_at)
  async submitSession(sessionId: number, userId: string) {
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
      return { finished: true };
    }

    const exam = await this.repo.findByExamId(session.exam_id);
    const res = await this.finalizeSession(
      sessionId,
      session.started_at,
      exam,
      new Date(),
    );
    return { finished: true, result: res };
  }

  /**
   * Return per-session details and package-level totals for a user's package attempt.
   * Note: sessions that are not finalized (`completed_at` is null) may have zero scores.
   */
  async getPackageProgress(packageId: number, userId: string) {
    const packageExam = await this.repo.findPackageExamWithQeustions(packageId);
    const examIds = packageExam.map((pe) => pe.exam.id);

    const sessions = await this.prisma.userExamSession.findMany({
      where: { user_id: userId, exam_id: { in: examIds } },
    });

    const sessionSummaries = sessions.map((s) => ({
      sessionId: s.id,
      examId: s.exam_id,
      current_position: s.current_position ?? 0,
      correct_answers: s.correct_answers ?? 0,
      wrong_answers: s.wrong_answers ?? 0,
      empty_answers: s.empty_answers ?? 0,
      score: s.score ?? 0,
      completed_at: s.completed_at ?? null,
    }));

    const totals = sessionSummaries.reduce(
      (acc, cur) => {
        acc.correct += cur.correct_answers;
        acc.wrong += cur.wrong_answers;
        acc.empty += cur.empty_answers;
        acc.scoreSum += cur.score;
        return acc;
      },
      { correct: 0, wrong: 0, empty: 0, scoreSum: 0 },
    );

    return {
      sessions: sessionSummaries,
      totals: {
        correct: totals.correct,
        wrong: totals.wrong,
        empty: totals.empty,
        averageScore:
          sessions.length > 0 ? totals.scoreSum / sessions.length : 0,
      },
    };
  }

  async finalizeSession(
    sessionId: number,
    startedAt: Date | null,
    exam?: any,
    now?: Date,
  ) {
    const txNow = now ?? new Date();
    const session = await this.repo.findSessionById(sessionId);
    if (!session) {
      throw new ForbiddenException("Session not found");
    }
    if (session.completed_at) {
      return;
    }

    const examData = exam ?? (await this.repo.findByExamId(session.exam_id));
    const durationMin: number = examData?.duration ?? 0;

    const answer = await this.repo.findUserAnswer(sessionId);

    const totalQuestions = Array.isArray(session.question_order)
      ? (session.question_order as number[]).length
      : 0;
    const answeredCount = answer.length;
    let correct = 0;
    for (const ans of answer) {
      if (ans.choice && ans.choice.is_correct) correct++;
    }
    const wrong = answeredCount - correct;
    const empty = Math.max(0, totalQuestions - answeredCount);

    // Compute raw score using scoring constants (e.g., +4 / -1 / 0)
    const scoring = getScoringConstants("SARJANA", examData?.type);
    const rawScore =
      correct * scoring.CORRECT_ANSWER +
      wrong * scoring.WRONG_ANSWER +
      empty * scoring.NOT_ANSWERED;
    // Optionally compute percentage score too (for convenience)
    const percentScore =
      totalQuestions > 0 ? (correct / totalQuestions) * 100 : 0;

    await this.prisma.$transaction(async (tx) => {
      await this.repo.updateSessionScore(tx, sessionId, {
        correct_answers: correct,
        wrong_answers: wrong,
        empty_answers: empty,
        score: rawScore,
        completed_at: txNow,
      });
    });

    return { correct, wrong, empty, rawScore, percentScore };
  }
}
