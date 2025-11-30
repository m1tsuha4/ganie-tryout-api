import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
} from '@nestjs/common';
import { QuestionService } from './question.service';
import {
  CreateQuestionDto,
  CreateQuestionSchema,
} from './dto/create-question.dto';
import {
  UpdateQuestionDto,
  UpdateQuestionSchema,
} from './dto/update-question.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('question')
export class QuestionController {
  constructor(private readonly questionService: QuestionService) {}

  // Create question untuk subtest (exam)
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateQuestionSchema))
    createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionService.create(createQuestionDto);
  }

  // Get all questions untuk exam tertentu
  @Get('exam/:examId')
  findByExam(@Param('examId', ParseIntPipe) examId: number) {
    return this.questionService.findByExam(examId);
  }

  // Get question by ID
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.findOne(id);
  }

  // Update question
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateQuestionSchema))
    updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  // Delete question
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionService.remove(id);
  }
}

