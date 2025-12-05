import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { UserService } from "./user.service";
import { CreateUserDto, CreateUserSchema } from "./dto/create-user.dto";
import { UpdateUserDto, UpdateUserSchema } from "./dto/update-user.dto";
import { ZodValidationPipe } from "src/common/pipes/zod-validation.pipe";
import { ApiBody, ApiNotFoundResponse, ApiOkResponse } from "@nestjs/swagger";
import { ResponseUserDto } from "./dto/response-user.dto";

@Controller("user")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiOkResponse({
    description: "List of users",
    type: ResponseUserDto,
    isArray: true,
  })
  findAll() {
    return this.userService.findAll();
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
  ) {
    return this.userService.update(id, updateUserDto);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "User deleted successfully" })
  remove(@Param("id") id: string) {
    return this.userService.remove(id);
  }
}
