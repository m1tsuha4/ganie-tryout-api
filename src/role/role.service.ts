import { Injectable, NotFoundException } from "@nestjs/common";
import { CreateRoleDto } from "./dto/create-role.dto";
import { UpdateRoleDto } from "./dto/update-role.dto";
import { PrismaService } from "src/prisma/prisma.service";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { ok } from "src/common/utils/response.util";

@Injectable()
export class RoleService {
  constructor(private prismaService: PrismaService) {}
  async create(createRoleDto: CreateRoleDto) {
    return this.prismaService.role.create({
      data: {
        ...createRoleDto,
      },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    const [data, total] = await Promise.all([
      this.prismaService.role.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          name: true,
          permissions_mask: true,
        },
        take: limit,
        skip: offset,
      }),
      this.prismaService.role.count({
        where: {
          deleted_at: null,
        },
      }),
    ]);
    return ok(data, "Fetched successfully", {
      total,
      limit,
      offset,
      nextPage: total > offset + limit ? offset + limit : null,
    });
  }

  async findOne(id: number) {
    const role = await this.prismaService.role.findUnique({
      where: {
        id,
        deleted_at: null,
      },
    });
    if (!role) {
      throw new NotFoundException("Role not found");
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto) {
    const existingRole = await this.prismaService.role.findUnique({
      where: {
        id,
      },
    });
    if (!existingRole) {
      throw new NotFoundException("Role not found");
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
      },
    });
    if (!existingRole) {
      throw new NotFoundException("Role not found");
    }
    return this.prismaService.role.update({
      where: {
        id,
      },
      data: {
        deleted_at: new Date(),
      },
    });
  }
}
