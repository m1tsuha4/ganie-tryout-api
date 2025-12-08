import { ForbiddenException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { ExamRepository } from './exam.repository';
import { isExpired, remainingSeconds, shuffle } from './util';
import { acquireLock, redis, releaseLock } from '../common/utils/redis.util';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ExamService {
    constructor (private readonly repo: ExamRepository, private readonly prisma: PrismaService) {}

    async startPackageForUser(userId: string, packageId: number) {
        const userPackage = await this.repo.findUserPackage(userId, packageId);
        if (!userPackage) {
            throw new ForbiddenException('User is not allowed to start this package')
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
            await redis.hset(`session:${session.id}:meta`, { userId, examId: String(pe.exam.id) });
        }
        return created;
    }

    async getCurrentQuestion(sessionId: number, userId: string) {
        const session = await this.repo.findSessionById(sessionId);
        if (!session) {
            throw new ForbiddenException('Session not found');
        }
        if (session.user_id !== userId) {
            throw new ForbiddenException('User is not allowed to access this session');
        }
        if (session.completed_at) {
            throw new ForbiddenException('Session is already completed');
        }

        const exam = await this.repo.findByExamId(session.exam_id);
        const durationMin = exam?.duration;

        if (!session.started_at) {
            const now = new Date();
            await this.repo.updateSessionPositionRaw(sessionId, { started_at: now });
            session.started_at = now;
        }

        if (isExpired(session.started_at, durationMin)) {
            await this.repo.updateSessionPositionRaw(sessionId, { completed_at: new Date() });
            throw new ForbiddenException('Time is up for this exam');
        }

        const pos = session.current_position ?? 0;
        const qOrder = session.question_order as number[];
        if (pos >= qOrder.length) {
            throw new ForbiddenException('Session is already completed');
        }

        const qid = qOrder[pos];
        const question = await this.repo.findQuestionWithChoices(qid);
        if (!question) {
            throw new ForbiddenException('Question not found');
        }

        const choiceOrderObj = session.choice_order as Record<string, number[]>;
        const orderChoiceIds = choiceOrderObj?.[String(qid)] ?? question.question_choices.map(c => c.id);
        const orderedChoices = orderChoiceIds.map(cid => {
            const c = question.question_choices.find(x => x.id === cid);
            if (!c) {
                throw new ForbiddenException('Choice not found');
            }
            return { id: c.id, choice_text: c.choice_text }
        })
        return {
            sessionId: session.id,
            examId: session.exam_id,
            questionId: question.id,
            questionText: question.question_text,
            orderedChoices: orderedChoices,
            position: pos,
            totalQuestions: qOrder.length,
            secondsLeft: remainingSeconds(session.started_at, durationMin),
        }
    }

    async submitAnswer(sessionId: number, userId: string, questionId: number, choiceId: number) {
        const session = await this.repo.findSessionById(sessionId);
        if (!session) {
            throw new ForbiddenException('Session not found');
        }
        if (session.user_id !== userId) {
            throw new ForbiddenException('User is not allowed to access this session');
        }
        if (session.completed_at) {
            throw new ForbiddenException('Session is already completed');
        }

        const exam = await this.repo.findByExamId(session.exam_id);
        const durationMin = exam?.duration;

        if (!session.started_at) {
            const now = new Date();
            await this.repo.updateSessionPositionRaw(sessionId, { started_at: now });
            session.started_at = now;
        }

        if (isExpired(session.started_at, durationMin)) {
            await this.repo.updateSessionPositionRaw(sessionId, { completed_at: new Date() });
            throw new ForbiddenException('Time is up for this exam');
        }

        const pos = session.current_position ?? 0;
        const qOrder = session.question_order as number[];
        if (pos >= qOrder.length) {
            throw new ForbiddenException('Session is already completed');
        }

        const lockKey = `session:${sessionId}:q:${questionId}:lock`;
        const got = await acquireLock(lockKey, 5);
        if (!got) {
            throw new ForbiddenException('Session is already in use');
        }

        try {
            await this.prisma.$transaction(async (tx) => {
                try {
                    await this.repo.createUserAnswer(tx, { session_id: sessionId, question_id: questionId, choice_id: choiceId });
                } catch (err) {
                    if (err?.code !== 'P2002') throw err;
                }

                const newPos = pos + 1;
                const updateData: any = { current_position: newPos };
                if (newPos >= qOrder.length) {
                    updateData.completed_at = new Date();
                }
                await this.repo.updateSessionPostion(tx, sessionId, updateData);
            });
        } finally {
            await releaseLock(lockKey);
        }

        const updated = await this.repo.findSessionById(sessionId);
        if (!updated) {
            throw new ForbiddenException('Session not found');
        }
        return { finished: !!updated.completed_at, nextPosition: updated.current_position, secondsLeft: remainingSeconds(updated.started_at, durationMin) };
    }

    async resumeSession(sessionId: number, userId: string) {
        const session = await this.repo.findSessionById(sessionId);
        if (!session) {
            throw new ForbiddenException('Session not found');
        }
        if (session.user_id !== userId) {
            throw new ForbiddenException('User is not allowed to access this session');
        }
        if (session.completed_at) {
            throw new ForbiddenException('Session is already completed');
        }
        
        const questionOrder = session.question_order as number[];
        if (!Array.isArray(questionOrder)) {
            throw new InternalServerErrorException('Invalid session question order');
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
