import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

// DTO untuk pilihan jawaban
export const CreateQuestionChoiceSchema = z.object({
  choice_text: z.string().min(1),
  choice_image_url: z.string().optional(),
  choice_audio_url: z.string().optional(),
  is_correct: z.boolean().default(false),
});

export class CreateQuestionChoiceDto extends createZodDto(
  CreateQuestionChoiceSchema,
) {}

// DTO untuk create question (TANPA choices - choices dibuat terpisah)
export const CreateQuestionSchema = z.object({
  exam_id: z.number().int().positive(),
  question_text: z.string().min(1), // Teks Soal (mandatory)
  question_image_url: z.string().optional(), // Gambar Soal (opsional)
  question_audio_url: z.string().optional(), // Audio Soal (opsional)
  discussion: z.string().min(1), // Pembahasan (mandatory)
  video_discussion: z.string().optional(), // Video Pembahasan (opsional)
  difficulty: z.string().optional(),
  // choices dihapus - dibuat terpisah via POST /question/:id/choices
});

export class CreateQuestionDto extends createZodDto(CreateQuestionSchema) {}

// DTO untuk create choices (setelah question dibuat)
export const CreateQuestionChoicesSchema = z.object({
  choices: z
    .array(CreateQuestionChoiceSchema)
    .length(5, "Must have exactly 5 choices (A, B, C, D, E)")
    .refine(
      (choices) => choices.filter((c) => c.is_correct).length === 1,
      "Must have exactly one correct answer",
    ),
});

export class CreateQuestionChoicesDto extends createZodDto(
  CreateQuestionChoicesSchema,
) {}
