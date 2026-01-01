import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class ReviewService {
  constructor(private readonly prisma: PrismaService){}

  async getReview(sessionId: number, questionNo?: number) {
    const session = await this.prisma.userExamSession.findUnique({
      where: { id: sessionId },
      include: {
        user_answers: {
          include: {
            choice: true,
          },
        },
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
    });

    if (!session) {
      throw new BadRequestException('Session not found');
    }

    let questionsToReview = session.exam.questions;

    if (questionNo) {
      if (typeof session.question_order === 'object' && Array.isArray(session.question_order)) {
         // Assuming question_order is an array of question IDs
         const questionId = session.question_order[questionNo - 1] as number;
         if (questionId) {
            questionsToReview = questionsToReview.filter(q => q.id === questionId);
         }
      } else {
         questionsToReview = [questionsToReview[questionNo - 1]].filter(Boolean);
      }
    }

    const reviewData = questionsToReview.map((question) => {
      const userAnswer = session.user_answers.find(
        (ans) => ans.question_id === question.id,
      );

      const correctChoice = question.question_choices.find((c) => c.is_correct);
      const userChoice = userAnswer?.choice;
      const isCorrect = userChoice?.id === correctChoice?.id;

      return {
        question: {
          id: question.id,
          text: question.question_text,
          image_url: question.question_image_url,
          audio_url: question.question_audio_url,
          discussion: question.discussion,
          video_discussion: question.video_discussion,
        },
        choices: question.question_choices.map((choice) => ({
          id: choice.id,
          text: choice.choice_text,
          image_url: choice.choice_image_url,
          is_correct: choice.is_correct,
        })),
        user_answer: {
          choice_id: userChoice?.id || null,
          is_correct: isCorrect,
        },
      };
    });

    
    return {
      session_id: session.id,
      exam_title: session.exam.title,
      score: session.score,
      total_questions: session.exam.total_questions,
      correct_answers: session.correct_answers,
      wrong_answers: session.wrong_answers,
      current_question: questionNo || null,
      has_next: questionNo ? questionNo < session.exam.total_questions : null,
      has_prev: questionNo ? questionNo > 1 : null,
      review: reviewData,
    };
  }
}
