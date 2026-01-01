import { Test, TestingModule } from '@nestjs/testing';
import { ReviewService } from './review.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  userExamSession: {
    findUnique: jest.fn(),
  },
};

describe('ReviewService', () => {
  let service: ReviewService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReviewService>(ReviewService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getReview', () => {
    it('should return review data when session exists', async () => {
      const mockSession = {
        id: 1,
        score: 100,
        correct_answers: 1,
        wrong_answers: 0,
        exam: {
          title: 'Test Exam',
          total_questions: 1,
          questions: [
            {
              id: 1,
              question_text: 'Q1',
              question_image_url: null,
              question_audio_url: null,
              discussion: 'Discussion',
              video_discussion: null,
              question_choices: [
                { id: 1, choice_text: 'A', is_correct: true },
                { id: 2, choice_text: 'B', is_correct: false },
              ],
            },
          ],
        },
        user_answers: [
          {
            question_id: 1,
            choice: { id: 1 },
          },
        ],
      };

      (prisma.userExamSession.findUnique as jest.Mock).mockResolvedValue(
        mockSession,
      );

      const result = await service.getReview(1);

      expect(result).toEqual({
        session_id: 1,
        exam_title: 'Test Exam',
        score: 100,
        total_questions: 1,
        correct_answers: 1,
        wrong_answers: 0,
        current_question: null,
        has_next: null,
        has_prev: null,
        review: [
          {
            question: {
              id: 1,
              text: 'Q1',
              image_url: null,
              audio_url: null,
              discussion: 'Discussion',
              video_discussion: null,
            },
            choices: [
              { id: 1, text: 'A', image_url: undefined, is_correct: true },
              { id: 2, text: 'B', image_url: undefined, is_correct: false },
            ],
            user_answer: {
              choice_id: 1,
              is_correct: true,
            },
          },
        ],
      });
    });

    it('should return specific question when questionNo provided', async () => {
        const mockSession = {
          id: 1,
          score: 100,
          correct_answers: 1,
          wrong_answers: 0,
          question_order: [1],
          exam: {
            title: 'Test Exam',
            total_questions: 1,
            questions: [
              {
                id: 1,
                question_text: 'Q1',
                question_image_url: null,
                question_audio_url: null,
                discussion: 'Discussion',
                video_discussion: null,
                question_choices: [
                  { id: 1, choice_text: 'A', is_correct: true },
                  { id: 2, choice_text: 'B', is_correct: false },
                ],
              },
            ],
          },
          user_answers: [
            {
              question_id: 1,
              choice: { id: 1 },
            },
          ],
        };
  
        (prisma.userExamSession.findUnique as jest.Mock).mockResolvedValue(
          mockSession,
        );
  
        const result = await service.getReview(1, 1);
  
        expect(result.review).toHaveLength(1);
        expect(result.review[0].question.id).toBe(1);
      });

    it('should throw error if session not found', async () => {
      (prisma.userExamSession.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.getReview(999)).rejects.toThrow('Session not found');
    });
  });
});
