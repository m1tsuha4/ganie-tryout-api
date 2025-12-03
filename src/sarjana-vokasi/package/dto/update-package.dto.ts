import { createZodDto } from '@anatine/zod-nestjs';
import z from 'zod';

export const UpdatePackageSchema = z.object({
  title: z.string().min(3).max(255).optional(),
  description: z.string().optional(),
  price: z.number().positive().optional(),
  published: z.boolean().optional(),
});

export class UpdatePackageDto extends createZodDto(UpdatePackageSchema) {}

