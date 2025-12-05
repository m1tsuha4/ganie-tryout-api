import { ApiProperty } from "@nestjs/swagger";

export class ResponseAdminDto {
  @ApiProperty({
    example: "a3c8f5d0-1234-4567-89ab-1234567890ab",
    description: "ID admin",
  })
  id: string;

  @ApiProperty({
    example: "admin",
    description: "Username admin",
  })
  username: string;

  @ApiProperty({
    example: "admin@gmail.com",
    description: "Email admin",
  })
  email: string;

  @ApiProperty({
    example: 1,
    description: "Role admin",
  })
  role_id: number;

  @ApiProperty({
    example: "2025-02-05T14:30:00.000Z",
    description: "Tanggal dibuat",
  })
  created_at: Date;

  @ApiProperty({
    example: "2025-02-05T14:35:00.000Z",
    description: "Tanggal terakhir update",
  })
  updated_at: Date;
}
