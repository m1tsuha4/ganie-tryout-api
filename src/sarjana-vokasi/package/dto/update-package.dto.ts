import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const UpdatePackageSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  thumbnail_url: z.string().optional(),
  published: z.boolean().optional(),
  voucher_code: z.string().nullable().optional(),
  expired_date: z.preprocess(
    (val) =>
      typeof val === "string" && val
        ? new Date(val)
        : val === null || val === ""
          ? null
          : val,
    z.date().nullable().optional(),
  ),
});

export class UpdatePackageDto extends createZodDto(UpdatePackageSchema) {}
