import { ApiProperty } from "@nestjs/swagger";

export class ResponsePackageDto {
  @ApiProperty({
    example: 1,
    description: "ID paket",
  })
  id: number;

  @ApiProperty({
    example: "Tryout SBMPTN 2025 - Paket A",
    description: "Judul paket",
  })
  title: string;

  @ApiProperty({
    example: "Paket tryout lengkap untuk persiapan SBMPTN 2025",
    description: "Deskripsi paket",
    required: false,
  })
  description?: string;

  @ApiProperty({
    example: 50000,
    description: "Harga paket",
  })
  price: number;

  @ApiProperty({
    example:
      "https://res.cloudinary.com/your-cloud/image/upload/v1234567890/package-thumbnails/abc123.jpg",
    description: "URL thumbnail paket",
    required: false,
  })
  thumbnail_url?: string;

  @ApiProperty({
    example: false,
    description: "Status publish paket",
  })
  published: boolean;

  @ApiProperty({
    example: "SARJANA",
    description: "Tipe paket",
    enum: ["SARJANA", "PASCASARJANA"],
  })
  type: "SARJANA" | "PASCASARJANA";
}
