import { z } from 'zod';
import { createZodDto } from '@anatine/zod-nestjs';

export const CreateRoleSchema = z.object({
  name: z.string(),
  permissions_mask: z.number(),
});

export class CreateRoleDto extends createZodDto(CreateRoleSchema) {}
