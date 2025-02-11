// Near the start of app.ts
import db from './db';

async function testDbConnection() {
  try {
    const result = await db.raw('SELECT NOW()');
    console.log('Database connected successfully. Current time:', result.rows[0].now);
  } catch (error: any) {
    console.error('Failed to connect to the database:', error);
  }
}

testDbConnection();
