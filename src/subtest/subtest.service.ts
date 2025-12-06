import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateSubtestDto } from "./dto/create-subtest.dto";
import { UpdateSubtestDto } from "./dto/update-subtest.dto";
import { FilterSubtestDto } from "./dto/filter-subtest.dto";

@Injectable()
export class SubtestService {
  constructor(private prismaService: PrismaService) {}

  async create(createSubtestDto: CreateSubtestDto) {
    return this.prismaService.exam.create({
      data: {
        title: createSubtestDto.title,
        description: createSubtestDto.description,
        duration: createSubtestDto.duration,
        total_questions: 0, // Default, akan di-update saat ada soal
        type_exam: createSubtestDto.type_exam,
        deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
      },
    });
  }

  async findAll(filter?: FilterSubtestDto) {
    const where: any = {
      deleted_at: null, // Hanya ambil yang belum dihapus
    };

    // Filter berdasarkan jenis subtest
    if (filter?.type_exam) {
      where.type_exam = filter.type_exam;
    }

    // Filter berdasarkan durasi (min dan max)
    if (filter?.duration_min || filter?.duration_max) {
      where.duration = {};
      if (filter.duration_min) {
        where.duration.gte = filter.duration_min;
      }
      if (filter.duration_max) {
        where.duration.lte = filter.duration_max;
      }
    }

    // Filter berdasarkan search (nama subtest)
    if (filter?.search) {
      where.title = {
        contains: filter.search,
        mode: "insensitive", // Case insensitive search
      };
    }

    return this.prismaService.exam.findMany({
      where,
      orderBy: {
        created_at: "desc",
      },
    });
  }

  async findOne(id: number) {
    const exam = await this.prismaService.exam.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!exam) {
      throw new NotFoundException("Subtest not found");
    }

    return exam;
  }

  async update(id: number, updateSubtestDto: UpdateSubtestDto) {
    // Verify subtest exists
    const existingExam = await this.findOne(id);

    return this.prismaService.exam.update({
      where: { id },
      data: updateSubtestDto,
    });
  }

  async remove(id: number) {
    // Verify subtest exists
    const existingExam = await this.findOne(id);

    // Soft delete
    return this.prismaService.exam.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}

