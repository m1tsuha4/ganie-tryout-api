import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const CreateTransactionSchema = z.object({
  package_id: z.number().int().positive(),
  payment_method: z.string().min(1).max(100),
  amount: z.number().positive().optional(),
  payment_proof_url: z.string().url().optional(),
});

export class CreateTransactionDto extends createZodDto(
  CreateTransactionSchema,
) {}
