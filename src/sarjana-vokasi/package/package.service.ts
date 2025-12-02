import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { CreateSubtestDto } from './dto/create-subtest.dto';

@Injectable()
export class PackageService {
  constructor(private prismaService: PrismaService) {}

  // Create package untuk Sarjana & Vokasi
  async create(createPackageDto: CreatePackageDto) {
    return this.prismaService.package.create({
      data: {
        ...createPackageDto,
        type: 'SARJANA', // Set type di Package
        deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
      },
    });
  }

  // Create package untuk Pascasarjana
  async createPascasarjana(createPackageDto: CreatePackageDto) {
    return this.prismaService.package.create({
      data: {
        ...createPackageDto,
        type: 'PASCASARJANA', // Set type di Package
        deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
      },
    });
  }

  // Get all packages untuk Sarjana & Vokasi (filter by Package type = SARJANA)
  async findAllSarjana() {
    return this.prismaService.package.findMany({
      where: {
        type: 'SARJANA', // Filter berdasarkan type di Package
      },
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
        created_at: 'desc',
      },
    });
  }

  // Get packages by published status untuk Sarjana & Vokasi
  async findByStatus(published: boolean) {
    return this.prismaService.package.findMany({
      where: {
        published,
        type: 'SARJANA', // Filter berdasarkan type di Package
      },
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
        created_at: 'desc',
      },
    });
  }

  // Get package by ID untuk Sarjana & Vokasi
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
      throw new NotFoundException('Package not found');
    }

    // Verify ini package Sarjana & Vokasi
    if (packageData.type !== 'SARJANA') {
      throw new NotFoundException('Package not found for Sarjana & Vokasi');
    }

    return packageData;
  }

  // Get ringkasan paket (summary) untuk Sarjana & Vokasi
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

  // Update package untuk Sarjana & Vokasi (termasuk publish/unpublish via published field)
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
        type_exam: createSubtestDto.type_exam as 'TKA' | 'TBI' | 'TKD',
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

  // Delete subtest (Exam) dari package
  async deleteSubtest(packageId: number, examId: number) {
    // Verify package exists dan untuk Sarjana & Vokasi
    const packageData = await this.findOne(packageId);

    // Verify exam belongs to this package
    const packageExam = await this.prismaService.packageExam.findFirst({
      where: {
        package_id: packageId,
        exam_id: examId,
      },
    });

    if (!packageExam) {
      throw new NotFoundException('Subtest not found in this package');
    }

    // Delete PackageExam relation
    await this.prismaService.packageExam.delete({
      where: { id: packageExam.id },
    });

    // Delete Exam (akan cascade delete questions dan choices)
    await this.prismaService.exam.delete({
      where: { id: examId },
    });

    return { message: 'Subtest deleted successfully' };
  }

  // ========== METHODS UNTUK PASCASARJANA ==========

  // Get all packages untuk Pascasarjana (filter by Package type = PASCASARJANA)
  async findAllPascasarjana() {
    return this.prismaService.package.findMany({
      where: {
        type: 'PASCASARJANA', // Filter berdasarkan type di Package
      },
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
        created_at: 'desc',
      },
    });
  }

  // Get packages by published status untuk Pascasarjana
  async findByStatusPascasarjana(published: boolean) {
    return this.prismaService.package.findMany({
      where: {
        published,
        type: 'PASCASARJANA', // Filter berdasarkan type di Package
      },
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
        created_at: 'desc',
      },
    });
  }

  // Get package by ID untuk Pascasarjana
  async findOnePascasarjana(id: number) {
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
      throw new NotFoundException('Package not found');
    }

    // Verify ini package Pascasarjana
    if (packageData.type !== 'PASCASARJANA') {
      throw new NotFoundException('Package not found for Pascasarjana');
    }

    return packageData;
  }

  // Get ringkasan paket untuk Pascasarjana
  async getPackageSummaryPascasarjana(id: number) {
    const packageData = await this.findOnePascasarjana(id);

    const totalDurasi = packageData.package_exams.reduce(
      (sum, pe) => sum + pe.exam.duration,
      0,
    );

    const totalSoal = packageData.package_exams.reduce(
      (sum, pe) => sum + pe.exam.total_questions,
      0,
    );

    const jumlahSubtest = packageData.package_exams.length;
    const hargaPaket = packageData.price;

    return {
      total_durasi: totalDurasi,
      total_soal: totalSoal,
      jumlah_subtest: jumlahSubtest,
      harga_paket: hargaPaket,
    };
  }

  // Update package untuk Pascasarjana (termasuk publish/unpublish via published field)
  async updatePascasarjana(id: number, updatePackageDto: UpdatePackageDto) {
    const existingPackage = await this.findOnePascasarjana(id);

    return this.prismaService.package.update({
      where: { id },
      data: updatePackageDto,
    });
  }

  // Delete package untuk Pascasarjana
  async removePascasarjana(id: number) {
    const packageData = await this.findOnePascasarjana(id);

    return this.prismaService.package.delete({
      where: { id },
    });
  }

  // Tambah subtest untuk Pascasarjana (TKA atau TBI)
  async createSubtestPascasarjana(createSubtestDto: {
    package_id: number;
    title: string;
    description?: string;
    duration: number;
    type_exam: 'TKA' | 'TBI';
  }) {
    const packageData = await this.findOnePascasarjana(
      createSubtestDto.package_id,
    );

    const exam = await this.prismaService.exam.create({
      data: {
        title: createSubtestDto.title,
        description: createSubtestDto.description,
        duration: createSubtestDto.duration,
        total_questions: 0,
        type_exam: createSubtestDto.type_exam as 'TKA' | 'TBI',
        deleted_at: new Date(0), // Set default untuk soft delete (0 = not deleted)
      },
    });

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

  // Get list subtest untuk Pascasarjana
  async getSubtestsPascasarjana(packageId: number) {
    const packageData = await this.findOnePascasarjana(packageId);

    return packageData.package_exams.map((pe) => pe.exam);
  }

  // Delete subtest untuk Pascasarjana
  async deleteSubtestPascasarjana(packageId: number, examId: number) {
    const packageData = await this.findOnePascasarjana(packageId);

    const packageExam = await this.prismaService.packageExam.findFirst({
      where: {
        package_id: packageId,
        exam_id: examId,
      },
    });

    if (!packageExam) {
      throw new NotFoundException('Subtest not found in this package');
    }

    await this.prismaService.packageExam.delete({
      where: { id: packageExam.id },
    });

    await this.prismaService.exam.delete({
      where: { id: examId },
    });

    return { message: 'Subtest deleted successfully' };
  }
}

