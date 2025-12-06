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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
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

@ApiTags("Question")
@Controller("question")
export class QuestionController {
  constructor(
    private readonly questionService: QuestionService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  // Create question untuk subtest (exam)
  @Post()
  create(
    @Body(new ZodValidationPipe(CreateQuestionSchema))
    createQuestionDto: CreateQuestionDto,
  ) {
    return this.questionService.create(createQuestionDto);
  }

  // Get all questions untuk exam tertentu
  @Get("exam/:examId")
  findByExam(@Param("examId", ParseIntPipe) examId: number) {
    return this.questionService.findByExam(examId);
  }

  // Get question by ID
  @Get(":id")
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.questionService.findOne(id);
  }

  // Update question
  @Patch(":id")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateQuestionSchema))
    updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionService.update(id, updateQuestionDto);
  }

  // Delete question
  @Delete(":id")
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.questionService.remove(id);
  }

  @Post("upload-image")
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
    summary: "Upload gambar soal",
    description: `Upload gambar untuk soal. File akan di-upload ke Cloudinary dan return URL.

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
  async uploadQuestionImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(file, "question-images");
    return { url };
  }

  @Post("upload-choice-image")
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
    summary: "Upload gambar pilihan jawaban",
    description: `Upload gambar untuk pilihan jawaban. File akan di-upload ke Cloudinary dan return URL.

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
  async uploadChoiceImage(@UploadedFile() file: Express.Multer.File) {
    const url = await this.cloudinaryService.uploadImage(file, "choice-images");
    return { url };
  }
}
