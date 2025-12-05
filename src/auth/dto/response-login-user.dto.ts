import { ApiProperty } from "@nestjs/swagger";

export class ResponseLoginUserDto {
  @ApiProperty({
    example: "a3c8f5d0-1234-4567-89ab-1234567890ab",
    description: "ID user",
  })
  id: string;

  @ApiProperty({
    example: "user001@example.com",
    description: "Email",
  })
  email: string;

  @ApiProperty({
    example: "user001",
    description: "Username user",
  })
  username: string;

  @ApiProperty({
    example:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    description: "Access token",
  })
  token: string;
}
