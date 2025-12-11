import { Module } from "@nestjs/common";
import { SubtestService } from "./subtest.service";
import { SubtestController } from "./subtest.controller";
import { PrismaModule } from "src/prisma/prisma.module";

@Module({
  controllers: [SubtestController],
  providers: [SubtestService],
  imports: [PrismaModule],
  exports: [SubtestService],
})
export class SubtestModule {}
