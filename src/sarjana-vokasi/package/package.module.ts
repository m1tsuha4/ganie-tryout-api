import { Module } from "@nestjs/common";
import { PackageService } from "./package.service";
import { PackageController } from "./package.controller";
import { PackagePascasarjanaController } from "./package-pascasarjana.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  controllers: [PackageController, PackagePascasarjanaController],
  providers: [PackageService],
  imports: [PrismaModule],
  exports: [PackageService],
})
export class PackageModule {}
