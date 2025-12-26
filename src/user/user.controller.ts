import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { UpdateUserDto, UpdateUserSchema } from "./dto/update-user.dto";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import { ResponseUserDto } from "./dto/response-user.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-guard.auth";
import {
  PaginationDto,
  PaginationSchema,
} from "src/common/dtos/pagination.dto";

@ApiBearerAuth()
@Controller("user")
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOkResponse({
    description: "List of users",
    type: ResponseUserDto,
    isArray: true,
  })
  findAll(
    @Query(new ZodValidationPipe(PaginationSchema))
    paginationDto: PaginationDto,
  ) {
    return this.userService.findAll(paginationDto);
  }

  @Get(":id")
  @ApiOkResponse({
    description: "User detail",
    type: ResponseUserDto,
  })
  @ApiNotFoundResponse({ description: "User not found" })
  findOne(@Param("id") id: string) {
    return this.userService.findOne(id);
  }

  @Patch(":id")
  @ApiBody({
    description: "Update user",
    schema: {
      example: {
        username: "user001",
        name: "User 001",
        email: "user001@example.com",
      },
    },
  })
  @ApiOkResponse({
    description: "User updated successfully",
    type: ResponseUserDto,
  })
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateUserSchema)) updateUserDto: UpdateUserDto,
    @Req() req,
  ) {
    return this.userService.update(id, updateUserDto, req.user.id);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "User deleted successfully" })
  remove(@Param("id") id: string, @Req() req) {
    return this.userService.remove(id, req.user.id);
  }
}
