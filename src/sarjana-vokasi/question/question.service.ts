import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import {
  CreateQuestionDto,
  CreateQuestionChoicesDto,
} from "./dto/create-question.dto";
import { UpdateQuestionDto } from "./dto/update-question.dto";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { ok } from "src/common/utils/response.util";

@Injectable()
export class QuestionService {
  constructor(private prismaService: PrismaService) {}

  // Create question TANPA choices (choices dibuat terpisah via createChoices)
  // Flow baru: Buat soal dulu dengan image dan pembahasan, baru tambah choices
  async create(createQuestionDto: CreateQuestionDto, userId: string) {
    // Verify exam exists (bisa untuk Sarjana atau Pascasarjana)
    const exam = await this.prismaService.exam.findUnique({
      where: { id: createQuestionDto.exam_id },
    });

    if (!exam) {
      throw new NotFoundException("Exam not found");
    }

    // Create question TANPA choices (choices dibuat terpisah)
    const question = await this.prismaService.question.create({
      data: {
        exam_id: createQuestionDto.exam_id,
        question_text: createQuestionDto.question_text,
        question_image_url: createQuestionDto.question_image_url,
        question_audio_url: createQuestionDto.question_audio_url,
        discussion: createQuestionDto.discussion,
        video_discussion: createQuestionDto.video_discussion,
        difficulty: createQuestionDto.difficulty,
        created_by: userId,
        // deleted_at default null (tidak dihapus)
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

  // Create choices untuk question yang sudah ada
  // Validasi: Question harus sudah ada dan belum punya choices
  async createChoices(
    questionId: number,
    createChoicesDto: CreateQuestionChoicesDto,
    userId: string,
  ) {
    // Verify question exists
    const question = await this.prismaService.question.findUnique({
      where: { id: questionId },
      include: {
        question_choices: true,
      },
    });

    if (!question) {
      throw new NotFoundException("Question not found");
    }

    // Validasi: Question tidak boleh sudah punya choices
    if (question.question_choices.length > 0) {
      throw new BadRequestException(
        "Question already has choices. Use update endpoint to modify choices.",
      );
    }

    // Create choices
    await this.prismaService.questionChoice.createMany({
      data: createChoicesDto.choices.map((choice) => ({
        question_id: questionId,
        choice_text: choice.choice_text,
        choice_image_url: choice.choice_image_url || "",
        choice_audio_url: choice.choice_audio_url || "",
        is_correct: choice.is_correct,
        created_by: userId,
        // deleted_at default null (tidak dihapus)
      })),
    });

    // Return question with choices
    return this.findOne(questionId);
  }

  // Get all questions untuk exam tertentu (support Sarjana & Pascasarjana)
  async findByExam(examId: number, paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
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

    const [question, total] = await Promise.all([
      this.prismaService.question.findMany({
        where: {
          exam_id: examId,
          deleted_at: null,
        },
        select: {
          id: true,
          exam_id: true,
          question_text: true,
          question_image_url: true,
          question_audio_url: true,
          discussion: true,
          video_discussion: true,
          difficulty: true,
          question_choices: {
            select: {
              id: true,
              question_id: true,
              choice_text: true,
              choice_image_url: true,
              choice_audio_url: true,
              is_correct: true,
            },
            orderBy: {
              id: "asc",
            },
          },
        },
        orderBy: {
          id: "asc",
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.question.count({
        where: {
          exam_id: examId,
          deleted_at: null,
        },
      }),
    ]);

    return ok(question, "Fetched successfully", {
      total,
      limit,
      offset,
      nextPage: total > offset + limit ? offset + limit : null,
    });
  }

  // Get question by ID
  async findOne(id: number) {
    const question = await this.prismaService.question.findFirst({
      where: {
        id,
        deleted_at: null, // Hanya yang tidak dihapus
      },
      include: {
        question_choices: {
          where: {
            deleted_at: null, // Hanya choices yang tidak dihapus
          },
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
    // if (question.exam.package_exams.length === 0) {
    //   throw new NotFoundException("Question not found");
    // }

    return question;
  }

  // Update question
  async update(
    id: number,
    updateQuestionDto: UpdateQuestionDto,
    userId: string,
  ) {
    const existingQuestion = await this.findOne(id);

    // Update question
    const updateData: any = {
      updated_by: userId,
    };
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
          created_by: userId,
          // deleted_at default null (tidak dihapus)
        })),
      });

      // Get updated question with choices
      return this.findOne(id);
    }

    return question;
  }

  // Delete question (soft delete)
  async remove(id: number, userId: string) {
    const question = await this.findOne(id);

    // Soft delete question
    await this.prismaService.question.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    // Soft delete semua choices
    await this.prismaService.questionChoice.updateMany({
      where: { question_id: id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });

    // Update total_questions di Exam (hitung yang tidak dihapus)
    const totalQuestions = await this.prismaService.question.count({
      where: {
        exam_id: question.exam_id,
        deleted_at: null,
      },
    });

    await this.prismaService.exam.update({
      where: { id: question.exam_id },
      data: { total_questions: totalQuestions },
    });

    return { message: "Question deleted successfully" };
  }
}
