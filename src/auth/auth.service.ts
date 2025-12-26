import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "src/prisma/prisma.service";
import { LoginDto } from "./dto/login.dto";
import * as bcrypt from "bcryptjs";
import { JwtService } from "@nestjs/jwt";
import { randomUUID } from "node:crypto";
import { redis } from "src/common/utils/redis.util";

@Injectable()
export class AuthService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}
  async loginUser(loginDto: LoginDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });
    if (!existingUser) {
      throw new ConflictException("Invalid Credentials");
    }
    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      existingUser.password_hash,
    );
    if (!isPasswordMatch) {
      throw new ConflictException("Invalid Credentials");
    }
    const token = randomUUID();

    await redis.set(
      `login_token:${token}`,
      JSON.stringify({
        id: existingUser.id,
        email: existingUser.email,
        username: existingUser.username,
        type: "user",
      }),
      "EX",
      3600,
    );

    return {
      id: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
      token,
      expiresAt: 3600,
    };
  }

  async verifyLoginToken(token: string) {
    const key = `login_token:${token}`;

    const cached = await redis.get(key);
    if (!cached) {
      throw new BadRequestException("Invalid or expired login token");
    }

    const user = JSON.parse(cached);

    await redis.del(key);

    const accessToken = this.jwtService.sign({
      id: user.id,
      email: user.email,
      username: user.username,
      type: user.type,
    });

    const decoded = this.jwtService.decode(accessToken);

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      token: accessToken,
      expiresAt: decoded ? decoded["exp"].toString() : null,
    };
  }

  async loginAdmin(loginDto: LoginDto) {
    const existingAdmin = await this.prismaService.admin.findUnique({
      where: {
        email: loginDto.email,
      },
    });
    if (!existingAdmin) {
      throw new ConflictException("Invalid Credentials");
    }
    const isPasswordMatch = await bcrypt.compare(
      loginDto.password,
      existingAdmin.password_hash,
    );
    if (!isPasswordMatch) {
      throw new ConflictException("Invalid Credentials");
    }
    const token = this.jwtService.sign({
      id: existingAdmin.id,
      email: existingAdmin.email,
      username: existingAdmin.username,
      type: "admin", // Tandai sebagai admin
    });

    const decoded = this.jwtService.decode(token);

    return {
      id: existingAdmin.id,
      email: existingAdmin.email,
      username: existingAdmin.username,
      token,
      expiresAt: decoded ? decoded["exp"].toString() : null,
    };
  }
  async logout(user: any) {
    return {
      message: "Logged out successfully",
    };
  }
}
