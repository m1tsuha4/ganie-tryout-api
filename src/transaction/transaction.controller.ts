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
} from "@nestjs/common";
import { TransactionService } from "./transaction.service";
import {
  CreateTransactionDto,
  CreateTransactionSchema,
} from "./dto/create-transaction.dto";
import {
  UpdateTransactionStatusDto,
  UpdateTransactionStatusSchema,
} from "./dto/update-transaction-status.dto";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "src/auth/guard/jwt-guard.auth";
import { AdminGuard } from "src/auth/guard/admin.guard";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { ResponseTransactionDto } from "./dto/response-transaction.dto";

@ApiTags("Transaction")
@Controller("transaction")
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Buat transaksi baru (pembelian paket)",
    description: `User membeli paket dan mengisi form pembelian.
    **Flow:**
    1. User pilih paket dari dashboard
    2. User isi form pembelian (package_id, payment_method)
    3. Transaksi dibuat dengan status "unpaid"
    4. User akan diarahkan ke link WhatsApp untuk kirim bukti pembayaran`,
  })
  @ApiBody({
    description: "Data transaksi baru",
    examples: {
      basic: {
        summary: "Contoh transaksi dasar",
        value: {
          package_id: 1,
          payment_method: "Transfer Bank BCA",
        },
      },
      withAmount: {
        summary: "Contoh dengan amount custom",
        value: {
          package_id: 1,
          payment_method: "E-Wallet OVO",
          amount: 50000,
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Transaksi berhasil dibuat",
    type: ResponseTransactionDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiResponse({
    status: 404,
    description: "Package not found",
  })
  create(
    @Request() req: any,
    @Body(new ZodValidationPipe(CreateTransactionSchema))
    createTransactionDto: CreateTransactionDto,
  ) {
    // req.user berisi { id, email } dari JWT token
    return this.transactionService.create(req.user.id, createTransactionDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Get semua transaksi (Admin Only)",
    description:
      "Mendapatkan semua transaksi. **Hanya admin yang bisa akses endpoint ini.**",
  })
  @ApiOkResponse({
    description: "List semua transaksi",
    type: ResponseTransactionDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  findAll() {
    return this.transactionService.findAll();
  }

  @Get("user")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get transaksi user yang sedang login",
    description: "Mendapatkan semua transaksi milik user yang sedang login.",
  })
  @ApiOkResponse({
    description: "List transaksi user",
    type: ResponseTransactionDto,
    isArray: true,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  findByUser(@Request() req: any) {
    return this.transactionService.findByUser(req.user.id);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Get detail transaksi",
    description: `Mendapatkan detail transaksi berdasarkan ID.

**Akses:**
- User biasa: Hanya bisa melihat transaksi milik sendiri
- Admin: Bisa melihat semua transaksi`,
  })
  @ApiOkResponse({
    description: "Detail transaksi",
    type: ResponseTransactionDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - User biasa tidak bisa mengakses transaksi milik user lain",
  })
  @ApiNotFoundResponse({
    description: "Transaction not found",
  })
  findOne(@Request() req: any, @Param("id", ParseIntPipe) id: number) {
    const userId = req.user.id;
    const isAdmin = req.user.type === "admin";
    return this.transactionService.findOne(id, userId, isAdmin);
  }

  @Patch(":id/status")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Update status transaksi (Admin Only)",
    description: `Admin mengupdate status transaksi menjadi "unpaid" atau "paid".
    **Hanya admin yang bisa akses endpoint ini.**
    **Note:** Ketika status diubah ke "paid", UserPackage akan otomatis dibuat.`,
  })
  @ApiBody({
    description: "Status transaksi baru",
    examples: {
      unpaid: {
        summary: "Set status unpaid",
        value: {
          status: "unpaid",
        },
      },
      paid: {
        summary: "Set status paid",
        value: {
          status: "paid",
        },
      },
    },
  })
  @ApiOkResponse({
    description: "Status transaksi berhasil diupdate",
    type: ResponseTransactionDto,
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  @ApiNotFoundResponse({
    description: "Transaction not found",
  })
  updateStatus(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateTransactionStatusSchema))
    updateTransactionStatusDto: UpdateTransactionStatusDto,
  ) {
    return this.transactionService.updateStatus(id, updateTransactionStatusDto);
  }
}
