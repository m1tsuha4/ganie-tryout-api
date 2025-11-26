import { CreateUserSchema } from './create-user.dto';
import { createZodDto } from '@anatine/zod-nestjs';

export const UpdateUserSchema = CreateUserSchema.partial();

export class UpdateUserDto extends createZodDto(UpdateUserSchema) {}
