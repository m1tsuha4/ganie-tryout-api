// src/exam/exam.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { StartPackageSchema } from './dto/start-package.dto';
import { SubmitAnswerSchema } from './dto/submit-answer.dto';
import { AuthGuard } from '@nestjs/passport';
import { JwtAuthGuard } from 'src/auth/guard/jwt-guard.auth';
import { UseGuards } from '@nestjs/common';

@ApiTags('exam')
@ApiBearerAuth()
@Controller('exam')
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post('package/:packageId/start')
  @ApiOperation({ summary: 'Start sessions for all exams in a package' })
  @ApiResponse({ status: 201, description: 'Sessions created. Returns array of sessionId and examId.' })
  async startPackage(@Param('packageId') packageIdParam: string, @Req() req: any) {
    const userId: string = req.user?.id;
    const packageId = Number(packageIdParam);
    const session = await this.examService.startPackageForUser(userId, packageId);
    return session;
  }

  @Get('session/:sessionId/question')
  @ApiOperation({ summary: 'Get the current question for a session' })
  @ApiParam({ name: 'sessionId', description: 'ID of the user exam session', type: Number })
  @ApiResponse({ status: 200, description: 'Returns question DTO with choices (choices do not include is_correct).' })
  async getQuestion(@Param('sessionId') sessionIdParam: string, @Req() req: any) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    const question = await this.examService.getCurrentQuestion(sessionId, userId);
    return question;
  }

  @Post('session/:sessionId/answer')
  @ApiOperation({ summary: 'Submit answer for current question in session' })
  @ApiParam({ name: 'sessionId', description: 'ID of the user exam session', type: Number })
  @ApiBody({
    description: 'Answer payload. This endpoint accepts either camelCase or snake_case (server maps both).',
    schema: {
      oneOf: [
        { example: { questionId: 101, choiceId: 1001 } }, 
        { example: { question_id: 101, answer: 1001 } },   
      ],
    },
  })
  @ApiResponse({ status: 200, description: 'Returns nextPosition or finished flag.' })
  async submitAnswer(@Param('sessionId') sessionIdParam: string, @Body() body: any, @Req() req: any) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    const parsed = body;

    const questionId = parsed.questionId ?? parsed.question_id;
    const choiceId = parsed.choiceId ?? parsed.choice_id ?? parsed.answer;

    if (typeof questionId !== 'number' || typeof choiceId !== 'number') {
      throw new BadRequestException('Invalid questionId or choiceId');
    }

    const answer = await this.examService.submitAnswer(sessionId, userId, questionId, choiceId);
    return answer;
  }

  @Get('session/:sessionId/resume')
  @ApiOperation({ summary: 'Resume a session — return progress and next question id' })
  @ApiParam({ name: 'sessionId', description: 'ID of the user exam session', type: Number })
  @ApiResponse({ status: 200, description: 'Returns session progress and nextQuestionId (or null if finished).' })
  async resumeSession(@Param('sessionId') sessionIdParam: string, @Req() req: any) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    return this.examService.resumeSession(sessionId, userId);
  }
}
