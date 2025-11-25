import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class RoleService {
  constructor(private prismaService: PrismaService) {}
  async create(createRoleDto: CreateRoleDto) {
    return this.prismaService.role.create({
      data: createRoleDto,
    });
  }

  async findAll() {
    const role = await this.prismaService.role.findMany();
    if (role.length === 0) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async findOne(id: number) {
    const role = await this.prismaService.role.findUnique({
      where: {
        id,
      }
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const existingRole = await this.prismaService.role.findUnique({
      where: {
        id,
      }
    });
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }
    return this.prismaService.role.update({
      where: {
        id,
      },
      data: updateRoleDto,
    });
  }

  async remove(id: number) {
    const existingRole = this.prismaService.role.findUnique({
      where: {
        id,
      }
    });
    if (!existingRole) {
      throw new NotFoundException('Role not found');
    }
    return this.prismaService.role.delete({
      where: {
        id,
      },
    });
  }
}
