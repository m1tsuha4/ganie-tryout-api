import { ApiProperty } from "@nestjs/swagger";

export class ResponseUserDto {
    @ApiProperty({
        example: "a3c8f5d0-1234-4567-89ab-1234567890ab",
        description: "ID user"
    })
    id: string;

    @ApiProperty({
        example: "user001",
        description: "Username user"
    })
    username: string;

    @ApiProperty({
        example: "user001@example.com",
        description: "Email user"
    })
    email: string;

    @ApiProperty({
        example: "User",
        description: "Name user"
    })
    name: string;

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