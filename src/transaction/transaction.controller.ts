import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto, CreateTransactionSchema } from './dto/create-transaction.dto';
import {
  UpdateTransactionStatusDto,
  UpdateTransactionStatusSchema,
} from './dto/update-transaction-status.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';
import { JwtAuthGuard } from 'src/auth/guard/jwt-guard.auth';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Transaction')
@Controller('transaction')
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Buat transaksi baru (pembelian paket)',
    description: `User membeli paket dan mengisi form pembelian.
    **Flow:**
    1. User pilih paket dari dashboard
    2. User isi form pembelian (package_id, payment_method)
    3. Transaksi dibuat dengan status "unpaid"
    4. User akan diarahkan ke link WhatsApp untuk kirim bukti pembayaran`,
  })
  @ApiBody({
    description: 'Data transaksi baru',
    examples: {
      basic: {
        summary: 'Contoh transaksi dasar',
        value: {
          package_id: 1,
          payment_method: 'Transfer Bank BCA',
        },
      },
      withAmount: {
        summary: 'Contoh dengan amount custom',
        value: {
          package_id: 1,
          payment_method: 'E-Wallet OVO',
          amount: 50000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Transaksi berhasil dibuat',
    schema: {
      example: {
        id: 1,
        user_id: 'user-uuid',
        package_id: 1,
        amount: 50000,
        payment_method: 'Transfer Bank BCA',
        status: 'unpaid',
        transaction_date: '2025-01-01T00:00:00.000Z',
        created_at: '2025-01-01T00:00:00.000Z',
        user: {
          id: 'user-uuid',
          username: 'johndoe',
          name: 'John Doe',
          email: 'john@example.com',
        },
        package: {
          id: 1,
          title: 'Tryout SBMPTN 2025 - Paket A',
          description: 'Paket tryout lengkap',
          price: 50000,
          type: 'SARJANA',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token tidak valid',
  })
  @ApiResponse({
    status: 404,
    description: 'Package not found',
  })
  create(@Request() req: any, @Body(new ZodValidationPipe(CreateTransactionSchema)) createTransactionDto: CreateTransactionDto) {
    // req.user berisi { id, email } dari JWT token
    return this.transactionService.create(req.user.id, createTransactionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get semua transaksi (Admin)',
    description: 'Mendapatkan semua transaksi. Untuk admin melihat semua transaksi.',
  })
  @ApiResponse({
    status: 200,
    description: 'List semua transaksi',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token tidak valid',
  })
  findAll() {
    return this.transactionService.findAll();
  }

  @Get('user')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get transaksi user yang sedang login',
    description: 'Mendapatkan semua transaksi milik user yang sedang login.',
  })
  @ApiResponse({
    status: 200,
    description: 'List transaksi user',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token tidak valid',
  })
  findByUser(@Request() req: any) {
    return this.transactionService.findByUser(req.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Get detail transaksi',
    description: 'Mendapatkan detail transaksi berdasarkan ID.',
  })
  @ApiResponse({
    status: 200,
    description: 'Detail transaksi',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token tidak valid',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transactionService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Update status transaksi (Admin)',
    description: `Admin mengupdate status transaksi menjadi "unpaid" atau "paid".
    **Note:** Ketika status diubah ke "paid", UserPackage akan otomatis dibuat.`,
  })
  @ApiBody({
    description: 'Status transaksi baru',
    examples: {
      unpaid: {
        summary: 'Set status unpaid',
        value: {
          status: 'unpaid',
        },
      },
      paid: {
        summary: 'Set status paid',
        value: {
          status: 'paid',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Status transaksi berhasil diupdate',
    schema: {
      example: {
        id: 1,
        user_id: 'user-uuid',
        package_id: 1,
        amount: 50000,
        payment_method: 'Transfer Bank BCA',
        status: 'paid',
        transaction_date: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-01T00:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Token tidak valid',
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateTransactionStatusSchema))
    updateTransactionStatusDto: UpdateTransactionStatusDto,
  ) {
    return this.transactionService.updateStatus(id, updateTransactionStatusDto);
  }
}

