const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class Database {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }

    async connect() {
        if (this.isConnected) {
            return this.pool;
        }

        try {
            // Database configuration
            const config = {
                connectionString: process.env.DATABASE_URL,
                // Connection pool settings
                max: 20, // maximum number of clients in the pool
                idleTimeoutMillis: 30000, // how long a client is allowed to remain idle
                connectionTimeoutMillis: 10000, // how long to wait for a connection
                // Add SSL configuration for PostgreSQL
                ssl: false
            };

            this.pool = new Pool(config);

            // Test the connection
            const client = await this.pool.connect();
            await client.query('SELECT NOW()');
            client.release();

            this.isConnected = true;
            logger.info(`Database connected successfully to ${config.host}:${config.port}/${config.database}`);
            
            return this.pool;
        } catch (error) {
            logger.error('Database connection failed:', error);
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    async disconnect() {
        if (this.pool) {
            await this.pool.end();
            this.isConnected = false;
            logger.info('Database connection closed');
        }
    }

    async query(text, params = []) {
        if (!this.isConnected) {
            await this.connect();
        }

        try {
            const start = Date.now();
            const result = await this.pool.query(text, params);
            const duration = Date.now() - start;
            
            logger.debug('Executed query', {
                text: text.substring(0, 100) + (text.length > 100 ? '...' : ''),
                duration,
                rows: result.rowCount
            });
            
            return result;
        } catch (error) {
            logger.error('Database query error:', {
                text: text.substring(0, 100),
                error: error.message,
                params
            });
            throw error;
        }
    }

    async getClient() {
        if (!this.isConnected) {
            await this.connect();
        }
        return await this.pool.connect();
    }

    async transaction(callback) {
        const client = await this.getClient();
        
        try {
            await client.query('BEGIN');
            const result = await callback(client);
            await client.query('COMMIT');
            return result;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    async migrate() {
        try {
            // Create migrations table if it doesn't exist
            await this.query(`
                CREATE TABLE IF NOT EXISTS migrations (
                    id SERIAL PRIMARY KEY,
                    filename VARCHAR(255) NOT NULL UNIQUE,
                    executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Get list of executed migrations
            const { rows: executedMigrations } = await this.query(
                'SELECT filename FROM migrations ORDER BY id'
            );
            const executedFiles = executedMigrations.map(row => row.filename);

            // Get list of migration files
            const migrationsDir = path.join(__dirname, '../../database/migrations');
            const migrationFiles = fs.readdirSync(migrationsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            // Execute pending migrations
            for (const filename of migrationFiles) {
                if (!executedFiles.includes(filename)) {
                    logger.info(`Executing migration: ${filename}`);
                    
                    const filePath = path.join(migrationsDir, filename);
                    const sql = fs.readFileSync(filePath, 'utf8');
                    
                    await this.transaction(async (client) => {
                        await client.query(sql);
                        await client.query(
                            'INSERT INTO migrations (filename) VALUES ($1)',
                            [filename]
                        );
                    });
                    
                    logger.info(`Migration completed: ${filename}`);
                }
            }

            logger.info('Database migrations completed');
        } catch (error) {
            logger.error('Database migration failed:', error);
            throw error;
        }
    }

    async seed() {
        try {
            const seedsDir = path.join(__dirname, '../../database/seeds');
            
            // Check if seeds directory exists
            if (!fs.existsSync(seedsDir)) {
                logger.info('No seeds directory found, skipping seeding');
                return;
            }

            const seedFiles = fs.readdirSync(seedsDir)
                .filter(file => file.endsWith('.sql'))
                .sort();

            for (const filename of seedFiles) {
                logger.info(`Executing seed: ${filename}`);
                
                const filePath = path.join(seedsDir, filename);
                const sql = fs.readFileSync(filePath, 'utf8');
                
                await this.query(sql);
                logger.info(`Seed completed: ${filename}`);
            }

            logger.info('Database seeding completed');
        } catch (error) {
            logger.error('Database seeding failed:', error);
            throw error;
        }
    }

    // Helper method to check if database is healthy
    async healthCheck() {
        try {
            const result = await this.query('SELECT 1 as health');
            return result.rows[0].health === 1;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }
}

// Export singleton instance
const database = new Database();

module.exports = database;