import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UploadedFile,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiResponse,
  ApiNotFoundResponse,
  ApiParam,
} from "@nestjs/swagger";
import { QuestionService } from "./question.service";
import {
  CreateQuestionDto,
  CreateQuestionSchema,
} from "./dto/create-question.dto";
import {
  UpdateQuestionDto,
  UpdateQuestionSchema,
} from "./dto/update-question.dto";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { CloudinaryService } from "src/common/services/cloudinary.service";
import { FileInterceptor } from "@nestjs/platform-express";
import { memoryStorage } from "multer";
import { JwtAuthGuard } from "src/auth/guard/jwt-guard.auth";
import { AdminGuard } from "src/auth/guard/admin.guard";

@ApiTags("Question")
@Controller("question")
@ApiBearerAuth()
export class QuestionController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Create question untuk subtest (exam)
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Tambah soal baru untuk subtest (Admin Only)",
    description: `Membuat soal baru untuk subtest tertentu.
    **Hanya admin yang bisa akses endpoint ini.**
    
**Flow:**
1. Buat atau pilih subtest terlebih dahulu (di Manajemen Subtest)
2. Pilih subtest yang akan ditambahkan soal
3. Gunakan endpoint ini untuk menambahkan soal ke subtest tersebut
4. Setiap soal harus memiliki 4 pilihan jawaban (A, B, C, D) dengan tepat 1 jawaban benar
    
**Cara menggunakan:**
1. Login sebagai admin di endpoint /auth/admin untuk mendapatkan token
2. Klik tombol "Authorize" di atas, masukkan token dengan format: Bearer <token>
3. Isi request body dengan data yang valid, termasuk \`exam_id\` (ID subtest)`,
  })
  @ApiBody({
    description: "Data soal baru",
    examples: {
      example1: {
        summary: "Contoh soal dengan pilihan jawaban untuk subtest",
        description: "exam_id adalah ID subtest yang dipilih",
        value: {
          exam_id: 1, // ID subtest (dari Manajemen Subtest)
          question_text: "Berapakah hasil dari 2 + 2?",
          question_image_url: "",
          question_audio_url: "",
          discussion: "Hasil dari 2 + 2 adalah 4",
          video_discussion: "",
          difficulty: "easy",
          choices: [
            {
              choice_text: "3",
              choice_image_url: "",
              choice_audio_url: "",
              is_correct: false,
            },
            {
              choice_text: "4",
              choice_image_url: "",
              choice_audio_url: "",
              is_correct: true,
            },
            {
              choice_text: "5",
              choice_image_url: "",
              choice_audio_url: "",
              is_correct: false,
            },
            {
              choice_text: "6",
              choice_image_url: "",
              choice_audio_url: "",
              is_correct: false,
            },
          ],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Soal berhasil dibuat",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid atau belum login",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  create(
    @Body(new ZodValidationPipe(CreateQuestionSchema))
    createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionService.create(createQuestionDto);
  }

  // Get all questions untuk exam tertentu
  @Get("exam/:examId")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Daftar semua soal untuk subtest (Admin Only)",
    description: `Mengambil daftar semua soal untuk subtest tertentu.
    **Hanya admin yang bisa akses endpoint ini.**`,
  })
  @ApiParam({
    name: "examId",
    description: "ID subtest",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Daftar soal berhasil diambil",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  findByExam(@Param("examId", ParseIntPipe) examId: number) {
    return this.questionService.findByExam(examId);
  }

  // Get question by ID
  @Get(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Detail soal (Admin Only)",
    description: `Mengambil detail soal berdasarkan ID.
    **Hanya admin yang bisa akses endpoint ini.**`,
  })
  @ApiParam({
    name: "id",
    description: "ID soal",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Detail soal berhasil diambil",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  @ApiNotFoundResponse({
    description: "Soal tidak ditemukan",
  })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.questionService.findOne(id);
  }

  // Update question
  @Patch(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Edit soal (Admin Only)",
    description: `Update informasi soal. Bisa update sebagian atau semua field.
    **Hanya admin yang bisa akses endpoint ini.**`,
  })
  @ApiParam({
    name: "id",
    description: "ID soal yang akan di-update",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Soal berhasil di-update",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  @ApiNotFoundResponse({
    description: "Soal tidak ditemukan",
  })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateQuestionSchema))
    updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  // Delete question
  @Delete(":id")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Hapus soal (Admin Only)",
    description: `Menghapus soal secara soft delete (tidak benar-benar dihapus dari database).
    **Hanya admin yang bisa akses endpoint ini.**`,
  })
  @ApiParam({
    name: "id",
    description: "ID soal yang akan dihapus",
    type: Number,
    example: 1,
  })
  @ApiOkResponse({
    description: "Soal berhasil dihapus",
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  @ApiNotFoundResponse({
    description: "Soal tidak ditemukan",
  })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.questionService.remove(id);
  }

  @Post("upload-image")
  @UseGuards(JwtAuthGuard, AdminGuard)
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
    summary: "Upload gambar soal (Admin Only)",
    description: `Upload gambar untuk soal. File akan di-upload ke Cloudinary dan return URL.
    **Hanya admin yang bisa akses endpoint ini.**

**Gunakan URL yang dikembalikan di field \`question_image_url\` saat create/update question.`,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File gambar (max 5MB)",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Gambar berhasil di-upload",
    schema: {
      example: {
        url: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/question-images/abc123.jpg",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  async uploadQuestionImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(
      file,
      "question-images",
    );
    return { url };
  }

  @Post("upload-choice-image")
  @UseGuards(JwtAuthGuard, AdminGuard)
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
    summary: "Upload gambar pilihan jawaban (Admin Only)",
    description: `Upload gambar untuk pilihan jawaban. File akan di-upload ke Cloudinary dan return URL.
    **Hanya admin yang bisa akses endpoint ini.**

**Gunakan URL yang dikembalikan di field \`choice_image_url\` saat create/update question.`,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File gambar (max 5MB)",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Gambar berhasil di-upload",
    schema: {
      example: {
        url: "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/choice-images/abc123.jpg",
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  async uploadChoiceImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(file, "choice-images");
    return { url };
  }
}
