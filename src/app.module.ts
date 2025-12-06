import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { ConfigModule } from "@nestjs/config";
import { WinstonLoggerService } from "./common/services/winston-logger.service";
import { PrismaModule } from "./prisma/prisma.module";
import { RoleModule } from "./role/role.module";
import { AdminModule } from "./admin/admin.module";
import { UserModule } from "./user/user.module";
import { AuthModule } from "./auth/auth.module";
import { PackageModule } from "./sarjana-vokasi/package/package.module";
import { QuestionModule } from "./sarjana-vokasi/question/question.module";
import { TransactionModule } from "./transaction/transaction.module";
import { SubtestModule } from "./subtest/subtest.module";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { TransformResponseInterceptor } from "./common/interceptors/transform-response.interceptor";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [`.env.${process.env.NODE_ENV || "development"}`, ".env"],
    }),
    PrismaModule,
    RoleModule,
    AdminModule,
    UserModule,
    AuthModule,
    PackageModule,
    QuestionModule,
    TransactionModule,
    SubtestModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
    AppService,
    WinstonLoggerService,
  ],
})
export class AppModule {}
