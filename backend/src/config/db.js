import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

const { PrismaClient } = pkg;
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Using adapter for direct connection in Prisma 7.8.0
const prisma = new PrismaClient({ adapter });

const connectDB = async () => {
  try {
    await prisma.$connect();
    console.log('[DATABASE] PostgreSQL Connected via Prisma (Neon)');
  } catch (error) {
    console.error(`[DATABASE ERROR] ${error.message}`);
    process.exit(1);
  }
};

export { prisma, connectDB };
