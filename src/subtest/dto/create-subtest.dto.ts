import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const CreateSubtestSchema = z.object({
  title: z.string().min(3, "Nama subtest minimal 3 karakter").max(255),
  description: z.string().optional(),
  duration: z.number().int().positive("Durasi harus positif"),
  type_exam: z.enum(["TKA", "TKD", "TBI"], {
    errorMap: () => ({ message: "Jenis subtest harus TKA, TKD, atau TBI" }),
  }),
});

export class CreateSubtestDto extends createZodDto(CreateSubtestSchema) {}

