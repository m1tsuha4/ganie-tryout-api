import { Module } from "@nestjs/common";
import { PackageService } from "./package.service";
import { PackageController } from "./package.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { CloudinaryModule } from "src/common/services/cloudinary.module";

@Module({
  controllers: [PackageController],
  providers: [PackageService],
  imports: [PrismaModule, CloudinaryModule],
  exports: [PackageService],
})
export class PackageModule {}
