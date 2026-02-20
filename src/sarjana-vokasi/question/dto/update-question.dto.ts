import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";
import { CreateQuestionChoiceSchema } from "./create-question.dto";

export const UpdateQuestionSchema = z.object({
  question_text: z.string().min(1).optional(),
  question_image_url: z.string().optional(),
  question_audio_url: z.string().optional(),
  discussion: z.string().min(1).optional(),
  video_discussion: z.string().optional(),
  difficulty: z.string().optional(),
  choices: z
    .array(CreateQuestionChoiceSchema)
    .min(4, "Must have 4 or 5 choices")
    .max(5, "Must have 4 or 5 choices")
    .refine(
      (choices) => choices.filter((c) => c.is_correct).length === 1,
      "Must have exactly one correct answer",
    )
    .optional(),
});

export class UpdateQuestionDto extends createZodDto(UpdateQuestionSchema) { }
