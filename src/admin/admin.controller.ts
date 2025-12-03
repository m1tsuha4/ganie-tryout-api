import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateAdminDto, CreateAdminSchema } from './dto/create-admin.dto';
import { UpdateAdminDto, UpdateAdminSchema } from './dto/update-admin.dto';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { ResponseAdminDto } from './dto/response-admin.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post()
  @ApiBody({
    description: 'Create new admin',
    schema: {
      example: {
        username: 'admin001',
        email: 'admin001@example.com',
        password: 'StrongPassword123!',
        role_id: 1,
      },
    },
  })
  @ApiCreatedResponse({
    description: 'Admin created successfully',
    type: ResponseAdminDto,
  })
  create(
    @Body(new ZodValidationPipe(CreateAdminSchema))
    createAdminDto: CreateAdminDto,
  ) {
    return this.adminService.create(createAdminDto);
  }

  @Get()
  @ApiOkResponse({
    description: 'List of admins',
    type: ResponseAdminDto,
    isArray: true,
  })
  findAll() {
    return this.adminService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({
    description: 'Admin detail',
    type: ResponseAdminDto,
  })
  @ApiNotFoundResponse({ description: 'Admin not found' })
  findOne(@Param('id') id: string) {
    return this.adminService.findOne(id);
  }

  @Patch(':id')
  @ApiBody({
    description: 'Update admin',
    schema: {
      example: {
        username: 'admin001',
        email: 'admin001@example.com',
        password: 'StrongPassword123!',
        role_id: 1,
      },
    },
  })
  @ApiOkResponse({
    description: 'Admin updated successfully',
    type: ResponseAdminDto,
  })
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateAdminSchema))
    updateAdminDto: UpdateAdminDto,
  ) {
    return this.adminService.update(id, updateAdminDto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Admin deleted successfully' })
  remove(@Param('id') id: string) {
    return this.adminService.remove(id);
  }
}
