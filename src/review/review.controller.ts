import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Query } from '@nestjs/common';
import { ReviewService } from './review.service';
import { JwtAuthGuard } from 'src/auth/guard/jwt-guard.auth';
import { ApiBearerAuth, ApiBody, ApiQuery, ApiResponse } from '@nestjs/swagger';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}


  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('session/:sessionId')
  @ApiQuery({ name: 'no', required: false, type: Number, description: 'Question number for pagination' })
  @ApiResponse({
    status: 200,
    description: 'Review data retrieved successfully',
    schema: {
      example: {
        session_id: 123,
        exam_title: 'Biology Final',
        score: 85.5,
        total_questions: 50,
        correct_answers: 42,
        wrong_answers: 8,
        current_question: 1,
        has_next: true,
        has_prev: false,
        review: [
          {
            question: {
              id: 101,
              text: 'What is the powerhouse of the cell?',
              image_url: 'http://example.com/image.png',
              audio_url: null,
              discussion: 'Mitochondria is known as the powerhouse of the cell.',
              video_discussion: 'http://example.com/video.mp4',
            },
            choices: [
              {
                id: 1,
                text: 'Nucleus',
                image_url: '',
                is_correct: false,
              },
              {
                id: 2,
                text: 'Mitochondria',
                image_url: '',
                is_correct: true,
              },
            ],
            user_answer: {
              choice_id: 2,
              is_correct: true,
            },
          },
        ],
      },
    },
  })
  getReview(@Param('sessionId') sessionId: number, @Query('no') no?: number) {
    return this.reviewService.getReview(+sessionId, no ? +no : undefined);
  }
}
