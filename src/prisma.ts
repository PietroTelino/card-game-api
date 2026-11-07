import { PrismaPg } from '@prisma/adapter-pg';
import { databaseUrl } from './config/env';
import { PrismaClient } from './generated/prisma/client';

export const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl() }) });
