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
          }
        : undefined,
    };
  }

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
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
    const amount = createTransactionDto.amount ?? packageData.price;

    // Buat transaction dengan status "unpaid" default
    const transaction = await this.prismaService.transaction.create({
      data: {
        user_id: userId,
        package_id: createTransactionDto.package_id,
        amount: amount,
        payment_method: createTransactionDto.payment_method,
        status: "unpaid",
        payment_proof_url: createTransactionDto.payment_proof_url, // Simpan bukti bayar jika ada
        created_by: userId, // User yang membuat transaksi
        // deleted_at default null (tidak dihapus)
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
          },
        },
      },
    });

    return this.mapToResponseDto(transaction);
  }

  async findAll(paginationDto: PaginationDto) {
    let { limit = 10, offset = 0 } = paginationDto as any;
    limit = Number(limit) || 10;
    offset = Number(offset) || 0;

    const [transactions, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where: { deleted_at: null },
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
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
      }),
      this.prismaService.transaction.count({ where: { deleted_at: null } }),
    ]);

    const data = transactions.map((t) => this.mapToResponseDto(t));
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

    return this.mapToResponseDto(transaction);
  }

  async findByUser(userId: string, paginationDto?: PaginationDto) {
    let { limit = 10, offset = 0 } = (paginationDto as any) || {};
    limit = Number(limit) || 10;
    offset = Number(offset) || 0;

    const [transactions, total] = await Promise.all([
      this.prismaService.transaction.findMany({
        where: { user_id: userId, deleted_at: null },
        include: {
          package: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              type: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: { created_at: "desc" },
      }),
      this.prismaService.transaction.count({
        where: { user_id: userId, deleted_at: null },
      }),
    ]);

    const data = transactions.map((t) => this.mapToResponseDto(t));
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
          },
        },
      },
    });

    return this.mapToResponseDto(updatedTransaction);
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
          },
        },
      },
    });

    return this.mapToResponseDto(updatedTransaction);
  }
}
