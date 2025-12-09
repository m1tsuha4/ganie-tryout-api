import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreatePackageDto } from "./dto/create-package.dto";
import { UpdatePackageDto } from "./dto/update-package.dto";
import { CreateSubtestDto } from "./dto/create-subtest.dto";
import { ResponsePackageDto } from "./dto/response-package.dto";

@Injectable()
export class PackageService {
  constructor(private prismaService: PrismaService) {}

  // Helper method untuk map package ke DTO (exclude updated_at, created_at, deleted_at)
  private mapToResponseDto(packageData: any): ResponsePackageDto {
    return {
      id: packageData.id,
      title: packageData.title,
      description: packageData.description,
      price: packageData.price,
      thumbnail_url: packageData.thumbnail_url,
      published: packageData.published,
      type: packageData.type as "SARJANA" | "PASCASARJANA",
    };
  }

  // Create package (untuk Sarjana & Vokasi atau Pascasarjana)
  async create(createPackageDto: CreatePackageDto): Promise<ResponsePackageDto> {
    const packageData = await this.prismaService.package.create({
      data: {
        ...createPackageDto,
        // deleted_at default null (tidak dihapus)
      },
    });
    return this.mapToResponseDto(packageData);
  }

  // Get all packages (filter by type jika diberikan)
  async findAll(type?: "SARJANA" | "PASCASARJANA"): Promise<ResponsePackageDto[]> {
    const where: any = {
      deleted_at: null, // Hanya yang tidak dihapus
    };
    if (type) {
      where.type = type;
    }
    
    const packages = await this.prismaService.package.findMany({
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
    
    return packages.map((pkg) => this.mapToResponseDto(pkg));
  }

  // Get packages by published status (filter by type jika diberikan)
  async findByStatus(published: boolean, type?: "SARJANA" | "PASCASARJANA"): Promise<ResponsePackageDto[]> {
    const where: any = {
      published,
      deleted_at: null, // Hanya yang tidak dihapus
    };
    if (type) {
      where.type = type;
    }
    
    const packages = await this.prismaService.package.findMany({
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
    
    return packages.map((pkg) => this.mapToResponseDto(pkg));
  }

  // Get package by ID (return dengan nested data, tapi exclude updated_at dan created_at dari field utama)
  async findOne(id: number, isAdmin: boolean = false) {
    const packageData = await this.prismaService.package.findFirst({
      where: {
        id,
        deleted_at: null, // Hanya yang tidak dihapus
      },
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

    // User biasa tidak bisa akses unpublished package
    if (!isAdmin && !packageData.published) {
      throw new ForbiddenException(
        "User biasa tidak bisa mengakses paket yang belum dipublish",
      );
    }

    // Return dengan exclude updated_at dan created_at dari field utama, tapi tetap include nested data
    const { updated_at, created_at, deleted_at, created_by, updated_by, deleted_by, ...packageMain } = packageData;
    return packageMain;
  }

  // Get ringkasan paket (summary)
  async getPackageSummary(id: number, isAdmin: boolean = false) {
    const packageData = await this.findOne(id, isAdmin);

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
  async update(id: number, updatePackageDto: UpdatePackageDto): Promise<ResponsePackageDto> {
    const existingPackage = await this.findOne(id);

    const updatedPackage = await this.prismaService.package.update({
      where: { id },
      data: updatePackageDto,
    });
    
    return this.mapToResponseDto(updatedPackage);
  }

  // Delete package (soft delete)
  async remove(id: number) {
    const packageData = await this.findOne(id, true); // Admin bisa akses untuk delete

    // Cek apakah package masih digunakan oleh transaction yang aktif
    const activeTransactions = await this.prismaService.transaction.findFirst({
      where: {
        package_id: id,
        deleted_at: null, // Hanya transaction yang tidak dihapus
      },
    });

    if (activeTransactions) {
      throw new BadRequestException(
        "Package tidak bisa dihapus karena masih ada transaksi yang menggunakan package ini",
      );
    }

    // Soft delete (update deleted_at)
    return this.prismaService.package.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
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
        // deleted_at default null (tidak dihapus)
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
  async getSubtests(packageId: number, isAdmin: boolean = false) {
    const packageData = await this.findOne(packageId, isAdmin);

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
        deleted_at: null, // Hanya yang tidak dihapus
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
