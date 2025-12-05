import { CreateAdminSchema } from "./create-admin.dto";
import { createZodDto } from "@anatine/zod-nestjs";

export const UpdateAdminSchema = CreateAdminSchema.partial();

export class UpdateAdminDto extends createZodDto(UpdateAdminSchema) {}
