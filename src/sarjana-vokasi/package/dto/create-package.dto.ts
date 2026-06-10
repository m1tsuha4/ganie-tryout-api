import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const CreatePackageSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
  thumbnail_url: z.string().optional(),
  type: z.enum(["SARJANA", "PASCASARJANA"], {
    errorMap: () => ({ message: "Type harus SARJANA atau PASCASARJANA" }),
  }),
  voucher_code: z.string().optional(),
  expired_date: z.preprocess(
    (val) => (typeof val === "string" && val ? new Date(val) : val),
    z.date().optional(),
  ),
});

export class CreatePackageDto extends createZodDto(CreatePackageSchema) {}
