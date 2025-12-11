import { createZodDto } from "@anatine/zod-nestjs";
import z from "zod";

export const StartPackageSchema = z.object({
  package_id: z.number().int(),
});

export class StartPackageDto extends createZodDto(StartPackageSchema) {}
