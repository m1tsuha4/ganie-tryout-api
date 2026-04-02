import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
} from "@nestjs/common";
import { RoleService } from "./role.service";
import { CreateRoleDto, CreateRoleSchema } from "./dto/create-role.dto";
import { UpdateRoleDto, UpdateRoleSchema } from "./dto/update-role.dto";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import {
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from "@nestjs/swagger";
import { ResponseRoleDto } from "./dto/response-role.dto";
import {
  PaginationDto,
  PaginationSchema,
} from "src/common/dtos/pagination.dto";

@Controller("role")
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiBody({
    description: "Create role",
    schema: {
      example: {
        name: "admin",
        permissions_mask: 1,
      },
    },
  })
  @ApiCreatedResponse({
    description: "Role created",
    type: ResponseRoleDto,
  })
  create(
    @Body(new ZodValidationPipe(CreateRoleSchema)) createRoleDto: CreateRoleDto,
  ) {
    return this.roleService.create(createRoleDto);
  }

  @Get()
  @ApiOkResponse({
    description: "List of roles",
    type: ResponseRoleDto,
  })
  @ApiNotFoundResponse({
    description: "Roles not found",
  })
  findAll(
    @Query(new ZodValidationPipe(PaginationSchema))
    paginationDto: PaginationDto,
  ) {
    return this.roleService.findAll(paginationDto);
  }

  @Get(":id")
  @ApiOkResponse({
    description: "Role detail",
    type: ResponseRoleDto,
  })
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.roleService.findOne(id);
  }

  @Patch(":id")
  @ApiBody({
    description: "Update role",
    schema: {
      example: {
        name: "admin",
        permissions_mask: 1,
      },
    },
  })
  @ApiOkResponse({
    description: "Role updated",
    type: ResponseRoleDto,
  })
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdateRoleSchema)) updateRoleDto: UpdateRoleDto,
  ) {
    return this.roleService.update(id, updateRoleDto);
  }

  @Delete(":id")
  @ApiOkResponse({
    description: "Role deleted",
  })
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.roleService.remove(id);
  }
}
