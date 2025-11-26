import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from 'src/generated/prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaMariaDb({
      host: process.env.DATABASE_HOST!,
      port: Number(process.env.DATABASE_PORT ?? 3306),
      user: process.env.DATABASE_USER!,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME!,
    })
    super({ adapter });
  }

  async onModuleInit() {
    try {
      console.log('Trying to connect Prisma to DB...');
      await this.$connect();
      await this.$queryRawUnsafe('SELECT 1');
      console.log('Prisma connected to DB successfully');
    } catch (err) {
      console.error('Prisma failed to connect to DB');
      console.error(err);
      throw err;
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
