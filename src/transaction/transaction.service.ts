import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { CreateTransactionDto } from "./dto/create-transaction.dto";
import { UpdateTransactionStatusDto } from "./dto/update-transaction-status.dto";
import { ResponseTransactionDto } from "./dto/response-transaction.dto";
import { CloudinaryService } from "src/common/services/cloudinary.service";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { ok } from "src/common/utils/response.util";

@Injectable()
export class TransactionService {
  constructor(
    private prismaService: PrismaService,
    private cloudinaryService: CloudinaryService,
  ) {}

  // Helper method untuk map transaction ke DTO
  private mapToResponseDto(transaction: any): ResponseTransactionDto {
    return {
      id: transaction.id,
      user_id: transaction.user_id,
      package_id: transaction.package_id,
      amount: transaction.amount,
      payment_method: transaction.payment_method,
      status: transaction.status as "unpaid" | "paid",
      payment_proof_url: transaction.payment_proof_url,
      transaction_date: transaction.transaction_date,
      voucher_code: transaction.voucher_code,
      is_completed: transaction.is_completed ?? false,
      user: transaction.user
        ? {
            id: transaction.user.id,
            username: transaction.user.username,
            name: transaction.user.name,
            email: transaction.user.email,
          }
        : undefined,
      package: transaction.package
        ? {
            id: transaction.package.id,
            title: transaction.package.title,
            description: transaction.package.description,
            price: transaction.package.price,
            type: transaction.package.type as "SARJANA" | "PASCASARJANA",
            thumbnail_url: transaction.package.thumbnail_url,
          }
        : undefined,
    };
  }

