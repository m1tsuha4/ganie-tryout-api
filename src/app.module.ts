import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { WinstonLoggerService } from './common/services/winston-logger.service';
import { PrismaModule } from './prisma/prisma.module';
import { PrismaService } from './prisma/prisma.service';
import { RoleModule } from './role/role.module';
import { AdminModule } from './admin/admin.module';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || 'development'}`, '.env'],
    }),
    PrismaModule,
    RoleModule,
    AdminModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, WinstonLoggerService],
})
export class AppModule {}
