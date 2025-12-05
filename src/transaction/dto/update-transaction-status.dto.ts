import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const UpdateTransactionStatusSchema = z.object({
  status: z.enum(["unpaid", "paid"]),
});

export class UpdateTransactionStatusDto extends createZodDto(
  UpdateTransactionStatusSchema,
) {}
