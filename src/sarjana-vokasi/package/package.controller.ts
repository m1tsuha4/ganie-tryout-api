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

@ApiTags("Package")
@Controller("package")
export class PackageController {
  constructor(
    private readonly packageService: PackageService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Create paket baru",
    description: `Membuat paket tryout baru.

**Type:** Harus diisi SARJANA atau PASCASARJANA

**Flow:**
1. Buat paket → dapat package_id
2. Pilih subtest yang sudah ada → link ke package
3. Buat soal untuk subtest tersebut`,
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
    @Body(new ZodValidationPipe(CreatePackageSchema))
    createPackageDto: CreatePackageDto,
  ) {
    return this.packageService.create(createPackageDto);
  }

  @Get()
  @ApiOperation({
    summary: "Get semua paket",
    description: `Mengambil daftar semua paket.
    
**Filter:**
- ?type=SARJANA: Hanya paket Sarjana & Vokasi
- ?type=PASCASARJANA: Hanya paket Pascasarjana
- ?published=true: Hanya paket yang sudah dipublish
- ?published=false: Hanya paket yang belum dipublish
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
    @Query("type") type?: "SARJANA" | "PASCASARJANA",
    @Query("published") published?: string,
  ) {
    if (published !== undefined) {
      const isPublished = published === "true";
      return this.packageService.findByStatus(isPublished, type);
    }
    return this.packageService.findAll(type);
  }

  @Get(":id/summary")
  @ApiOperation({
    summary: "Get ringkasan paket untuk dashboard",
    description: `Mengambil ringkasan paket yang menampilkan:
- Total durasi (menit)
- Total soal
- Jumlah subtest
- Harga paket

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
  getSummary(@Param("id", ParseIntPipe) id: number) {
    return this.packageService.getPackageSummary(id);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Get detail paket berdasarkan ID",
    description: `Mengambil detail lengkap paket termasuk semua subtest dan soal.

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
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.packageService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Update paket (termasuk publish/unpublish)",
    description: `Update paket yang sudah ada. Bisa update sebagian atau semua field.
    
**Publish/Unpublish:**
- Set \`published: true\` untuk publish
- Set \`published: false\` untuk unpublish
- Bisa combine dengan update field lain sekaligus`,
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
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdatePackageSchema))
    updatePackageDto: UpdatePackageDto,
  ) {
    return this.packageService.update(id, updatePackageDto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Delete paket",
    description: `Menghapus paket.
    
**Catatan:** 
- Operasi ini tidak bisa dibatalkan
- Subtest yang terlink tidak akan terhapus (hanya link yang dihapus)`,
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
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.packageService.remove(id);
  }

  @Post(":id/subtest/:examId")
  @ApiOperation({
    summary: "Pilih subtest untuk paket",
    description: `Menambahkan subtest yang sudah ada ke paket.

**Flow baru:**
1. Buat subtest terlebih dahulu di Manajemen Subtest
2. Pilih subtest yang sudah ada untuk paket ini
3. Subtest bisa digunakan untuk berbagai paket

**Catatan:**
- Subtest harus sudah dibuat sebelumnya
- Subtest yang sudah terpilih tidak akan muncul di daftar tersedia`,
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
  @ApiOperation({
    summary: "Get daftar subtest tersedia",
    description: `Mengambil daftar semua subtest yang tersedia (belum dipilih untuk paket ini).

Digunakan untuk menampilkan subtest yang bisa dipilih saat mengelola paket.`,
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
  @ApiOperation({
    summary: "Get daftar subtest dalam paket",
    description: `Mengambil daftar semua subtest yang sudah terpilih untuk paket ini.`,
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
  getSubtests(@Param("id", ParseIntPipe) packageId: number) {
    return this.packageService.getSubtests(packageId);
  }

  @Delete(":packageId/subtest/:examId")
  @ApiOperation({
    summary: "Hapus subtest dari paket",
    description: `Menghapus subtest dari paket (hanya menghapus link, subtest tetap ada).
    
**Catatan:** 
- Subtest tidak akan dihapus, hanya dihapus dari paket ini
- Subtest tetap bisa digunakan untuk paket lain
- Soal dalam subtest tidak akan terhapus`,
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
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        if (!file.mimetype.startsWith("image/")) {
          return cb(new Error("Only image files are allowed!"), false);
        }
        cb(null, true);
      },
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
    }),
  )
  @ApiOperation({
    summary: "Upload thumbnail package",
    description: `Upload thumbnail untuk package. File akan di-upload ke Cloudinary dan return URL.

**Gunakan URL yang dikembalikan di field \`thumbnail_url\` saat create/update package.`,
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
