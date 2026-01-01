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
import {
  ApiTags,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AdminService } from "./admin.service";
import { CreateAdminDto, CreateAdminSchema } from "./dto/create-admin.dto";
import { UpdateAdminDto, UpdateAdminSchema } from "./dto/update-admin.dto";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { ResponseAdminDto } from "./dto/response-admin.dto";
import { JwtAuthGuard } from "src/auth/guard/jwt-guard.auth";
import { AdminGuard } from "src/auth/guard/admin.guard";
import {
  PaginationDto,
  PaginationSchema,
} from "src/common/dtos/pagination.dto";

@ApiTags("admin")
@Controller("admin")
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiBody({
    description: "Create new admin",
    schema: {
      example: {
        username: "admin001",
        email: "admin001@example.com",
        password: "StrongPassword123!",
        role_id: 1,
      },
    },
  })
  @ApiCreatedResponse({
    description: "Admin created successfully",
    type: ResponseAdminDto,
  })
  create(
    @Body(new ZodValidationPipe(CreateAdminSchema))
    createAdminDto: CreateAdminDto,
  ) {
    return this.adminService.create(createAdminDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get()
  @ApiOkResponse({
    description: "List of admins",
    type: ResponseAdminDto,
    isArray: true,
  })
  findAll(
    @Query(new ZodValidationPipe(PaginationSchema))
    PaginationDto: PaginationDto,
  ) {
    return this.adminService.findAll(PaginationDto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Get(":id")
  @ApiOkResponse({
    description: "Admin detail",
    type: ResponseAdminDto,
  })
  @ApiNotFoundResponse({ description: "Admin not found" })
  findOne(@Param("id") id: string) {
    return this.adminService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Patch(":id")
  @ApiBody({
    description: "Update admin",
    schema: {
      example: {
        username: "admin001",
        email: "admin001@example.com",
        password: "StrongPassword123!",
        role_id: 1,
      },
    },
  })
  @ApiOkResponse({
    description: "Admin updated successfully",
    type: ResponseAdminDto,
  })
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(UpdateAdminSchema))
    updateAdminDto: UpdateAdminDto,
    @Req() req,
  ) {
    return this.adminService.update(id, updateAdminDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @Delete(":id")
  @ApiOkResponse({ description: "Admin deleted successfully" })
  remove(@Param("id") id: string, @Req() req) {
    return this.adminService.remove(id, req.user.id);
  }
}
