import { ApiProperty } from "@nestjs/swagger";

export class ResponseRoleDto {
  @ApiProperty({
    example: "1",
    description: "ID role",
  })
  id: number;

  @ApiProperty({
    example: "admin",
    description: "Nama role",
  })
  name: string;

  @ApiProperty({
    example: "1",
    description: "Mask permission",
  })
  permissions_mask: number;

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
