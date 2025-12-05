import { CreateRoleSchema } from "./create-role.dto";
import { createZodDto } from "@anatine/zod-nestjs";

export const UpdateRoleSchema = CreateRoleSchema.partial();

export class UpdateRoleDto extends createZodDto(UpdateRoleSchema) {}
