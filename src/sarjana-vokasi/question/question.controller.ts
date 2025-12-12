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
  Request,
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
  CreateQuestionChoicesDto,
  CreateQuestionChoicesSchema,
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

  // Create question TANPA choices (flow baru: buat soal dulu, baru tambah choices)
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Tambah soal baru (TANPA pilihan jawaban) - Admin Only",
    description: `Membuat soal baru untuk subtest tertentu. **Flow baru untuk keamanan:**
    
**Flow:**
1. Buat atau pilih subtest terlebih dahulu (di Manajemen Subtest)
2. Upload gambar soal (jika ada) via POST /question/upload-image
3. Upload gambar pembahasan (jika ada) - bisa menggunakan URL video
4. Gunakan endpoint ini untuk membuat soal (TANPA choices)
5. Setelah soal dibuat, gunakan POST /question/:id/choices untuk menambahkan 5 pilihan jawaban (A, B, C, D, E)
    
**Keamanan:**
- Soal harus lengkap (dengan image dan pembahasan) sebelum bisa tambah choices
- Validasi bertahap untuk memastikan data lengkap
    
**Cara menggunakan:**
1. Login sebagai admin di endpoint /auth/admin untuk mendapatkan token
2. Klik tombol "Authorize" di atas, masukkan token dengan format: Bearer <token>
3. Isi request body dengan data soal (TANPA choices)
4. Setelah berhasil, gunakan POST /question/:id/choices untuk menambahkan pilihan jawaban`,
  })
  @ApiBody({
    description: "Data soal baru (TANPA choices)",
    examples: {
      example1: {
        summary: "Contoh soal tanpa pilihan jawaban",
        description: "exam_id adalah ID subtest yang dipilih. Choices dibuat terpisah via POST /question/:id/choices",
        value: {
          exam_id: 1, // ID subtest (dari Manajemen Subtest)
          question_text: "Berapakah hasil dari 2 + 2?",
          question_image_url: "https://res.cloudinary.com/.../question-images/abc123.jpg", // URL dari upload-image
          question_audio_url: "",
          discussion: "Hasil dari 2 + 2 adalah 4. Penjumlahan adalah operasi dasar matematika.",
          video_discussion: "https://youtube.com/...", // Opsional: URL video pembahasan
          difficulty: "easy",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Soal berhasil dibuat (belum ada choices). Gunakan POST /question/:id/choices untuk menambahkan pilihan jawaban.",
    schema: {
      example: {
        id: 1,
        exam_id: 1,
        question_text: "Berapakah hasil dari 2 + 2?",
        question_image_url: "https://res.cloudinary.com/...",
        discussion: "Hasil dari 2 + 2 adalah 4",
        question_choices: [],
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: "Unauthorized - Token tidak valid atau belum login",
  })
  @ApiForbiddenResponse({
    description: "Forbidden - Hanya admin yang bisa akses endpoint ini",
  })
  create(
    @Request() req: any,
    @Body(new ZodValidationPipe(CreateQuestionSchema))
    createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionService.create(createQuestionDto, req.user.id);
  }

  // Create choices untuk question yang sudah ada (flow baru)
  @Post(":id/choices")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiOperation({
    summary: "Tambah pilihan jawaban untuk soal (Admin Only)",
    description: `Menambahkan 5 pilihan jawaban (A, B, C, D, E) untuk soal yang sudah dibuat.
    **Hanya bisa digunakan setelah soal dibuat via POST /question**
    
**Flow:**
1. Buat soal dulu via POST /question (dengan image dan pembahasan)
2. Upload gambar pilihan jawaban (jika ada) via POST /question/upload-choice-image
3. Gunakan endpoint ini untuk menambahkan 5 pilihan jawaban
4. Harus ada tepat 1 jawaban yang benar (is_correct: true)
    
**Validasi:**
- Soal harus sudah ada
- Soal belum boleh punya choices (jika sudah ada, gunakan PATCH /question/:id)
- Harus ada tepat 5 choices (A, B, C, D, E)
- Harus ada tepat 1 yang is_correct: true`,
  })
  @ApiParam({
    name: "id",
    description: "ID soal yang akan ditambahkan pilihan jawaban",
    type: Number,
    example: 1,
  })
  @ApiBody({
    description: "Data 5 pilihan jawaban (A, B, C, D, E). Setiap choice bisa punya teks saja, gambar saja, atau teks DAN gambar sekaligus.",
    examples: {
      example1: {
        summary: "Contoh choice dengan teks saja",
        value: {
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
            {
              choice_text: "7",
              choice_image_url: "",
              choice_audio_url: "",
              is_correct: false,
            },
          ],
        },
      },
      example2: {
        summary: "Contoh choice dengan teks DAN gambar sekaligus",
        description: "choice_text WAJIB, choice_image_url OPSIONAL. Bisa punya keduanya sekaligus.",
        value: {
          choices: [
            {
              choice_text: "Jawaban A",
              choice_image_url: "https://res.cloudinary.com/.../choice-images/abc123.jpg", // URL dari upload-choice-image
              choice_audio_url: "",
              is_correct: false,
            },
            {
              choice_text: "Jawaban B (Benar)",
              choice_image_url: "https://res.cloudinary.com/.../choice-images/xyz789.jpg", // Teks + Gambar sekaligus
              choice_audio_url: "",
              is_correct: true,
            },
            {
              choice_text: "Jawaban C",
              choice_image_url: "", // Hanya teks, tanpa gambar
              choice_audio_url: "",
              is_correct: false,
            },
            {
              choice_text: "Jawaban D",
              choice_image_url: "https://res.cloudinary.com/.../choice-images/def456.jpg", // Teks + Gambar sekaligus
              choice_audio_url: "",
              is_correct: false,
            },
            {
              choice_text: "Jawaban E",
              choice_image_url: "https://res.cloudinary.com/.../choice-images/ghi789.jpg", // Teks + Gambar sekaligus
              choice_audio_url: "",
              is_correct: false,
            },
          ],
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Pilihan jawaban berhasil ditambahkan",
  })
  @ApiResponse({
    status: 400,
    description: "Bad Request - Soal sudah punya choices atau validasi gagal",
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
  createChoices(
    @Request() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(CreateQuestionChoicesSchema))
    createChoicesDto: CreateQuestionChoicesDto,
  ) {
    return this.questionService.createChoices(id, createChoicesDto, req.user.id);
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
    @Request() req: any,
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateQuestionSchema))
    updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto, req.user.id);
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
  remove(
    @Request() req: any,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.questionService.remove(id, req.user.id);
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

  @Post("upload-audio")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        // Validasi file audio (mp3, wav, m4a, ogg, aac, dll)
        const allowedMimes = [
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/wave",
          "audio/x-wav",
          "audio/mp4",
          "audio/m4a",
          "audio/ogg",
          "audio/aac",
          "audio/webm",
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new Error(
              "Only audio files are allowed! (mp3, wav, m4a, ogg, aac, webm)",
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB untuk audio
      },
    }),
  )
  @ApiOperation({
    summary: "Upload audio soal (listening) (Admin Only)",
    description: `Upload file audio untuk soal listening. File akan di-upload ke Cloudinary dan return URL.
    **Hanya admin yang bisa akses endpoint ini.**
    
**Format audio yang didukung:**
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- OGG (.ogg)
- AAC (.aac)
- WebM (.webm)

**Maksimal ukuran file: 10MB**

**Gunakan URL yang dikembalikan di field \`question_audio_url\` saat create/update question.`,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File audio (max 10MB, format: mp3, wav, m4a, ogg, aac, webm)",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Audio berhasil di-upload",
    schema: {
      example: {
        url: "https://res.cloudinary.com/your-cloud/video/upload/v1234567890/question-audios/abc123.mp3",
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
  async uploadQuestionAudio(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadAudio(
      file,
      "question-audios",
    );
    return { url };
  }

  @Post("upload-choice-audio")
  @UseGuards(JwtAuthGuard, AdminGuard)
  @UseInterceptors(
    FileInterceptor("file", {
      storage: memoryStorage(),
      fileFilter: (_req, file, cb) => {
        // Validasi file audio (mp3, wav, m4a, ogg, aac, dll)
        const allowedMimes = [
          "audio/mpeg",
          "audio/mp3",
          "audio/wav",
          "audio/wave",
          "audio/x-wav",
          "audio/mp4",
          "audio/m4a",
          "audio/ogg",
          "audio/aac",
          "audio/webm",
        ];
        if (!allowedMimes.includes(file.mimetype)) {
          return cb(
            new Error(
              "Only audio files are allowed! (mp3, wav, m4a, ogg, aac, webm)",
            ),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB untuk audio
      },
    }),
  )
  @ApiOperation({
    summary: "Upload audio pilihan jawaban (Admin Only)",
    description: `Upload file audio untuk pilihan jawaban. File akan di-upload ke Cloudinary dan return URL.
    **Hanya admin yang bisa akses endpoint ini.**
    
**Format audio yang didukung:**
- MP3 (.mp3)
- WAV (.wav)
- M4A (.m4a)
- OGG (.ogg)
- AAC (.aac)
- WebM (.webm)

**Maksimal ukuran file: 10MB**

**Gunakan URL yang dikembalikan di field \`choice_audio_url\` saat create/update question choices.`,
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "File audio (max 10MB, format: mp3, wav, m4a, ogg, aac, webm)",
        },
      },
    },
  })
  @ApiCreatedResponse({
    description: "Audio berhasil di-upload",
    schema: {
      example: {
        url: "https://res.cloudinary.com/your-cloud/video/upload/v1234567890/choice-audios/abc123.mp3",
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
  async uploadChoiceAudio(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadAudio(file, "choice-audios");
    return { url };
  }
}
