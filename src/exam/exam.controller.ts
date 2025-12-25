// src/exam/exam.controller.ts
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ExamService } from "./exam.service";
import { StartPackageSchema } from "./dto/start-package.dto";
import { SubmitAnswerSchema } from "./dto/submit-answer.dto";
import { AuthGuard } from "@nestjs/passport";
import { JwtAuthGuard } from "src/auth/guard/jwt-guard.auth";
import { UseGuards } from "@nestjs/common";

@ApiBearerAuth()
@Controller("exam")
@UseGuards(JwtAuthGuard)
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Post("package/:packageId/start")
  @ApiOperation({ summary: "Start sessions for all exams in a package" })
  @ApiResponse({
    status: 201,
    description: "Sessions created. Returns array of sessionId and examId.",
  })
  async startPackage(
    @Param("packageId") packageIdParam: string,
    @Req() req: any,
  ) {
    const userId: string = req.user?.id;
    const packageId = Number(packageIdParam);
    const session = await this.examService.startPackageForUser(
      userId,
      packageId,
    );
    return session;
  }

  @Get("session/:sessionId/question")
  @ApiOperation({ summary: "Get the current question for a session" })
  @ApiParam({
    name: "sessionId",
    description: "ID of the user exam session",
    type: Number,
  })
  @ApiQuery({
    name: "index",
    required: false,
    description: "Optional question index to fetch specific question",
  })
  @ApiResponse({
    status: 200,
    description:
      "Returns question DTO with choices (choices do not include is_correct).",
  })
  async getQuestion(
    @Param("sessionId") sessionIdParam: string,
    @Query("index") indexQuery: string | undefined,
    @Req() req: any,
  ) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    let index: number | undefined;
    if (indexQuery !== undefined) {
      index = Number(indexQuery);
      if (!Number.isInteger(index) || index < 0) {
        throw new BadRequestException("Invalid index query parameter");
      }
    }
    const question = await this.examService.getCurrentQuestion(
      sessionId,
      userId,
      index,
    );
    return question;
  }

  @Post("session/:sessionId/answer")
  @ApiOperation({ summary: "Submit answer for current question in session" })
  @ApiParam({
    name: "sessionId",
    description: "ID of the user exam session",
    type: Number,
  })
  @ApiBody({
    description:
      "Answer payload. This endpoint accepts either camelCase or snake_case (server maps both).",
    schema: {
      oneOf: [
        { example: { questionId: 101, choiceId: 1001 } },
        { example: { question_id: 101, answer: 1001 } },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: "Returns nextPosition or finished flag.",
  })
  async submitAnswer(
    @Param("sessionId") sessionIdParam: string,
    @Body() body: any,
    @Req() req: any,
  ) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    const parsed = body;

    const questionId = parsed.questionId ?? parsed.question_id;
    const choiceId = parsed.choiceId ?? parsed.choice_id ?? parsed.answer;
    const indexRaw = body.index ?? body.questionIndex ?? body.question_index;
    const index = indexRaw === undefined ? undefined : Number(indexRaw);

    if (typeof questionId !== "number" || typeof choiceId !== "number") {
      throw new BadRequestException("Invalid questionId or choiceId");
    }

    const answer = await this.examService.submitAnswer(
      sessionId,
      userId,
      questionId,
      choiceId,
      index,
    );
    return answer;
  }

  @Get("session/:sessionId/resume")
  @ApiOperation({
    summary: "Resume a session — return progress and next question id",
  })
  @ApiParam({
    name: "sessionId",
    description: "ID of the user exam session",
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description:
      "Returns session progress and nextQuestionId (or null if finished).",
  })
  async resumeSession(
    @Param("sessionId") sessionIdParam: string,
    @Req() req: any,
  ) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    return this.examService.resumeSession(sessionId, userId);
  }

  @Post('session/:sessionId/ping')
  @ApiOperation({ summary: "Ping to update session tick time" })
  async pingSession(
    @Param("sessionId") sessionIdParam: string,
    @Req() req: any,
  ) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    return this.examService.pingSession(sessionId, userId);
  }

  @Post('session/:sessionId/submit')
  @ApiOperation({ summary: 'Submit session (finalize exam and compute score)' })
  async submitSession(
    @Param('sessionId') sessionIdParam: string,
    @Req() req: any,
  ) {
    const sessionId = Number(sessionIdParam);
    const userId: string = req.user?.id;
    return this.examService.submitSession(sessionId, userId);
  }

  @Get('package/:packageId/progress')
  @ApiOperation({ summary: 'Get package progress (per-session and totals) for current user' })
  async getPackageProgress(
    @Param('packageId') packageIdParam: string,
    @Req() req: any,
  ) {
    const packageId = Number(packageIdParam);
    const userId: string = req.user?.id;
    return this.examService.getPackageProgress(packageId, userId);
  }
}
