import { createZodDto } from '@anatine/zod-nestjs';
import z from 'zod';

export const CreatePackageSchema = z.object({
  title: z.string().min(3).max(255),
  description: z.string().optional(),
  price: z.number().positive(),
});

export class CreatePackageDto extends createZodDto(CreatePackageSchema) {}

