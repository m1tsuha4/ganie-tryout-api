import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const FilterSubtestSchema = z.object({
  type_exam: z.enum(["TKA", "TKD", "TBI"]).optional(),
  duration_min: z.coerce.number().int().positive().optional(),
  duration_max: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
});

export class FilterSubtestDto extends createZodDto(FilterSubtestSchema) {}
