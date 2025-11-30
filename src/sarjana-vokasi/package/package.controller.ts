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
} from '@nestjs/common';
import { PackageService } from './package.service';
import { CreatePackageDto, CreatePackageSchema } from './dto/create-package.dto';
import { UpdatePackageDto, UpdatePackageSchema } from './dto/update-package.dto';
import {
  CreateSubtestDto,
  CreateSubtestSchema,
  CreateSubtestSarjanaSchema,
} from './dto/create-subtest.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('package/sarjana')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  // Create package baru untuk Sarjana & Vokasi
  @Post()
  create(
    @Body(new ZodValidationPipe(CreatePackageSchema))
    createPackageDto: CreatePackageDto,
  ) {
    return this.packageService.create(createPackageDto);
  }

  // Get all packages untuk Sarjana & Vokasi
  // Query: ?published=true/false untuk filter by status
  @Get()
  findAll(@Query('published') published?: string) {
    if (published !== undefined) {
      const isPublished = published === 'true';
      return this.packageService.findByStatus(isPublished);
    }
    return this.packageService.findAllSarjana();
  }

  // Get ringkasan paket (summary) untuk dashboard - HARUS SEBELUM :id
  @Get(':id/summary')
  getSummary(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.getPackageSummary(id);
  }

  // Get package by ID untuk Sarjana & Vokasi
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.findOne(id);
  }

  // Update package untuk Sarjana & Vokasi
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdatePackageSchema))
    updatePackageDto: UpdatePackageDto,
  ) {
    return this.packageService.update(id, updatePackageDto);
  }

  // Publish package untuk Sarjana & Vokasi
  @Patch(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.publish(id);
  }

  // Unpublish package untuk Sarjana & Vokasi
  @Patch(':id/unpublish')
  unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.unpublish(id);
  }

  // Delete package (optional)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.remove(id);
  }

  // Tambah subtest ke package (TKA atau TKD)
  @Post(':id/subtest')
  createSubtest(
    @Param('id', ParseIntPipe) packageId: number,
    @Body(new ZodValidationPipe(CreateSubtestSarjanaSchema))
    createSubtestDto: Omit<CreateSubtestDto, 'package_id'>,
  ) {
    return this.packageService.createSubtest({
      ...createSubtestDto,
      package_id: packageId,
    });
  }

  // Get list subtest untuk package
  @Get(':id/subtest')
  getSubtests(@Param('id', ParseIntPipe) packageId: number) {
    return this.packageService.getSubtests(packageId);
  }

  // Delete subtest dari package
  @Delete(':packageId/subtest/:examId')
  deleteSubtest(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.packageService.deleteSubtest(packageId, examId);
  }
}

