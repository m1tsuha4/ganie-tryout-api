import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const UpdateSubtestSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  duration: z.number().int().positive().optional(),
  type_exam: z.enum(["TKA", "TKD", "TBI"]).optional(),
});

export class UpdateSubtestDto extends createZodDto(UpdateSubtestSchema) {}
