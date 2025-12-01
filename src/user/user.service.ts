import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

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
      throw new BadRequestException('Email already exists');
    }
    const existingUsernameUser = await this.prismaService.user.findUnique({
      where: {
        username: createUserDto.username,
      },
    });
    if (existingUsernameUser) {
      throw new BadRequestException('Username already exists');
    }
    const hashPassword = await bcrypt.hash(createUserDto.password, 10);
    return this.prismaService.user.create({
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
  }

  async findAll() {
    const existingUser = await this.prismaService.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });
    if (existingUser.length === 0) {
      throw new NotFoundException('User Not Found');
    }
    return existingUser;
  }

  async findOne(id: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
      },
    });
    if (!existingUser) {
      throw new NotFoundException('User Not Found');
    }
    return existingUser;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!existingUser) {
      throw new NotFoundException('User Not Found');
    }
    const emailUser = await this.prismaService.user.findUnique({
      where: {
        email: updateUserDto.email,
      },
    });
    if (emailUser && emailUser.id !== id) {
      throw new BadRequestException('Email already exists');
    }
    const usernameUser = await this.prismaService.user.findUnique({
      where: {
        username: updateUserDto.username,
      },
    });
    if (usernameUser && usernameUser.id !== id) {
      throw new BadRequestException('Username already exists');
    }
    const updateData = {
      email: updateUserDto.email,
      name: updateUserDto.name,
      username: updateUserDto.username,
      ...(updateUserDto.password && {
        password_hash: await bcrypt.hash(updateUserDto.password, 10),
      }),
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

  async remove(id: string) {
    const existingUser = await this.prismaService.user.findUnique({
      where: {
        id,
      },
    });
    if (!existingUser) {
      throw new NotFoundException('User Not Found');
    }
    return this.prismaService.user.delete({
      where: {
        id,
      },
    });
  }
}
