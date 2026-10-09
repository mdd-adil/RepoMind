import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/repo_visualizer';

export const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
});

let isConnected = false;

export async function initDb() {
  try {
    const client = await pool.connect();
    isConnected = true;
    console.log('✅ Connected to PostgreSQL successfully.');

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await client.query(schemaSql);
    client.release();
    console.log('✅ Database schema verified and initialized.');
  } catch (err) {
    console.warn('⚠️ Warning: Could not connect to PostgreSQL:', err.message);
    console.warn('💡 Tip: Make sure PostgreSQL is running (e.g. docker compose up -d) or update DATABASE_URL in .env');
    isConnected = false;
  }
}

export function isDbConnected() {
  return isConnected;
}

export async function query(text, params) {
  return pool.query(text, params);
}
