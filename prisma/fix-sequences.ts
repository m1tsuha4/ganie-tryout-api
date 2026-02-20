import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
// @ts-ignore
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Fixing sequences...');

  const tables = [
    'Role',
    'Permission',
    'Exam',
    'Question',
    'QuestionChoice',
    'Package',
    'PackageExam',
    'Transaction',
    'UserPackage',
    'UserExamSession',
    'UserAnswer'
  ];

  for (const table of tables) {
    try {
      // Get the max ID from the table
      const result: any = await prisma.$queryRawUnsafe(`SELECT MAX(id) FROM "${table}";`);
      const maxId = result[0].max || 0;
      const nextId = maxId + 1;

      console.log(`Table: ${table}, Max ID: ${maxId}, Setting sequence to: ${nextId}`);

      // Reset the sequence
      // Note: sequence name usually follows the pattern "Table_id_seq" but pg_get_serial_sequence is safer
      // However, since we are using Prisma, we can try to rely on standard naming or just a raw query
      
      // Construct the sequence reset query
      // The sequence name is usually "Table_id_seq" (case sensitive if created with quotes)
      // Prisma usually creates tables with quotes for Postgres if the model name is capitalized in schema?
      // Actually Prisma maps models to table names. By default it uses the model name.
      
      // Let's try to find the sequence name dynamically or just assume "Table_id_seq" 
      // But a better way is:
      await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${table}"', 'id'), ${nextId}, false);`);
      
      console.log(`Sequence for ${table} updated successfully.`);
    } catch (error) {
      console.error(`Error updating sequence for ${table}:`, error);
    }
  }

  console.log('Finished fixing sequences.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
