import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionStatusDto } from './dto/update-transaction-status.dto';

@Injectable()
export class TransactionService {
  constructor(private prismaService: PrismaService) {}

  async create(userId: string, createTransactionDto: CreateTransactionDto) {
    // Validasi package exists
    const packageData = await this.prismaService.package.findUnique({
      where: {
        id: createTransactionDto.package_id,
      },
    });

    if (!packageData) {
      throw new NotFoundException('Package not found');
    }

    // Validasi package tidak soft deleted
    if (packageData.deleted_at && packageData.deleted_at.getTime() !== 0) {
      throw new NotFoundException('Package not found');
    }

    // Validasi package sudah published
    if (!packageData.published) {
      throw new BadRequestException('Package is not published yet');
    }

    // Gunakan amount dari DTO atau ambil dari package price
    const amount =
      createTransactionDto.amount ?? packageData.price;

    // Buat transaction dengan status "unpaid" default
    return this.prismaService.transaction.create({
      data: {
        user_id: userId,
        package_id: createTransactionDto.package_id,
        amount: amount,
        payment_method: createTransactionDto.payment_method,
        status: 'unpaid',
        deleted_at: new Date(0),
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
  }

  async findAll() {
    return this.prismaService.transaction.findMany({
      where: {
        deleted_at: new Date(0), // Hanya yang tidak dihapus
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
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async findOne(id: number) {
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
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.deleted_at && transaction.deleted_at.getTime() !== 0) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }

  async findByUser(userId: string) {
    return this.prismaService.transaction.findMany({
      where: {
        user_id: userId,
        deleted_at: new Date(0), // Hanya yang tidak dihapus
      },
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
      orderBy: {
        created_at: 'desc',
      },
    });
  }

  async updateStatus(
    id: number,
    updateTransactionStatusDto: UpdateTransactionStatusDto,
  ) {
    const transaction = await this.prismaService.transaction.findUnique({
      where: {
        id,
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    if (transaction.deleted_at && transaction.deleted_at.getTime() !== 0) {
      throw new NotFoundException('Transaction not found');
    }

    // Jika status diubah ke "paid", buat UserPackage juga
    if (updateTransactionStatusDto.status === 'paid' && transaction.status === 'unpaid') {
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

    return this.prismaService.transaction.update({
      where: {
        id,
      },
      data: {
        status: updateTransactionStatusDto.status,
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
  }
}

