import bcrypt from 'bcryptjs';
import pkg from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import dotenv from 'dotenv';

const { PrismaClient } = pkg;
dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);

// Using adapter for direct connection in Prisma 7
const prisma = new PrismaClient({ adapter });

async function main() {
  const adminEmail = 'admin@huvvsm.com';
  const adminPassword = 'SuperSecretAdmin123!'; // User should change this
  
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(adminPassword, salt);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'HUVVSM ADMIN',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });

  console.log({ admin });
  console.log('ADMIN CREATED OR ALREADY EXISTS');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
