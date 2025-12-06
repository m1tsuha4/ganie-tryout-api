import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreatePackageDto } from "./dto/create-package.dto";
import { UpdatePackageDto } from "./dto/update-package.dto";
import { CreateSubtestDto } from "./dto/create-subtest.dto";

@Injectable()
export class PackageService {
  constructor(private prismaService: PrismaService) {}

  // Create package (untuk Sarjana & Vokasi atau Pascasarjana)
  async create(createPackageDto: CreatePackageDto) {
    return this.prismaService.package.create({
      data: {
        ...createPackageDto,
        deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
      },
    });
  }

  // Get all packages (filter by type jika diberikan)
  async findAll(type?: "SARJANA" | "PASCASARJANA") {
    const where: any = {};
    if (type) {
      where.type = type;
    }
    
    return this.prismaService.package.findMany({
      where,
      include: {
        package_exams: {
          include: {
            exam: {
              include: {
                questions: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  // Get packages by published status (filter by type jika diberikan)
  async findByStatus(published: boolean, type?: "SARJANA" | "PASCASARJANA") {
    const where: any = { published };
    if (type) {
      where.type = type;
    }
    
    return this.prismaService.package.findMany({
      where,
      include: {
        package_exams: {
          include: {
            exam: {
              include: {
                questions: true,
              },
            },
          },
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  // Get package by ID
  async findOne(id: number) {
    const packageData = await this.prismaService.package.findUnique({
      where: { id },
      include: {
        package_exams: {
          include: {
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
        },
      },
    });

    if (!packageData) {
      throw new NotFoundException("Package not found");
    }

    return packageData;
  }

  // Get ringkasan paket (summary)
  async getPackageSummary(id: number) {
    const packageData = await this.findOne(id);

    // Calculate total durasi dari semua subtest
    const totalDurasi = packageData.package_exams.reduce(
      (sum, pe) => sum + pe.exam.duration,
      0,
    );

    // Calculate total soal dari semua subtest
    const totalSoal = packageData.package_exams.reduce(
      (sum, pe) => sum + pe.exam.total_questions,
      0,
    );

    // Jumlah subtest
    const jumlahSubtest = packageData.package_exams.length;

    // Harga paket
    const hargaPaket = packageData.price;

    return {
      total_durasi: totalDurasi, // dalam menit
      total_soal: totalSoal,
      jumlah_subtest: jumlahSubtest,
      harga_paket: hargaPaket,
    };
  }

  // Update package (termasuk publish/unpublish via published field)
  async update(id: number, updatePackageDto: UpdatePackageDto) {
    const existingPackage = await this.findOne(id);

    return this.prismaService.package.update({
      where: { id },
      data: updatePackageDto,
    });
  }

  // Delete package (optional, untuk future use)
  async remove(id: number) {
    const packageData = await this.findOne(id);

    return this.prismaService.package.delete({
      where: { id },
    });
  }

  // Tambah subtest (Exam) ke package untuk Sarjana & Vokasi
  async createSubtest(createSubtestDto: CreateSubtestDto) {
    // Verify package exists dan untuk Sarjana & Vokasi
    const packageData = await this.findOne(createSubtestDto.package_id);

    // Create Exam (subtest) dengan type_exam dari request (TKA atau TKD)
    const exam = await this.prismaService.exam.create({
      data: {
        title: createSubtestDto.title,
        description: createSubtestDto.description,
        duration: createSubtestDto.duration,
        total_questions: 0, // Default, akan di-update saat ada soal
        type_exam: createSubtestDto.type_exam as "TKA" | "TBI" | "TKD",
        deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
      },
    });

    // Link Exam ke Package via PackageExam (tidak perlu set type lagi)
    const packageExam = await this.prismaService.packageExam.create({
      data: {
        package_id: createSubtestDto.package_id,
        exam_id: exam.id,
      },
      include: {
        exam: true,
        package: true,
      },
    });

    return packageExam;
  }

  // Get list subtest (Exam) untuk package tertentu
  async getSubtests(packageId: number) {
    const packageData = await this.findOne(packageId);

    return packageData.package_exams.map((pe) => pe.exam);
  }

  // Get available subtest (yang belum dipilih untuk paket ini)
  async getAvailableSubtests(packageId: number) {
    // Verify package exists
    const packageData = await this.findOne(packageId);

    // Get semua exam_id yang sudah dipilih untuk paket ini
    const selectedExamIds = packageData.package_exams.map((pe) => pe.exam_id);

    // Get semua subtest yang belum dipilih (dan belum dihapus)
    return this.prismaService.exam.findMany({
      where: {
        deleted_at: null,
        id: {
          notIn: selectedExamIds.length > 0 ? selectedExamIds : undefined,
        },
      },
      orderBy: {
        created_at: "desc",
      },
    });
  }

  // Link subtest yang sudah ada ke package
  async linkSubtest(packageId: number, examId: number) {
    // Verify package exists
    const packageData = await this.findOne(packageId);

    // Verify exam exists dan belum dihapus
    const exam = await this.prismaService.exam.findFirst({
      where: {
        id: examId,
        deleted_at: null,
      },
    });

    if (!exam) {
      throw new NotFoundException("Subtest not found");
    }

    // Check apakah sudah terlink ke package ini
    const existingLink = await this.prismaService.packageExam.findFirst({
      where: {
        package_id: packageId,
        exam_id: examId,
      },
    });

    if (existingLink) {
      throw new BadRequestException(
        "Subtest sudah terpilih untuk paket ini",
      );
    }

    // Create PackageExam relation
    const packageExam = await this.prismaService.packageExam.create({
      data: {
        package_id: packageId,
        exam_id: examId,
      },
      include: {
        exam: true,
        package: true,
      },
    });

    return packageExam;
  }

  // Delete subtest (Exam) dari package (hanya hapus link, tidak hapus Exam)
  async deleteSubtest(packageId: number, examId: number) {
    // Verify package exists
    const packageData = await this.findOne(packageId);

    // Verify exam belongs to this package
    const packageExam = await this.prismaService.packageExam.findFirst({
      where: {
        package_id: packageId,
        exam_id: examId,
      },
    });

    if (!packageExam) {
      throw new NotFoundException("Subtest not found in this package");
    }

    // Delete PackageExam relation (hanya hapus link, Exam tetap ada)
    await this.prismaService.packageExam.delete({
      where: { id: packageExam.id },
    });

    return { message: "Subtest berhasil dihapus dari paket" };
  }
}
