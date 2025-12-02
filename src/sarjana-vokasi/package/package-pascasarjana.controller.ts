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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { PackageService } from './package.service';
import { CreatePackageDto, CreatePackageSchema } from './dto/create-package.dto';
import { UpdatePackageDto, UpdatePackageSchema } from './dto/update-package.dto';
import {
  CreateSubtestPascasarjanaDto,
  CreateSubtestPascasarjanaSchema,
} from './dto/create-subtest.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@ApiTags('PackagePascasarjana')
@Controller('package/pascasarjana')
export class PackagePascasarjanaController {
  constructor(private readonly packageService: PackageService) {}

  @Post()
  @ApiOperation({
    summary: 'Create paket baru untuk Pascasarjana',
    description: `Membuat paket tryout baru untuk Pascasarjana.
    
**Type:** Otomatis diset ke PASCASARJANA

**Flow:**
1. Buat paket → dapat package_id
2. Tambah subtest (TKA/TBI) → dapat exam_id
3. Buat soal untuk subtest tersebut`,
  })
  @ApiBody({
    description: 'Data paket baru',
    examples: {
      basic: {
        summary: 'Contoh paket dasar',
        value: {
          title: 'Tryout S2 2025 - Paket A',
          description: 'Paket tryout lengkap untuk persiapan S2 2025',
          price: 75000,
        },
      },
      minimal: {
        summary: 'Contoh minimal',
        value: {
          title: 'Tryout Pascasarjana 2025',
          price: 50000,
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Paket berhasil dibuat',
    schema: {
      example: {
        id: 1,
        title: 'Tryout S2 2025 - Paket A',
        description: 'Paket tryout lengkap untuk persiapan S2 2025',
        price: 75000,
        published: false,
        type: 'PASCASARJANA',
        created_at: '2025-12-02T10:00:00.000Z',
        updated_at: '2025-12-02T10:00:00.000Z',
      },
    },
  })
  create(
    @Body(new ZodValidationPipe(CreatePackageSchema))
    createPackageDto: CreatePackageDto,
  ) {
    return this.packageService.createPascasarjana(createPackageDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get semua paket Pascasarjana',
    description: `Mengambil daftar semua paket untuk Pascasarjana.
    
**Filter:**
- Tanpa query: Ambil semua paket
- ?published=true: Hanya paket yang sudah dipublish
- ?published=false: Hanya paket yang belum dipublish`,
  })
  @ApiQuery({
    name: 'published',
    required: false,
    description: 'Filter berdasarkan status publish (true/false)',
    type: String,
    example: 'true',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar paket berhasil diambil',
    schema: {
      example: [
        {
          id: 1,
          title: 'Tryout S2 2025 - Paket A',
          description: 'Paket tryout lengkap',
          price: 75000,
          published: true,
          type: 'PASCASARJANA',
          created_at: '2025-12-02T10:00:00.000Z',
          updated_at: '2025-12-02T10:00:00.000Z',
          package_exams: [],
        },
      ],
    },
  })
  findAll(@Query('published') published?: string) {
    if (published !== undefined) {
      const isPublished = published === 'true';
      return this.packageService.findByStatusPascasarjana(isPublished);
    }
    return this.packageService.findAllPascasarjana();
  }

  @Get(':id/summary')
  @ApiOperation({
    summary: 'Get ringkasan paket untuk dashboard',
    description: `Mengambil ringkasan paket yang menampilkan:
- Total durasi (menit)
- Total soal
- Jumlah subtest
- Harga paket

**Digunakan untuk:** Menampilkan informasi di dashboard`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID paket',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Ringkasan paket berhasil diambil',
    schema: {
      example: {
        total_durasi: 120,
        total_soal: 50,
        jumlah_subtest: 2,
        harga_paket: 75000,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Paket tidak ditemukan atau bukan untuk Pascasarjana',
  })
  getSummary(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.getPackageSummaryPascasarjana(id);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get detail paket berdasarkan ID',
    description: `Mengambil detail lengkap paket termasuk semua subtest dan soal.`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID paket',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Detail paket berhasil diambil',
  })
  @ApiResponse({
    status: 404,
    description: 'Paket tidak ditemukan atau bukan untuk Pascasarjana',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.findOnePascasarjana(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update paket (termasuk publish/unpublish)',
    description: `Update paket yang sudah ada. Bisa update sebagian atau semua field.
    
**Publish/Unpublish:**
- Set \`published: true\` untuk publish
- Set \`published: false\` untuk unpublish
- Bisa combine dengan update field lain sekaligus`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID paket yang akan di-update',
    type: Number,
    example: 1,
  })
  @ApiBody({
    description: 'Data update paket',
    examples: {
      updateTitle: {
        summary: 'Update title saja',
        value: {
          title: 'Tryout S2 2025 - Paket A (Updated)',
        },
      },
      publish: {
        summary: 'Publish paket',
        value: {
          published: true,
        },
      },
      unpublish: {
        summary: 'Unpublish paket',
        value: {
          published: false,
        },
      },
      updateAll: {
        summary: 'Update semua field sekaligus',
        value: {
          title: 'Tryout S2 2025 - Paket A (Updated)',
          description: 'Deskripsi baru',
          price: 80000,
          published: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Paket berhasil di-update',
  })
  @ApiResponse({
    status: 404,
    description: 'Paket tidak ditemukan atau bukan untuk Pascasarjana',
  })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdatePackageSchema))
    updatePackageDto: UpdatePackageDto,
  ) {
    return this.packageService.updatePascasarjana(id, updatePackageDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Delete paket',
    description: `Menghapus paket beserta semua subtest dan soal yang terkait.
    
**Catatan:** Operasi ini tidak bisa dibatalkan.`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID paket yang akan dihapus',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Paket berhasil dihapus',
  })
  @ApiResponse({
    status: 404,
    description: 'Paket tidak ditemukan atau bukan untuk Pascasarjana',
  })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.removePascasarjana(id);
  }

  @Post(':id/subtest')
  @ApiOperation({
    summary: 'Tambah subtest ke paket',
    description: `Menambahkan subtest (ujian) ke paket yang sudah ada.
    
**Untuk Pascasarjana:**
- Type exam: **TKA** atau **TBI**
- Setelah subtest dibuat, bisa tambah soal menggunakan exam_id

**Flow:**
1. Buat paket → dapat package_id
2. Tambah subtest → dapat exam_id
3. Buat soal untuk subtest tersebut`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID paket',
    type: Number,
    example: 1,
  })
  @ApiBody({
    description: 'Data subtest baru',
    examples: {
      tka: {
        summary: 'Contoh subtest TKA',
        value: {
          title: 'Tes Kemampuan Akademik',
          description: 'Subtest untuk mengukur kemampuan akademik',
          duration: 90,
          type_exam: 'TKA',
        },
      },
      tbi: {
        summary: 'Contoh subtest TBI',
        value: {
          title: 'Tes Bahasa Inggris',
          description: 'Subtest untuk mengukur kemampuan bahasa Inggris',
          duration: 60,
          type_exam: 'TBI',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Subtest berhasil ditambahkan',
    schema: {
      example: {
        id: 1,
        package_id: 1,
        exam_id: 1,
        created_at: '2025-12-02T10:00:00.000Z',
        exam: {
          id: 1,
          title: 'Tes Kemampuan Akademik',
          description: 'Subtest untuk mengukur kemampuan akademik',
          duration: 90,
          total_questions: 0,
          type_exam: 'TKA',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Paket tidak ditemukan atau bukan untuk Pascasarjana',
  })
  createSubtest(
    @Param('id', ParseIntPipe) packageId: number,
    @Body(new ZodValidationPipe(CreateSubtestPascasarjanaSchema))
    createSubtestDto: Omit<CreateSubtestPascasarjanaDto, 'package_id'>,
  ) {
    return this.packageService.createSubtestPascasarjana({
      ...createSubtestDto,
      package_id: packageId,
    });
  }

  @Get(':id/subtest')
  @ApiOperation({
    summary: 'Get daftar subtest dalam paket',
    description: `Mengambil daftar semua subtest yang ada dalam paket.`,
  })
  @ApiParam({
    name: 'id',
    description: 'ID paket',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar subtest berhasil diambil',
    schema: {
      example: [
        {
          id: 1,
          title: 'Tes Kemampuan Akademik',
          description: 'Subtest untuk mengukur kemampuan akademik',
          duration: 90,
          total_questions: 25,
          type_exam: 'TKA',
        },
        {
          id: 2,
          title: 'Tes Bahasa Inggris',
          description: 'Subtest untuk mengukur kemampuan bahasa Inggris',
          duration: 60,
          total_questions: 25,
          type_exam: 'TBI',
        },
      ],
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Paket tidak ditemukan atau bukan untuk Pascasarjana',
  })
  getSubtests(@Param('id', ParseIntPipe) packageId: number) {
    return this.packageService.getSubtestsPascasarjana(packageId);
  }

  @Delete(':packageId/subtest/:examId')
  @ApiOperation({
    summary: 'Delete subtest dari paket',
    description: `Menghapus subtest dari paket beserta semua soal yang terkait.
    
**Catatan:** 
- Semua soal dalam subtest akan ikut terhapus
- total_questions di paket akan otomatis ter-update`,
  })
  @ApiParam({
    name: 'packageId',
    description: 'ID paket',
    type: Number,
    example: 1,
  })
  @ApiParam({
    name: 'examId',
    description: 'ID subtest yang akan dihapus',
    type: Number,
    example: 1,
  })
  @ApiResponse({
    status: 200,
    description: 'Subtest berhasil dihapus',
    schema: {
      example: {
        message: 'Subtest deleted successfully',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Paket atau subtest tidak ditemukan',
  })
  deleteSubtest(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.packageService.deleteSubtestPascasarjana(packageId, examId);
  }
}


