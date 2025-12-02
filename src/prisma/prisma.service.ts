import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PrismaClient } from 'src/generated/prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const pool = new Pool({
      host: process.env.DATABASE_HOST!,
      port: Number(process.env.DATABASE_PORT ?? 5432),
      user: process.env.DATABASE_USER!,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME!,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
      connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
    });
    
    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
    
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    try {
      console.log('Trying to connect Prisma to DB...');
      await this.$connect();
      // $connect() sudah cukup untuk test connection
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
