import { ApiProperty } from "@nestjs/swagger";

export class ResponseSubtestDto {
  @ApiProperty({
    example: 1,
    description: "ID subtest",
  })
  id: number;

  @ApiProperty({
    example: "TKA-Matematika",
    description: "Nama subtest",
  })
  title: string;

  @ApiProperty({
    example: "Subtest untuk mengukur kemampuan matematika",
    description: "Deskripsi subtest",
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: 60,
    description: "Durasi subtest dalam menit",
  })
  duration: number;

  @ApiProperty({
    example: 30,
    description: "Total jumlah soal",
  })
  total_questions: number;

  @ApiProperty({
    example: "TKA",
    description: "Jenis subtest (TKA, TKD, atau TBI)",
    enum: ["TKA", "TKD", "TBI"],
  })
  type_exam: "TKA" | "TKD" | "TBI";
}
