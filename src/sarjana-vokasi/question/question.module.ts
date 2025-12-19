import { Module } from "@nestjs/common";
import { QuestionService } from "./question.service";
import { QuestionController } from "./question.controller";
import { PrismaModule } from "src/prisma/prisma.module";
import { CloudinaryModule } from "src/common/services/cloudinary.module";
@Module({
  controllers: [QuestionController],
  providers: [QuestionService],
  imports: [PrismaModule, CloudinaryModule],
  exports: [QuestionService],
})
export class QuestionModule {}
