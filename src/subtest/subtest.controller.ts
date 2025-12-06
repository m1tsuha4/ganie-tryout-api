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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from "@nestjs/swagger";
import { SubtestService } from "./subtest.service";
import {
  CreateSubtestDto,
  CreateSubtestSchema,
} from "./dto/create-subtest.dto";
import {
  UpdateSubtestDto,
  UpdateSubtestSchema,
} from "./dto/update-subtest.dto";
import { FilterSubtestDto, FilterSubtestSchema } from "./dto/filter-subtest.dto";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { ResponseSubtestDto } from "./dto/response-subtest.dto";

@ApiTags("Subtest")
@Controller("subtest")
export class SubtestController {
  constructor(private readonly subtestService: SubtestService) {}

  @Post()
  @ApiOperation({
    summary: "Tambah subtest baru",
    description: `Membuat subtest baru secara independen (tidak perlu paket).
    
**Jenis Subtest:**
- **TKA**: Tes Kemampuan Akademik
- **TKD**: Tes Kemampuan Dasar
- **TBI**: Tes Bahasa Inggris

Subtest yang dibuat bisa digunakan untuk berbagai paket.`,
  })
  @ApiBody({
    description: "Data subtest baru",
    examples: {
      tka: {
        summary: "Contoh subtest TKA",
        value: {
          title: "TKA-Matematika",
          description: "Subtest untuk mengukur kemampuan matematika",
          duration: 60,
          type_exam: "TKA",
        },
      },
      tkd: {
        summary: "Contoh subtest TKD",
        value: {
          title: "TKD-Logika",
          description: "Subtest untuk mengukur kemampuan logika",
          duration: 30,
          type_exam: "TKD",
        },
      },
      tbi: {
        summary: "Contoh subtest TBI",
        value: {
          title: "TBI-Structure",
          description: "Subtest untuk mengukur kemampuan structure",
          duration: 45,
          type_exam: "TBI",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Subtest berhasil dibuat",
    type: ResponseSubtestDto,
  })
  create(
    @Body(new ZodValidationPipe(CreateSubtestSchema))
    createSubtestDto: CreateSubtestDto,
  ) {
    return this.subtestService.create(createSubtestDto);
  }

  @Get()
  @ApiOperation({
    summary: "Daftar semua subtest",
    description: `Mengambil daftar semua subtest yang tersedia.

**Filter yang tersedia:**
- \`type_exam\`: Filter berdasarkan jenis subtest (TKA/TKD/TBI)
- \`duration_min\`: Durasi minimal (menit)
- \`duration_max\`: Durasi maksimal (menit)
- \`search\`: Pencarian berdasarkan nama subtest

**Contoh penggunaan:**
- \`/subtest?type_exam=TKA\` - Hanya subtest TKA
- \`/subtest?duration_min=30&duration_max=60\` - Durasi 30-60 menit
- \`/subtest?search=Matematika\` - Cari subtest dengan nama mengandung "Matematika"`,
  })
  @ApiQuery({
    name: "type_exam",
    required: false,
    description: "Filter berdasarkan jenis subtest",
    enum: ["TKA", "TKD", "TBI"],
    example: "TKA",
  })
  @ApiQuery({
    name: "duration_min",
    required: false,
    description: "Durasi minimal (menit)",
    type: Number,
    example: 30,
  })
  @ApiQuery({
    name: "duration_max",
    required: false,
    description: "Durasi maksimal (menit)",
    type: Number,
    example: 60,
  })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Pencarian berdasarkan nama subtest",
    type: String,
    example: "Matematika",
  })
  @ApiOkResponse({
    description: "Daftar subtest berhasil diambil",
    type: ResponseSubtestDto,
    isArray: true,
  })
  findAll(@Query(new ZodValidationPipe(FilterSubtestSchema)) filter?: FilterSubtestDto) {
    return this.subtestService.findAll(filter);
  }

  @Get(":id")
  @ApiOperation({
    summary: "Detail subtest",
    description: `Mengambil detail subtest berdasarkan ID.`,
  })
  @ApiParam({
    name: "id",
    description: "ID subtest",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Detail subtest berhasil diambil",
    type: ResponseSubtestDto,
  })
  @ApiNotFoundResponse({
    description: "Subtest tidak ditemukan",
  })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.subtestService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({
    summary: "Edit subtest",
    description: `Update informasi subtest. Bisa update sebagian atau semua field.`,
  })
  @ApiParam({
    name: "id",
    description: "ID subtest yang akan di-update",
    type: Number,
    example: 1,
  })
  @ApiBody({
    description: "Data update subtest",
    examples: {
      updateTitle: {
        summary: "Update title saja",
        value: {
          title: "TKA-Matematika (Updated)",
        },
      },
      updateAll: {
        summary: "Update semua field",
        value: {
          title: "TKA-Matematika (Updated)",
          description: "Deskripsi baru",
          duration: 90,
          type_exam: "TKA",
        },
      },
    },
  })
  @ApiOkResponse({
    description: "Subtest berhasil di-update",
    type: ResponseSubtestDto,
  })
  @ApiNotFoundResponse({
    description: "Subtest tidak ditemukan",
  })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateSubtestSchema))
    updateSubtestDto: UpdateSubtestDto,
  ) {
    return this.subtestService.update(id, updateSubtestDto);
  }

  @Delete(":id")
  @ApiOperation({
    summary: "Hapus subtest",
    description: `Menghapus subtest secara soft delete (tidak benar-benar dihapus dari database).

**Catatan:**
- Subtest yang sudah digunakan di paket masih bisa dihapus
- Soal yang ada dalam subtest tidak akan terhapus
- Subtest yang dihapus tidak akan muncul di daftar subtest tersedia`,
  })
  @ApiParam({
    name: "id",
    description: "ID subtest yang akan dihapus",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Subtest berhasil dihapus",
  })
  @ApiNotFoundResponse({
    description: "Subtest tidak ditemukan",
  })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.subtestService.remove(id);
  }
}

