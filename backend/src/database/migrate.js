
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');

async function migrate() {
  try {
    const filePath = path.join(__dirname, '../../database/migrations/001_initial_schema.sql');
    const script = await fs.readFile(filePath, 'utf-8');
    await db.query(script);
    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Error running migration:', error);
  } finally {
    
  }
}

migrate();
