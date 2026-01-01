import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateSubtestDto } from "./dto/create-subtest.dto";
import { UpdateSubtestDto } from "./dto/update-subtest.dto";
import { FilterSubtestDto } from "./dto/filter-subtest.dto";
import { ResponseSubtestDto } from "./dto/response-subtest.dto";
import { ok } from "src/common/utils/response.util";

@Injectable()
export class SubtestService {
  constructor(private prismaService: PrismaService) {}

  // Helper method untuk map subtest ke DTO (exclude updated_at, created_at, deleted_at, created_by, updated_by, deleted_by)
  private mapToResponseDto(exam: any): ResponseSubtestDto {
    return {
      id: exam.id,
      title: exam.title,
      description: exam.description,
      duration: exam.duration,
      total_questions: exam.total_questions,
      type_exam: exam.type_exam as "TKA" | "TKD" | "TBI",
    };
  }

  async create(
    createSubtestDto: CreateSubtestDto,
    userId: string,
  ): Promise<ResponseSubtestDto> {
    const exam = await this.prismaService.exam.create({
      data: {
        title: createSubtestDto.title,
        description: createSubtestDto.description,
        duration: createSubtestDto.duration,
        total_questions: 0, // Default, akan di-update saat ada soal
        type_exam: createSubtestDto.type_exam,
        created_by: userId,
        // deleted_at default null (tidak dihapus)
      },
    });
    return this.mapToResponseDto(exam);
  }

  async findAll(
    filter?: FilterSubtestDto,
    pagination?: { limit: number; offset: number },
  ) {
    try {
      const where: any = {
        deleted_at: null, // Hanya ambil yang belum dihapus
      };

      // Filter berdasarkan jenis subtest
      if (filter?.type_exam) {
        where.type_exam = filter.type_exam;
      }

      // Filter berdasarkan durasi (min dan max)
      if (
        filter?.duration_min !== undefined ||
        filter?.duration_max !== undefined
      ) {
        where.duration = {};
        if (filter.duration_min !== undefined && filter.duration_min !== null) {
          where.duration.gte = Number(filter.duration_min);
        }
        if (filter.duration_max !== undefined && filter.duration_max !== null) {
          where.duration.lte = Number(filter.duration_max);
        }
      }

      // Filter berdasarkan search (nama subtest)
      if (filter?.search && filter.search.trim() !== "") {
        where.title = {
          contains: filter.search.trim(),
          mode: "insensitive" as const, // Case insensitive search
        };
      }

      const [exams, total] = await Promise.all([
        this.prismaService.exam.findMany({
          where,
          take: pagination?.limit ?? 10,
          skip: pagination?.offset ?? 0,
          orderBy: {
            created_at: "desc",
          },
        }),
        this.prismaService.exam.count({ where }),
      ]);

      const data = exams.map((exam) => this.mapToResponseDto(exam));
      return ok(data, "Fetched successfully", {
        total,
        limit: pagination?.limit ?? 10,
        offset: pagination?.offset ?? 0,
        nextPage:
          total > (pagination?.offset ?? 0) + (pagination?.limit ?? 10)
            ? (pagination?.offset ?? 0) + (pagination?.limit ?? 10)
            : null,
      });
    } catch (error) {
      console.error("Error in findAll subtest:", error);
      throw error;
    }
  }

  async findOne(id: number): Promise<ResponseSubtestDto> {
    const exam = await this.prismaService.exam.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!exam) {
      throw new NotFoundException("Subtest not found");
    }

    return this.mapToResponseDto(exam);
  }

  async update(
    id: number,
    updateSubtestDto: UpdateSubtestDto,
    userId: string,
  ): Promise<ResponseSubtestDto> {
    // Verify subtest exists
    const existingExam = await this.findOne(id);

    const updatedExam = await this.prismaService.exam.update({
      where: { id },
      data: {
        ...updateSubtestDto,
        updated_by: userId,
      },
    });

    return this.mapToResponseDto(updatedExam);
  }

  async remove(id: number, userId: string) {
    // Verify subtest exists
    const existingExam = await this.findOne(id);

    // Soft delete
    return this.prismaService.exam.update({
      where: { id },
      data: {
        deleted_at: new Date(),
        deleted_by: userId,
      },
    });
  }
}
