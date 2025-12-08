import { Module } from '@nestjs/common';
import { ExamService } from './exam.service';
import { ExamController } from './exam.controller';
import { PrismaModule } from '../../src/prisma/prisma.module';
import { ExamRepository } from './exam.repository';

@Module({
  controllers: [ExamController],
  providers: [ExamService, ExamRepository],
  imports: [PrismaModule],
})
export class ExamModule {}
