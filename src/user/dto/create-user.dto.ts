import { createZodDto } from '@anatine/zod-nestjs';
import z from 'zod';

export const CreateUserSchema = z.object({
  username: z.string().min(3).max(255),
  name: z.string().min(3).max(255),
  email: z.string().email(),
  password_hash: z.string().min(8).max(255),
});

export class CreateUserDto extends createZodDto(CreateUserSchema) {}
