import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const SubmitAnswerSchema = z.object({
  question_id: z.number().int(),
  answer: z.number().int(),
});

export class SubmitAnswerDto extends createZodDto(SubmitAnswerSchema) {}
