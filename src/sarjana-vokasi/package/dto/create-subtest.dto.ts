import { createZodDto } from '@anatine/zod-nestjs';
import z from 'zod';

// Schema untuk Sarjana & Vokasi (TKA atau TKD)
export const CreateSubtestSarjanaSchema = z.object({
  package_id: z.number().int().positive(),
  title: z.string().min(3).max(255), // Nama subtest
  description: z.string().optional(),
  duration: z.number().int().positive(), // Durasi dalam menit
  type_exam: z.enum(['TKA', 'TKD']), // Tipe test untuk Sarjana & Vokasi
});

// Schema untuk Pascasarjana (TKA atau TBI)
export const CreateSubtestPascasarjanaSchema = z.object({
  package_id: z.number().int().positive(),
  title: z.string().min(3).max(255), // Nama subtest
  description: z.string().optional(),
  duration: z.number().int().positive(), // Durasi dalam menit
  type_exam: z.enum(['TKA', 'TBI']), // Tipe test untuk Pascasarjana
});

export const CreateSubtestSchema = CreateSubtestSarjanaSchema; // Default untuk backward compatibility

export class CreateSubtestDto extends createZodDto(CreateSubtestSchema) {}
export class CreateSubtestSarjanaDto extends createZodDto(CreateSubtestSarjanaSchema) {}
export class CreateSubtestPascasarjanaDto extends createZodDto(CreateSubtestPascasarjanaSchema) {}

