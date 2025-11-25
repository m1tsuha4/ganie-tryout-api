import { createZodDto } from "@anatine/zod-nestjs";
import { z } from "zod";

export const CreateAdminSchema = z.object({
    username: z.string().min(3).max(255),
    email: z.string().email(),
    password_hash: z.string().min(8).max(255),
    role_id: z.number(),
});

export class CreateAdminDto extends createZodDto(CreateAdminSchema) {}
