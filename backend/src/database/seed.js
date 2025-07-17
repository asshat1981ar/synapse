
const path = require('path');
const fs = require('fs').promises;
const db = require('../config/database');

async function seed() {
  try {
    const filePath = path.join(__dirname, '../../database/seeds/001_demo_data.sql');
    const script = await fs.readFile(filePath, 'utf-8');
    await db.query(script);
    console.log('Database seeding completed successfully.');
  } catch (error) {
    console.error('Error running seeding:', error);
  } finally {
    
  }
}

seed();
