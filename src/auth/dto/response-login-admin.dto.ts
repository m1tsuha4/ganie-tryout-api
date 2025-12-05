import { ApiProperty } from "@nestjs/swagger";

export class ResponseLoginAdminDto {
  @ApiProperty({
    example: "a3c8f5d0-1234-4567-89ab-1234567890ab",
    description: "ID admin",
  })
  id: string;

  @ApiProperty({
    example: "admin001@example.com",
    description: "Email admin",
  })
  email: string;

  @ApiProperty({
    example: "admin001",
    description: "Username admin",
  })
  username: string;

  @ApiProperty({
    example:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
    description: "Access token",
  })
  token: string;
}
