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
  CreateSubtestPascasarjanaDto,
  CreateSubtestPascasarjanaSchema,
} from './dto/create-subtest.dto';
import { ZodValidationPipe } from 'src/common/pipes/zod-validation.pipe';

@Controller('package/pascasarjana')
export class PackagePascasarjanaController {
  constructor(private readonly packageService: PackageService) {}

  // Create package baru untuk Pascasarjana
  @Post()
  create(
    @Body(new ZodValidationPipe(CreatePackageSchema))
    createPackageDto: CreatePackageDto,
  ) {
    return this.packageService.create(createPackageDto);
  }

  // Get all packages untuk Pascasarjana
  // Query: ?published=true/false untuk filter by status
  @Get()
  findAll(@Query('published') published?: string) {
    if (published !== undefined) {
      const isPublished = published === 'true';
      return this.packageService.findByStatusPascasarjana(isPublished);
    }
    return this.packageService.findAllPascasarjana();
  }

  // Get ringkasan paket (summary) untuk dashboard - HARUS SEBELUM :id
  @Get(':id/summary')
  getSummary(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.getPackageSummaryPascasarjana(id);
  }

  // Get package by ID untuk Pascasarjana
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.findOnePascasarjana(id);
  }

  // Update package untuk Pascasarjana
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ZodValidationPipe(UpdatePackageSchema))
    updatePackageDto: UpdatePackageDto,
  ) {
    return this.packageService.updatePascasarjana(id, updatePackageDto);
  }

  // Publish package untuk Pascasarjana
  @Patch(':id/publish')
  publish(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.publishPascasarjana(id);
  }

  // Unpublish package untuk Pascasarjana
  @Patch(':id/unpublish')
  unpublish(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.unpublishPascasarjana(id);
  }

  // Delete package
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.packageService.removePascasarjana(id);
  }

  // Tambah subtest ke package (TKA atau TBI)
  @Post(':id/subtest')
  createSubtest(
    @Param('id', ParseIntPipe) packageId: number,
    @Body(new ZodValidationPipe(CreateSubtestPascasarjanaSchema))
    createSubtestDto: Omit<CreateSubtestPascasarjanaDto, 'package_id'>,
  ) {
    return this.packageService.createSubtestPascasarjana({
      ...createSubtestDto,
      package_id: packageId,
    });
  }

  // Get list subtest untuk package
  @Get(':id/subtest')
  getSubtests(@Param('id', ParseIntPipe) packageId: number) {
    return this.packageService.getSubtestsPascasarjana(packageId);
  }

  // Delete subtest dari package
  @Delete(':packageId/subtest/:examId')
  deleteSubtest(
    @Param('packageId', ParseIntPipe) packageId: number,
    @Param('examId', ParseIntPipe) examId: number,
  ) {
    return this.packageService.deleteSubtestPascasarjana(packageId, examId);
  }
}

