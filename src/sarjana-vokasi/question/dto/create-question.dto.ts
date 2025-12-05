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

// DTO untuk create question
export const CreateQuestionSchema = z.object({
  exam_id: z.number().int().positive(),
  question_text: z.string().min(1), // Teks Soal (mandatory)
  question_image_url: z.string().optional(), // Gambar Soal (opsional)
  question_audio_url: z.string().optional(), // Audio Soal (opsional)
  discussion: z.string().min(1), // Pembahasan (mandatory)
  video_discussion: z.string().optional(), // Video Pembahasan (opsional)
  difficulty: z.string().optional(),
  choices: z
    .array(CreateQuestionChoiceSchema)
    .length(4, "Must have exactly 4 choices (A, B, C, D)")
    .refine(
      (choices) => choices.filter((c) => c.is_correct).length === 1,
      "Must have exactly one correct answer",
    ),
});

export class CreateQuestionDto extends createZodDto(CreateQuestionSchema) {}
