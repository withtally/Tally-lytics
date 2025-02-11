const { Client } = require('pg');

async function listTables() {
  const client = new Client({
    connectionString: process.env.SUPABASE_CONNECTION_STRING,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    console.log('Tables in database:');
    result.rows.forEach(row => console.log(row.table_name));
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

listTables(); 