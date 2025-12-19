import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConsumes,
  ApiBearerAuth,
  ApiForbiddenResponse,
} from "@nestjs/swagger";
import { PackageService } from "./package.service";
import {
  CreatePackageDto,
  CreatePackageSchema,
} from "./dto/create-package.dto";
import {
  UpdatePackageDto,
  UpdatePackageSchema,
} from "./dto/update-package.dto";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { ResponsePackageDto } from "./dto/response-package.dto";
import { ResponseSubtestDto } from "src/subtest/dto/response-subtest.dto";
import { CloudinaryService } from "src/common/services/cloudinary.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "src/auth/guard/jwt-guard.auth";
import { AdminGuard } from "src/auth/guard/admin.guard";
import { ConfigService } from "@nestjs/config";
import { getMaxImageSize } from "src/common/utils/file-upload.util";

@ApiTags("Package")
@Controller("package")
export class PackageController {
  constructor(
    private readonly packageService: PackageService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly configService: ConfigService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create paket baru (Admin Only)",
    description: `Membuat paket tryout baru. Hanya admin yang bisa membuat paket.

**Cara menggunakan:**
1. Login sebagai admin di endpoint \`POST /auth/admin\` untuk mendapatkan token
2. Klik tombol "Authorize" (🔒) di pojok kanan atas Swagger UI
3. Masukkan token (tanpa "Bearer ", Swagger akan otomatis menambahkannya)
4. Klik "Authorize" dan "Close"
5. Sekarang bisa execute endpoint ini

**Type:** Harus diisi SARJANA atau PASCASARJANA

**Flow:**
1. Buat paket → dapat package_id
2. Pilih subtest yang sudah ada → link ke package
3. Buat soal untuk subtest tersebut`,
  })
  @ApiForbiddenResponse({
    description: "Access denied. Admin privileges required.",
  })
  @ApiBody({
    description: "Data paket baru",
    examples: {
      sarjana: {
        summary: "Contoh paket Sarjana & Vokasi",
        value: {
          title: "Tryout SBMPTN 2025 - Paket A",
          description: "Paket tryout lengkap untuk persiapan SBMPTN 2025",
          price: 50000,
          type: "SARJANA",
        },
      },
      pascasarjana: {
        summary: "Contoh paket Pascasarjana",
        value: {
          title: "Tryout S2 2025 - Paket A",
          description: "Paket tryout lengkap untuk persiapan S2",
          price: 75000,
          type: "PASCASARJANA",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Paket berhasil dibuat",
    type: ResponsePackageDto,
  })
  create(
    @Request() req: any,
    @Body(new ZodValidationPipe(CreatePackageSchema))
    createPackageDto: CreatePackageDto,
  ) {
    return this.packageService.create(createPackageDto, req.user.id);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get semua paket",
    description: `Mengambil daftar semua paket.
    
**Akses:**
- User biasa: Hanya bisa melihat paket yang sudah dipublish (published=true)
- Admin: Bisa melihat semua paket (published dan unpublished)

**Filter:**
- ?type=SARJANA: Hanya paket Sarjana & Vokasi
- ?type=PASCASARJANA: Hanya paket Pascasarjana
- ?published=true: Hanya paket yang sudah dipublish
- ?published=false: Hanya paket yang belum dipublish (Admin only)
- Bisa combine: ?type=SARJANA&published=true`,
  })
  @ApiQuery({
    name: "type",
    required: false,
    description: "Filter berdasarkan tipe paket",
    enum: ["SARJANA", "PASCASARJANA"],
    example: "SARJANA",
  })
  @ApiQuery({
    name: "published",
    required: false,
    description: "Filter berdasarkan status publish (true/false)",
    type: String,
    example: "true",
  })
  @ApiOkResponse({
    description: "Daftar paket berhasil diambil",
    type: ResponsePackageDto,
    isArray: true,
  })
  findAll(
    @Request() req: any,
    @Query("type") type?: "SARJANA" | "PASCASARJANA",
    @Query("published") published?: string,
  ) {
    const isAdmin = req.user?.type === "admin";

    // Jika user biasa dan tidak ada filter published, default ke published=true
    if (!isAdmin && published === undefined) {
      return this.packageService.findByStatus(true, type);
    }

    if (published !== undefined) {
      const isPublished = published === "true";
      // User biasa tidak bisa akses unpublished
      if (!isAdmin && !isPublished) {
        return this.packageService.findByStatus(true, type);
      }
      return this.packageService.findByStatus(isPublished, type);
    }

    // Admin bisa lihat semua, user biasa hanya published
    if (isAdmin) {
      return this.packageService.findAll(type);
    }
    return this.packageService.findByStatus(true, type);
  }

  @Get(":id/summary")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get ringkasan paket untuk dashboard",
    description: `Mengambil ringkasan paket yang menampilkan:
- Total durasi (menit)
- Total soal
- Jumlah subtest
- Harga paket

**Akses:**
- User biasa: Hanya bisa melihat paket yang sudah dipublish
- Admin: Bisa melihat semua paket

**Digunakan untuk:** Menampilkan informasi di dashboard`,
  })
  @ApiParam({
    name: "id",
    description: "ID paket",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Ringkasan paket berhasil diambil",
  })
  @ApiNotFoundResponse({
    description: "Paket tidak ditemukan",
  })
  @ApiForbiddenResponse({
    description: "User biasa tidak bisa mengakses paket yang belum dipublish",
  })
  getSummary(@Request() req: any, @Param("id", ParseIntPipe) id: number) {
    const isAdmin = req.user?.type === "admin";
    return this.packageService.getPackageSummary(id, isAdmin);
  }

  @Get(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get detail paket berdasarkan ID",
    description: `Mengambil detail lengkap paket termasuk semua subtest dan soal.

**Akses:**
- User biasa: Hanya bisa melihat paket yang sudah dipublish
- Admin: Bisa melihat semua paket (published dan unpublished)

Bisa untuk paket Sarjana & Vokasi atau Pascasarjana.`,
  })
  @ApiParam({
    name: "id",
    description: "ID paket",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Detail paket berhasil diambil",
    type: ResponsePackageDto,
  })
  @ApiNotFoundResponse({
    description: "Paket tidak ditemukan",
  })
  @ApiForbiddenResponse({
    description: "User biasa tidak bisa mengakses paket yang belum dipublish",
  })
  findOne(@Request() req: any, @Param("id", ParseIntPipe) id: number) {
    const isAdmin = req.user?.type === "admin";
    return this.packageService.findOne(id, isAdmin);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Update paket (termasuk publish/unpublish) (Admin Only)",
    description: `Update paket yang sudah ada. Hanya admin yang bisa update paket. Bisa update sebagian atau semua field.
    
**Publish/Unpublish:**
- Set \`published: true\` untuk publish
- Set \`published: false\` untuk unpublish
- Bisa combine dengan update field lain sekaligus

**PENTING:**
- **Type (SARJANA/PASCASARJANA) TIDAK BISA DIUBAH** setelah package dibuat
- Type hanya bisa ditentukan saat create package
- Ini untuk keamanan data dan konsistensi`,
  })
  @ApiForbiddenResponse({
    description: "Access denied. Admin privileges required.",
  })
  @ApiParam({
    name: "id",
    description: "ID paket yang akan di-update",
    type: Number,
    example: 1,
  })
  @ApiBody({
    description: "Data update paket",
    examples: {
      updateTitle: {
        summary: "Update title saja",
        value: {
          title: "Tryout SBMPTN 2025 - Paket A (Updated)",
        },
      },
      publish: {
        summary: "Publish paket",
        value: {
          published: true,
        },
      },
      unpublish: {
        summary: "Unpublish paket",
        value: {
          published: false,
        },
      },
      updateAll: {
        summary: "Update semua field sekaligus",
        value: {
          title: "Tryout SBMPTN 2025 - Paket A (Updated)",
          description: "Deskripsi baru",
          price: 60000,
          published: true,
        },
      },
    },
  })
  @ApiOkResponse({
    description: "Paket berhasil di-update",
    type: ResponsePackageDto,
  })
  @ApiNotFoundResponse({
    description: "Paket tidak ditemukan",
  })
  update(
    @Request() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdatePackageSchema))
    updatePackageDto: UpdatePackageDto,
  ) {
    return this.packageService.update(id, updatePackageDto, req.user.id);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Delete paket (Admin Only)",
    description: `Menghapus paket secara soft delete. Hanya admin yang bisa menghapus paket.
    
**Catatan:** 
- Operasi ini menggunakan soft delete (package tidak benar-benar dihapus dari database)
- Package tidak bisa dihapus jika masih ada transaksi aktif yang menggunakan package ini
- Subtest yang terlink tidak akan terhapus (hanya link yang dihapus)`,
  })
  @ApiResponse({
    status: 400,
    description:
      "Package tidak bisa dihapus karena masih ada transaksi yang menggunakan package ini",
  })
  @ApiForbiddenResponse({
    description: "Access denied. Admin privileges required.",
  })
  @ApiParam({
    name: "id",
    description: "ID paket yang akan dihapus",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Paket berhasil dihapus",
  })
  @ApiNotFoundResponse({
    description: "Paket tidak ditemukan",
  })
  remove(
    @Request() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.packageService.remove(id, req.user.id);
  }

  @Post(":id/subtest/:examId")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Pilih subtest untuk paket (Admin Only)",
    description: `Menambahkan subtest yang sudah ada ke paket. Hanya admin yang bisa menambahkan subtest ke paket.

**Flow baru:**
1. Buat subtest terlebih dahulu di Manajemen Subtest
2. Pilih subtest yang sudah ada untuk paket ini
3. Subtest bisa digunakan untuk berbagai paket

**Catatan:**
- Subtest harus sudah dibuat sebelumnya
- Subtest yang sudah terpilih tidak akan muncul di daftar tersedia`,
  })
  @ApiForbiddenResponse({
    description: "Access denied. Admin privileges required.",
  })
  @ApiParam({
    name: "id",
    description: "ID paket",
    type: Number,
    example: 1,
  })
  @ApiParam({
    name: "examId",
    description: "ID subtest yang akan dipilih",
    type: Number,
    example: 1,
  })
  @ApiCreatedResponse({
    description: "Subtest berhasil dipilih untuk paket",
  })
  @ApiNotFoundResponse({
    description: "Paket atau subtest tidak ditemukan",
  })
  @ApiResponse({
    status: 400,
    description: "Subtest sudah terpilih untuk paket ini",
  })
  linkSubtest(
    @Param("id", ParseIntPipe) packageId: number,
    @Param("examId", ParseIntPipe) examId: number,
  ) {
    return this.packageService.linkSubtest(packageId, examId);
  }

  @Get(":id/subtest/available")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get daftar subtest tersedia (Admin Only)",
    description: `Mengambil daftar semua subtest yang tersedia (belum dipilih untuk paket ini). Hanya admin yang bisa mengakses.

Digunakan untuk menampilkan subtest yang bisa dipilih saat mengelola paket.`,
  })
  @ApiForbiddenResponse({
    description: "Access denied. Admin privileges required.",
  })
  @ApiParam({
    name: "id",
    description: "ID paket",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Daftar subtest tersedia berhasil diambil",
    type: ResponseSubtestDto,
    isArray: true,
  })
  @ApiNotFoundResponse({
    description: "Paket tidak ditemukan",
  })
  getAvailableSubtests(@Param("id", ParseIntPipe) packageId: number) {
    return this.packageService.getAvailableSubtests(packageId);
  }

  @Get(":id/subtest")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Get daftar subtest dalam paket",
    description: `Mengambil daftar semua subtest yang sudah terpilih untuk paket ini.

**Akses:**
- User biasa: Hanya bisa melihat subtest dari paket yang sudah dipublish
- Admin: Bisa melihat semua subtest`,
  })
  @ApiForbiddenResponse({
    description: "User biasa tidak bisa mengakses paket yang belum dipublish",
  })
  @ApiParam({
    name: "id",
    description: "ID paket",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Daftar subtest berhasil diambil",
    type: ResponseSubtestDto,
    isArray: true,
  })
  @ApiNotFoundResponse({
    description: "Paket tidak ditemukan",
  })
  getSubtests(
    @Request() req: any,
    @Param("id", ParseIntPipe) packageId: number,
  ) {
    const isAdmin = req.user?.type === "admin";
    return this.packageService.getSubtests(packageId, isAdmin);
  }

  @Delete(":packageId/subtest/:examId")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Hapus subtest dari paket (Admin Only)",
    description: `Menghapus subtest dari paket (hanya menghapus link, subtest tetap ada). Hanya admin yang bisa menghapus subtest dari paket.
    
**Catatan:** 
- Subtest tidak akan dihapus, hanya dihapus dari paket ini
- Subtest tetap bisa digunakan untuk paket lain
- Soal dalam subtest tidak akan terhapus`,
  })
  @ApiForbiddenResponse({
    description: "Access denied. Admin privileges required.",
  })
  @ApiParam({
    name: "packageId",
    description: "ID paket",
    type: Number,
    example: 1,
  })
  @ApiParam({
    name: "examId",
    description: "ID subtest yang akan dihapus",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Subtest berhasil dihapus",
  })
  @ApiNotFoundResponse({
    description: "Paket atau subtest tidak ditemukan",
  })
  deleteSubtest(
    @Param("packageId", ParseIntPipe) packageId: number,
    @Param("examId", ParseIntPipe) examId: number,
  ) {
    return this.packageService.deleteSubtest(packageId, examId);
  }

  @Post("upload-thumbnail")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
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
    summary: "Upload thumbnail package (Admin Only)",
    description: `Upload thumbnail untuk package. Hanya admin yang bisa upload thumbnail. File akan di-upload ke Cloudinary dan return URL.

**Gunakan URL yang dikembalikan di field \`thumbnail_url\` saat create/update package.`,
  })
  @ApiForbiddenResponse({
    description: "Access denied. Admin privileges required.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File gambar thumbnail (max 5MB)",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Thumbnail berhasil di-upload",
    schema: {
      example: {
        url: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/package-thumbnails/abc123.jpg",
      },
    },
  })
  async uploadThumbnail(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(
      file,
      "package-thumbnails",
    );
    return { url };
  }
}
