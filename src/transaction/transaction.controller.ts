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
  UploadedFile,
  UseInterceptors,
  BadRequestException,
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
  ApiConsumes,
} from "@nestjs/swagger";
import { ResponseTransactionDto } from "./dto/response-transaction.dto";
import { CloudinaryService } from "src/common/services/cloudinary.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { ConfigService } from "@nestjs/config";
import { getMaxImageSize } from "src/common/utils/file-upload.util";

@ApiTags("Transaction")
@Controller("transaction")
@ApiBearerAuth()
export class TransactionController {
  constructor(
    private readonly transactionService: TransactionService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}

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
      withProof: {
        summary: "Contoh dengan bukti bayar",
        value: {
          package_id: 1,
          payment_method: "Transfer Bank BCA",
          payment_proof_url: "https://res.cloudinary.com/...",
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

  @Post("upload-proof-image")
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (_req: any, file: Express.Multer.File, cb: any) => {
        if (!file.mimetype.startsWith("image/")) {
          return cb(new Error("Only image files are allowed!"), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: getMaxImageSize(),
      },
    }),
  )
  @ApiOperation({
    summary: "Upload image bukti pembayaran",
    description: `Upload image bukti pembayaran ke Cloudinary dan dapatkan URL-nya.
    URL ini nanti digunakan untuk endpoint upload-proof.`,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File gambar bukti pembayaran (max 5MB)",
        },
      },
    },
  })
  @ApiOkResponse({
    description: "Image berhasil di-upload",
    schema: {
      type: "object",
      properties: {
        url: {
          type: "string",
          example: "https://res.cloudinary.com/...",
        },
      },
    },
  })
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException("File is required");
    }

    // Upload image ke Cloudinary
    const url = await this.cloudinaryService.uploadImage(
      file,
      "payment-proofs",
    );

    return { url };
  }

  @Patch(":id/upload-proof")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Submit bukti pembayaran",
    description: `User mensubmit URL bukti pembayaran untuk transaksi.
    
    **Flow:**
    1. User upload image via POST /transaction/upload-proof-image -> dapat URL
    2. User submit URL via endpoint ini`,
  })
  @ApiForbiddenResponse({
    description:
      "Forbidden - Anda tidak memiliki akses untuk upload bukti bayar transaksi ini",
  })
  @ApiNotFoundResponse({
    description: "Transaction not found",
  })
  @ApiResponse({
    status: 400,
    description:
      "Bad Request - Hanya transaksi dengan status 'unpaid' yang bisa upload bukti bayar",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        paymentProofUrl: {
          type: "string",
          description: "URL gambar bukti pembayaran dari Cloudinary",
        },
      },
      required: ["paymentProofUrl"],
    },
  })
  @ApiOkResponse({
    description: "Bukti pembayaran berhasil di-submit",
    type: ResponseTransactionDto,
  })
  async uploadPaymentProof(
    @Request() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body("paymentProofUrl") paymentProofUrl: string,
  ) {
    if (!paymentProofUrl) {
      throw new BadRequestException("paymentProofUrl is required");
    }

    // Update transaction dengan payment_proof_url
    return this.transactionService.uploadPaymentProof(
      id,
      paymentProofUrl,
      req.user.id,
    );
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
    description:
      "Forbidden - User biasa tidak bisa mengakses transaksi milik user lain",
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
    @Request() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateTransactionStatusSchema))
    updateTransactionStatusDto: UpdateTransactionStatusDto,
  ) {
    return this.transactionService.updateStatus(
      id,
      updateTransactionStatusDto,
      req.user.id,
    );
  }
}
