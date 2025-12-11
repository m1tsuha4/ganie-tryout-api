import { ApiProperty } from "@nestjs/swagger";

class UserInfoDto {
  @ApiProperty({
    example: "a3c8f5d0-1234-4567-89ab-1234567890ab",
    description: "ID user",
  })
  id: string;

  @ApiProperty({
    example: "johndoe",
    description: "Username user",
  })
  username: string;

  @ApiProperty({
    example: "John Doe",
    description: "Nama user",
  })
  name: string;

  @ApiProperty({
    example: "john@example.com",
    description: "Email user",
  })
  email: string;
}

class PackageInfoDto {
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
    example: "SARJANA",
    description: "Tipe paket",
    enum: ["SARJANA", "PASCASARJANA"],
  })
  type: "SARJANA" | "PASCASARJANA";
}

export class ResponseTransactionDto {
  @ApiProperty({
    example: 1,
    description: "ID transaksi",
  })
  id: number;

  @ApiProperty({
    example: "a3c8f5d0-1234-4567-89ab-1234567890ab",
    description: "ID user",
  })
  user_id: string;

  @ApiProperty({
    example: 1,
    description: "ID paket",
  })
  package_id: number;

  @ApiProperty({
    example: 50000,
    description: "Jumlah pembayaran",
  })
  amount: number;

  @ApiProperty({
    example: "Transfer Bank BCA",
    description: "Metode pembayaran",
  })
  payment_method: string;

  @ApiProperty({
    example: "unpaid",
    description: "Status transaksi",
    enum: ["unpaid", "paid"],
  })
  status: "unpaid" | "paid";

  @ApiProperty({
    example: "2025-01-01T00:00:00.000Z",
    description: "Tanggal transaksi",
  })
  transaction_date: Date;

  @ApiProperty({
    type: UserInfoDto,
    description: "Informasi user",
    required: false,
  })
  user?: UserInfoDto;

  @ApiProperty({
    type: PackageInfoDto,
    description: "Informasi paket",
    required: false,
  })
  package?: PackageInfoDto;
}
