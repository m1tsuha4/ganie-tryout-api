import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";
import { PrismaService } from "src/prisma/prisma.service";
import * as bcrypt from "bcryptjs";
import { PaginationDto } from "src/common/dtos/pagination.dto";
import { ok } from "src/common/utils/response.util";

@Injectable()
export class UserService {
  constructor(private prismaService: PrismaService) {}
  async create(createUserDto: CreateUserDto) {
    const existingEmailUser = await this.prismaService.user.findUnique({
      where: {
        email: createUserDto.email,
      },
    });
    if (existingEmailUser) {
      throw new BadRequestException("Email already exists");
    }
    const existingUsernameUser = await this.prismaService.user.findUnique({
      where: {
        username: createUserDto.username,
      },
    });
    if (existingUsernameUser) {
      throw new BadRequestException("Username already exists");
    }
    const hashPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = await this.prismaService.user.create({
      data: {
        username: createUserDto.username,
        name: createUserDto.name,
        email: createUserDto.email,
        password_hash: hashPassword,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });
    return await this.prismaService.user.update({
      where: {
        id: newUser.id,
      },
      data: {
        created_by: newUser.id,
      },
    });
  }

  async findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;
    const [data, total] = await Promise.all([
      this.prismaService.user.findMany({
        where: {
          deleted_at: null,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          created_at: true,
        },
        take: limit,
        skip: offset,
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prismaService.user.count({
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

  async findOne(id: string, paginationDto?: PaginationDto) {
    let { limit = 10, offset = 0 } = (paginationDto as any) || {};
    limit = Number(limit) || 10;
    offset = Number(offset) || 0;

    const [existingUser, transactions, transactionTotal] = await Promise.all([
      this.prismaService.user.findUnique({
        where: {
          id,
          deleted_at: null,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
        },
      }),
      this.prismaService.transaction.findMany({
        where: {
          user_id: id,
          deleted_at: null,
          package: {
            deleted_at: null,
          },
        },
        select: {
          id: true,
          package_id: true,
          amount: true,
          payment_method: true,
          status: true,
          payment_proof_url: true,
          transaction_date: true,
          created_at: true,
          package: {
            select: {
              id: true,
              title: true,
              description: true,
              price: true,
              type: true,
            },
          },
        },
        take: limit,
        skip: offset,
        orderBy: {
          created_at: "desc",
        },
      }),
      this.prismaService.transaction.count({
        where: {
          user_id: id,
          deleted_at: null,
          package: {
            deleted_at: null,
          },
        },
      }),
    ]);

    if (!existingUser) {
      throw new NotFoundException("User Not Found");
    }

    const meta = {
      total: transactionTotal,
      limit,
      offset,
      nextPage: transactionTotal > offset + limit ? offset + limit : null,
    };

    return {
      user: existingUser,
      transactions,
      meta,
    };
  }

  async update(id: string, updateUserDto: UpdateUserDto, authId: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!existingUser) {
      throw new NotFoundException("User Not Found");
    }
    const emailUser = await this.prismaService.user.findUnique({
      where: {
        email: updateUserDto.email,
      },
    });
    if (emailUser && emailUser.id !== id) {
      throw new BadRequestException("Email already exists");
    }
    const usernameUser = await this.prismaService.user.findUnique({
      where: {
        username: updateUserDto.username,
      },
    });
    if (usernameUser && usernameUser.id !== id) {
      throw new BadRequestException("Username already exists");
    }
    const updateData = {
      email: updateUserDto.email,
      name: updateUserDto.name,
      username: updateUserDto.username,
      ...(updateUserDto.password && {
        password_hash: await bcrypt.hash(updateUserDto.password, 10),
      }),
      updated_by: authId,
    };
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });
  }

  async remove(id: string, authId: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!existingUser) {
      throw new NotFoundException("User Not Found");
    }
    return this.prismaService.user.update({
      where: {
        id,
      },
      data: {
        deleted_by: authId,
        deleted_at: new Date(),
      },
    });
  }
}
