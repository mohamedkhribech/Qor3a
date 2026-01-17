import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/qor3a';

const isProduction = process.env.NODE_ENV === 'production';

export const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : undefined
});

// Test connection
pool.connect()
    .then(() => console.log('✅ Connected to PostgreSQL'))
    .catch((err) => console.error('❌ Database connection error:', err.message));
