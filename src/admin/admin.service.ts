import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateAdminDto } from "./dto/create-admin.dto";
import { UpdateAdminDto } from "./dto/update-admin.dto";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { ok } from "src/common/utils/response.util";
import { PaginationDto } from "src/common/dtos/pagination.dto";

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
      throw new BadRequestException("Admin already exists");
    }
    const hashPassword = await bcrypt.hash(createAdminDto.password, 10);
    const newAdmin = await this.prismaService.admin.create({
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
    return await this.prismaService.admin.update({
      where: {
        id: newAdmin.id,
      },
      data: {
        created_by: newAdmin.id,
      },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    const [data, total] = await Promise.all([
      this.prismaService.admin.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          username: true,
          email: true,
          role_id: true,
        },
        take: limit,
        skip: offset,
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prismaService.admin.count({
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

  async findOne(id: string) {
    const existingAdmin = await this.prismaService.admin.findUnique({
      where: {
        id,
        deleted_at: null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        role_id: true,
      },
    });
    if (!existingAdmin) {
      throw new NotFoundException("Admin not found");
    }
    return existingAdmin;
  }

  async update(id: string, updateAdminDto: UpdateAdminDto, authId: string) {
    const existingAdmin = await this.prismaService.admin.findUnique({
      where: {
        id,
        deleted_at: null,
      },
    });
    if (!existingAdmin) {
      throw new NotFoundException("Admin not found");
    }
    const emailAdmin = await this.prismaService.admin.findUnique({
      where: {
        email: updateAdminDto.email,
      },
    });
    if (emailAdmin && emailAdmin.id !== id) {
      throw new BadRequestException("Email Admin already exists");
    }
    const updateData = {
      email: updateAdminDto.email,
      username: updateAdminDto.username,
      role_id: updateAdminDto.role_id,
      updated_by: authId,
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

  async remove(id: string, authId: string) {
    const existingAdmin = await this.prismaService.admin.findUnique({
      where: {
        id,
        deleted_at: null,
      },
    });
    if (!existingAdmin) {
      throw new NotFoundException("Admin not found");
    }
    return this.prismaService.admin.update({
      where: {
        id,
        deleted_at: null,
      },
      data: {
        deleted_by: authId,
        deleted_at: new Date(),
      },
    });
  }
}
