const { PrismaClient } = require('@prisma/client');

// Pool size: default 10 connections (override via DB_POOL_SIZE env)
const poolSize = parseInt(process.env.DB_POOL_SIZE || '10');

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  datasources: {
    db: {
      url: process.env.DATABASE_URL
        ? `${process.env.DATABASE_URL}${process.env.DATABASE_URL.includes('?') ? '&' : '?'}connection_limit=${poolSize}&pool_timeout=20`
        : undefined,
    },
  },
});

module.exports = prisma;
