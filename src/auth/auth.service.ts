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
    const token = this.jwtService.sign({
      id: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
    });
    return {
      id: existingUser.id,
      email: existingUser.email,
      username: existingUser.username,
      token,
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
    });
    return {
      id: existingAdmin.id,
      email: existingAdmin.email,
      username: existingAdmin.username,
      token,
    };
  }
  async logout(user: any) {
    return {
      message: "Logged out successfully",
    };
  }
}
