import 'dotenv/config';
import { PrismaService } from './prisma/prisma.service';

async function verify() {
  console.log('Initializing PrismaService...');
  const prisma = new PrismaService();
  try {
    console.log('Connecting to database...');
    await prisma.onModuleInit();
    console.log('Successfully connected to database!');

    // Optional: Try a simple query if possible, but connection check is good enough for now.
    // const count = await prisma.user.count();
    // console.log(`User count: ${count}`);

    await prisma.onModuleDestroy();
    console.log('Disconnected.');
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

verify();
