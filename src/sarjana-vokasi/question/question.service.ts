import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateQuestionDto } from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";

@Injectable()
export class QuestionService {
  constructor(private prismaService: PrismaService) {}

  // Create question dengan choices (support Sarjana & Pascasarjana)
  async create(createQuestionDto: CreateQuestionDto) {
    // Verify exam exists (bisa untuk Sarjana atau Pascasarjana)
    const exam = await this.prismaService.exam.findUnique({
      where: { id: createQuestionDto.exam_id },
      include: {
        package_exams: true, // Include semua type
      },
    });

    if (!exam) {
      throw new NotFoundException("Exam not found");
    }

    if (exam.package_exams.length === 0) {
      throw new NotFoundException("Exam not found");
    }

    // Create question dengan choices
    const question = await this.prismaService.question.create({
      data: {
        exam_id: createQuestionDto.exam_id,
        question_text: createQuestionDto.question_text,
        question_image_url: createQuestionDto.question_image_url,
        question_audio_url: createQuestionDto.question_audio_url,
        discussion: createQuestionDto.discussion,
        video_discussion: createQuestionDto.video_discussion,
        difficulty: createQuestionDto.difficulty,
        deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
        question_choices: {
          create: createQuestionDto.choices.map((choice) => ({
            choice_text: choice.choice_text,
            choice_image_url: choice.choice_image_url || "",
            choice_audio_url: choice.choice_audio_url || "",
            is_correct: choice.is_correct,
            deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
          })),
        },
      },
      include: {
        question_choices: true,
      },
    });

    // Update total_questions di Exam
    const totalQuestions = await this.prismaService.question.count({
      where: { exam_id: createQuestionDto.exam_id },
    });

    await this.prismaService.exam.update({
      where: { id: createQuestionDto.exam_id },
      data: { total_questions: totalQuestions },
    });

    return question;
  }

  // Get all questions untuk exam tertentu (support Sarjana & Pascasarjana)
  async findByExam(examId: number) {
    // Verify exam exists (bisa untuk Sarjana atau Pascasarjana)
    const exam = await this.prismaService.exam.findUnique({
      where: { id: examId },
      include: {
        package_exams: true, // Include semua type
      },
    });

    if (!exam) {
      throw new NotFoundException("Exam not found");
    }

    if (exam.package_exams.length === 0) {
      throw new NotFoundException("Exam not found");
    }

    const questions = await this.prismaService.question.findMany({
      where: { exam_id: examId },
      include: {
        question_choices: {
          orderBy: {
            id: "asc", // Order by ID untuk konsistensi (A, B, C, D)
          },
        },
      },
      orderBy: {
        id: "asc",
      },
    });

    return questions;
  }

  // Get question by ID
  async findOne(id: number) {
    const question = await this.prismaService.question.findUnique({
      where: { id },
      include: {
        question_choices: {
          orderBy: {
            id: "asc",
          },
        },
        exam: {
          include: {
            package_exams: {
              include: {
                package: true,
              },
            },
          },
        },
      },
    });

    if (!question) {
      throw new NotFoundException("Question not found");
    }

    // Verify question exists (bisa untuk Sarjana atau Pascasarjana)
    if (question.exam.package_exams.length === 0) {
      throw new NotFoundException("Question not found");
    }

    return question;
  }

  // Update question
  async update(id: number, updateQuestionDto: UpdateQuestionDto) {
    const existingQuestion = await this.findOne(id);

    // Update question
    const updateData: any = {};
    if (updateQuestionDto.question_text !== undefined) {
      updateData.question_text = updateQuestionDto.question_text;
    }
    if (updateQuestionDto.question_image_url !== undefined) {
      updateData.question_image_url = updateQuestionDto.question_image_url;
    }
    if (updateQuestionDto.question_audio_url !== undefined) {
      updateData.question_audio_url = updateQuestionDto.question_audio_url;
    }
    if (updateQuestionDto.discussion !== undefined) {
      updateData.discussion = updateQuestionDto.discussion;
    }
    if (updateQuestionDto.video_discussion !== undefined) {
      updateData.video_discussion = updateQuestionDto.video_discussion;
    }
    if (updateQuestionDto.difficulty !== undefined) {
      updateData.difficulty = updateQuestionDto.difficulty;
    }

    const question = await this.prismaService.question.update({
      where: { id },
      data: updateData,
      include: {
        question_choices: true,
      },
    });

    // Update choices jika ada
    if (updateQuestionDto.choices) {
      // Delete existing choices
      await this.prismaService.questionChoice.deleteMany({
        where: { question_id: id },
      });

      // Create new choices
      await this.prismaService.questionChoice.createMany({
        data: updateQuestionDto.choices.map((choice) => ({
          question_id: id,
          choice_text: choice.choice_text,
          choice_image_url: choice.choice_image_url || "",
          choice_audio_url: choice.choice_audio_url || "",
          is_correct: choice.is_correct,
          deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
        })),
      });

      // Get updated question with choices
      return this.findOne(id);
    }

    return question;
  }

  // Delete question
  async remove(id: number) {
    const question = await this.findOne(id);

    // Delete question (akan cascade delete choices)
    await this.prismaService.question.delete({
      where: { id },
    });

    // Update total_questions di Exam
    const totalQuestions = await this.prismaService.question.count({
      where: { exam_id: question.exam_id },
    });

    await this.prismaService.exam.update({
      where: { id: question.exam_id },
      data: { total_questions: totalQuestions },
    });

    return { message: "Question deleted successfully" };
  }
}
