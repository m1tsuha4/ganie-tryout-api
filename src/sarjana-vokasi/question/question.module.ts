import { Module } from '@nestjs/common';
import { QuestionService } from './question.service';
import { QuestionController } from './question.controller';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [QuestionController],
  providers: [QuestionService],
  imports: [PrismaModule],
  exports: [QuestionService],
})
export class QuestionModule {}