  // Helper method untuk mendapatkan status kelengkapan ujian dalam paket
  private async getPackageCompletionStatus(
    userId: string,
    packageId: number,
  ): Promise<boolean> {
    const totalExams = await this.prismaService.packageExam.count({
      where: { package_id: packageId },
    });
    if (totalExams === 0) return false;

    const completedExams = await this.prismaService.userExamSession.count({
      where: {
        user_id: userId,
        package_id: packageId,
        completed_at: { not: null },
      },
    });

    return completedExams === totalExams;
  }

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    // Validasi user exists
    const user = await this.prismaService.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new BadRequestException("User not found or is not a regular user");
    }

    // Validasi package exists
    const packageData = await this.prismaService.package.findUnique({
      where: {
        id: createTransactionDto.package_id,
      },
    });

    if (!packageData) {
      throw new NotFoundException("Package not found");
    }

    // Validasi package tidak soft deleted
    if (packageData.deleted_at && packageData.deleted_at.getTime() !== 0) {
      throw new NotFoundException("Package not found");
    }

    // Validasi package sudah published
    if (!packageData.published) {
      throw new BadRequestException("Package is not published yet");
    }

    // Gunakan amount dari DTO atau ambil dari package price
    let amount = createTransactionDto.amount ?? packageData.price;
    let paymentMethod = createTransactionDto.payment_method;
    let status = "unpaid";

    if (createTransactionDto.voucher_code) {
      const userVoucher = createTransactionDto.voucher_code.trim();

      // Check if package has voucher code configured
      if (!packageData.voucher_code) {
        throw new BadRequestException("This package does not accept vouchers");
      }

      // Check if the voucher code matches (case-insensitive)
      if (
        packageData.voucher_code.toLowerCase() !== userVoucher.toLowerCase()
      ) {
        throw new BadRequestException("Invalid voucher code");
      }

      // Check if voucher has expired
      if (packageData.expired_date && new Date() > packageData.expired_date) {
        throw new BadRequestException("Voucher has expired");
      }

      // Check if the user has already used this voucher for this package
      const existingUsedVoucher =
        await this.prismaService.transaction.findFirst({
          where: {
            user_id: userId,
            package_id: packageData.id,
            voucher_code: {
              equals: packageData.voucher_code,
              mode: "insensitive",
            },
            status: "paid",
            deleted_at: null,
          },
        });

      if (existingUsedVoucher) {
        throw new BadRequestException(
          "You have already used this voucher for this package",
        );
      }

      // Set amount to 0, payment method to "voucher", and status to "paid"
      amount = 0;
      paymentMethod = "voucher";
      status = "paid";
    }

    // Buat transaction & UserPackage secara atomik
    const transaction = await this.prismaService.$transaction(async (tx) => {
      const newTx = await tx.transaction.create({
        data: {
          user_id: userId,
          package_id: createTransactionDto.package_id,
          amount: amount,
          payment_method: paymentMethod,
          status: status,
          payment_proof_url: createTransactionDto.payment_proof_url,
          voucher_code: createTransactionDto.voucher_code
            ? packageData.voucher_code
            : null,
          created_by: userId,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              email: true,
            },
          },
          package: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              type: true,
              thumbnail_url: true,
            },
          },
        },
      });

      if (status === "paid") {
        const existingUserPackage = await tx.userPackage.findFirst({
          where: {
            user_id: userId,
            package_id: packageData.id,
          },
        });

        if (!existingUserPackage) {
          await tx.userPackage.create({
            data: {
              user_id: userId,
              package_id: packageData.id,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      }

      return newTx;
    });

    return this.mapToResponseDto(transaction);
  }

  async findAll(paginationDto: PaginationDto) {
    let { limit = 10, offset = 0 } = paginationDto as any;
    limit = Number(limit) || 10;
    offset = Number(offset) || 0;

    const [transactions, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where: { deleted_at: null, package: { deleted_at: null } },
        include: {
          user: {
            select: { id: true, username: true, name: true, email: true },
          },
          package: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              type: true,
              thumbnail_url: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
      }),
      this.prismaService.transaction.count({
        where: { deleted_at: null, package: { deleted_at: null } },
      }),
    ]);

    // Batch query package completion status for multiple users
    const packageIds = transactions.map((t) => t.package_id);
    const userIds = transactions.map((t) => t.user_id);

    const packageExams = await this.prismaService.packageExam.findMany({
      where: { package_id: { in: packageIds } },
      select: { package_id: true },
    });
    const examCountMap = new Map<number, number>();
    for (const pe of packageExams) {
      examCountMap.set(
        pe.package_id,
        (examCountMap.get(pe.package_id) || 0) + 1,
      );
    }

    const completedSessions = await this.prismaService.userExamSession.findMany(
      {
        where: {
          user_id: { in: userIds },
          package_id: { in: packageIds },
          completed_at: { not: null },
        },
        select: { user_id: true, package_id: true },
      },
    );
    const completedCountMap = new Map<string, number>();
    for (const s of completedSessions) {
      const key = `${s.user_id}_${s.package_id}`;
      completedCountMap.set(key, (completedCountMap.get(key) || 0) + 1);
    }

    const data = transactions.map((t) => {
      const totalExams = examCountMap.get(t.package_id) || 0;
      const completedExams =
        completedCountMap.get(`${t.user_id}_${t.package_id}`) || 0;
      const is_completed = totalExams > 0 && completedExams === totalExams;
      return this.mapToResponseDto({ ...t, is_completed });
    });

    const meta = {
      total,
      limit,
      offset,
      nextPage: total > offset + limit ? offset + limit : null,
    };

    return ok(data, "Fetched successfully", meta);
  }

  async findOne(
    id: number,
    userId: string,
    isAdmin: boolean = false,
  ): Promise<ResponseTransactionDto> {
    const transaction = await this.prismaService.transaction.findUnique({
      where: {
        id,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
          },
        },
        package: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            type: true,
            thumbnail_url: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.deleted_at && transaction.deleted_at.getTime() !== 0) {
      throw new NotFoundException("Transaction not found");
    }

    // User biasa hanya bisa akses transaksi milik sendiri
    if (!isAdmin && transaction.user_id !== userId) {
      throw new ForbiddenException(
        "User biasa tidak bisa mengakses transaksi milik user lain",
      );
    }

    const is_completed = await this.getPackageCompletionStatus(
      transaction.user_id,
      transaction.package_id,
    );
    return this.mapToResponseDto({ ...transaction, is_completed });
  }

  async findByUser(userId: string, paginationDto?: PaginationDto) {
    let { limit = 10, offset = 0 } = (paginationDto as any) || {};
    limit = Number(limit) || 10;
    offset = Number(offset) || 0;

    const [transactions, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where: {
          user_id: userId,
          deleted_at: null,
          package: { deleted_at: null },
        },
        include: {
          package: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              type: true,
              thumbnail_url: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
      }),
      this.prismaService.transaction.count({
        where: {
          user_id: userId,
          deleted_at: null,
          package: { deleted_at: null },
        },
      }),
    ]);

    // Batch query package completion status for current user
    const packageIds = transactions.map((t) => t.package_id);

    const packageExams = await this.prismaService.packageExam.findMany({
      where: { package_id: { in: packageIds } },
      select: { package_id: true },
    });
    const examCountMap = new Map<number, number>();
    for (const pe of packageExams) {
      examCountMap.set(
        pe.package_id,
        (examCountMap.get(pe.package_id) || 0) + 1,
      );
    }

    const completedSessions = await this.prismaService.userExamSession.findMany(
      {
        where: {
          user_id: userId,
          package_id: { in: packageIds },
          completed_at: { not: null },
        },
        select: { package_id: true },
      },
    );
    const completedCountMap = new Map<number, number>();
    for (const s of completedSessions) {
      completedCountMap.set(
        s.package_id,
        (completedCountMap.get(s.package_id) || 0) + 1,
      );
    }

    const data = transactions.map((t) => {
      const totalExams = examCountMap.get(t.package_id) || 0;
      const completedExams = completedCountMap.get(t.package_id) || 0;
      const is_completed = totalExams > 0 && completedExams === totalExams;
      return this.mapToResponseDto({ ...t, is_completed });
    });

    const meta = {
      total,
      limit,
      offset,
      nextPage: total > offset + limit ? offset + limit : null,
    };

    return ok(data, "Fetched successfully", meta);
  }

  async updateStatus(
    id: number,
    updateTransactionStatusDto: UpdateTransactionStatusDto,
    userId: string,
  ) {
    const transaction = await this.prismaService.transaction.findUnique({
      where: {
        id,
      },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.deleted_at && transaction.deleted_at.getTime() !== 0) {
      throw new NotFoundException("Transaction not found");
    }

    // Jika status diubah ke "paid", buat UserPackage juga
    if (
      updateTransactionStatusDto.status === "paid" &&
      transaction.status === "unpaid"
    ) {
      // Cek apakah UserPackage sudah ada
      const existingUserPackage =
        await this.prismaService.userPackage.findFirst({
          where: {
            user_id: transaction.user_id,
            package_id: transaction.package_id,
          },
        });

      // Jika belum ada, buat UserPackage baru
      if (!existingUserPackage) {
        await this.prismaService.userPackage.create({
          data: {
            user_id: transaction.user_id,
            package_id: transaction.package_id,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }

    const updatedTransaction = await this.prismaService.transaction.update({
      where: {
        id,
      },
      data: {
        status: updateTransactionStatusDto.status,
        updated_by: userId, // Admin yang update status transaksi
        updated_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
          },
        },
        package: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            type: true,
            thumbnail_url: true,
          },
        },
      },
    });

    const is_completed = await this.getPackageCompletionStatus(
      updatedTransaction.user_id,
      updatedTransaction.package_id,
    );
    return this.mapToResponseDto({ ...updatedTransaction, is_completed });
  }

  async uploadPaymentProof(
    id: number,
    paymentProofUrl: string,
    userId: string,
  ): Promise<ResponseTransactionDto> {
    // Cek transaksi exists
    const transaction = await this.prismaService.transaction.findUnique({
      where: { id },
    });

    if (!transaction) {
      throw new NotFoundException("Transaction not found");
    }

    if (transaction.deleted_at && transaction.deleted_at.getTime() !== 0) {
      throw new NotFoundException("Transaction not found");
    }

    // Validasi: hanya user pemilik transaksi yang bisa upload bukti bayar
    if (transaction.user_id !== userId) {
      throw new ForbiddenException(
        "Anda tidak memiliki akses untuk upload bukti bayar transaksi ini",
      );
    }

    // Validasi: hanya transaksi dengan status "unpaid" yang bisa upload bukti
    if (transaction.status !== "unpaid") {
      throw new BadRequestException(
        "Hanya transaksi dengan status 'unpaid' yang bisa upload bukti bayar",
      );
    }

    // Hapus bukti bayar lama jika ada
    if (transaction.payment_proof_url) {
      try {
        await this.cloudinaryService.deleteImage(transaction.payment_proof_url);
      } catch (error) {
        // Log error tapi tidak throw, karena upload baru sudah berhasil
        console.error("Error deleting old payment proof:", error);
      }
    }

    // Update payment_proof_url
    const updatedTransaction = await this.prismaService.transaction.update({
      where: { id },
      data: {
        payment_proof_url: paymentProofUrl,
        updated_by: userId,
        updated_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
          },
        },
        package: {
          select: {
            id: true,
            title: true,
            description: true,
            price: true,
            type: true,
            thumbnail_url: true,
          },
        },
      },
    });

    const is_completed = await this.getPackageCompletionStatus(
      updatedTransaction.user_id,
      updatedTransaction.package_id,
    );
    return this.mapToResponseDto({ ...updatedTransaction, is_completed });
  }
}
