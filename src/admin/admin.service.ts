import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAdminDto } from './dto/create-admin.dto';
import { UpdateAdminDto } from './dto/update-admin.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AdminService {
  constructor(private prismaService: PrismaService) {}
  async create(createAdminDto: CreateAdminDto) {
    const exsitingAdmin = await this.prismaService.admin.findUnique({
      where: {
        email: createAdminDto.email,
      },
    });
    if (exsitingAdmin) {
      throw new BadRequestException('Admin already exists');
    }
    const hashPassword = await bcrypt.hash(createAdminDto.password, 10);
    return this.prismaService.admin.create({
      data: {
        username: createAdminDto.username,
        email: createAdminDto.email,
        role_id: createAdminDto.role_id,
        password_hash: hashPassword,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
      },
    });
  }

  async findAll() {
    const existingAdmin = await this.prismaService.admin.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
      },
    });
    if (existingAdmin.length === 0) {
      throw new NotFoundException('Admin not found');
    }
    return existingAdmin;
  }

  async findOne(id: string) {
    const existingAdmin = await this.prismaService.admin.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
      },
    });
    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }
    return existingAdmin;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto) {
    const existingAdmin = await this.prismaService.admin.findUnique({
      where: {
        id,
      },
    });
    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }
    const emailAdmin = await this.prismaService.admin.findUnique({
      where: {
        email: updateAdminDto.email,
      },
    });
    if (emailAdmin && emailAdmin.id !== id) {
      throw new BadRequestException('Email Admin already exists');
    }
    const updateData = {
      email: updateAdminDto.email,
      username: updateAdminDto.username,
      role_id: updateAdminDto.role_id,
      ...(updateAdminDto.password && {
        password_hash: await bcrypt.hash(updateAdminDto.password, 10),
      }),
    };
    return this.prismaService.admin.update({
      where: {
        id,
      },
      data: updateData,
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
      },
    });
  }

  async remove(id: string) {
    const existingAdmin = await this.prismaService.admin.findUnique({
      where: {
        id,
      },
    });
    if (!existingAdmin) {
      throw new NotFoundException('Admin not found');
    }
    return this.prismaService.admin.delete({
      where: {
        id,
      },
    });
  }
}
