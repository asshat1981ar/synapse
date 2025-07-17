const database = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class User {
    constructor(data) {
        this.id = data.id;
        this.email = data.email;
        this.displayName = data.display_name;
        this.passwordHash = data.password_hash;
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
        this.preferences = data.preferences || {};
    }

    static async create({ email, password, displayName }) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(password, salt);

        const query = `
            INSERT INTO users (email, display_name, password_hash)
            VALUES ($1, $2, $3)
            RETURNING *
        `;

        const result = await database.query(query, [email, displayName, passwordHash]);
        return new User(result.rows[0]);
    }

    static async findById(id) {
        const query = 'SELECT * FROM users WHERE id = $1';
        const result = await database.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new User(result.rows[0]);
    }

    static async findByEmail(email) {
        const query = 'SELECT * FROM users WHERE email = $1';
        const result = await database.query(query, [email]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new User(result.rows[0]);
    }

    static async findAll(limit = 50, offset = 0) {
        const query = `
            SELECT * FROM users 
            ORDER BY created_at DESC 
            LIMIT $1 OFFSET $2
        `;
        
        const result = await database.query(query, [limit, offset]);
        return result.rows.map(row => new User(row));
    }

    async update(updates) {
        const allowedUpdates = ['display_name', 'preferences'];
        const setClause = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedUpdates.includes(key)) {
                setClause.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (setClause.length === 0) {
            return this;
        }

        values.push(this.id);
        
        const query = `
            UPDATE users 
            SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await database.query(query, values);
        const updatedUser = new User(result.rows[0]);
        
        // Update current instance
        Object.assign(this, updatedUser);
        return this;
    }

    async updatePassword(newPassword) {
        const salt = await bcrypt.genSalt(10);
        const passwordHash = await bcrypt.hash(newPassword, salt);

        const query = `
            UPDATE users 
            SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
            RETURNING *
        `;

        const result = await database.query(query, [passwordHash, this.id]);
        this.passwordHash = result.rows[0].password_hash;
        this.updatedAt = result.rows[0].updated_at;
        
        return this;
    }

    async verifyPassword(password) {
        return await bcrypt.compare(password, this.passwordHash);
    }

    async delete() {
        const query = 'DELETE FROM users WHERE id = $1';
        await database.query(query, [this.id]);
    }

    // Refresh token management
    async createRefreshToken() {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const query = `
            INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
            VALUES ($1, $2, $3)
            RETURNING id
        `;

        await database.query(query, [this.id, tokenHash, expiresAt]);
        return token;
    }

    async validateRefreshToken(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        const query = `
            SELECT * FROM refresh_tokens 
            WHERE user_id = $1 AND token_hash = $2 
            AND expires_at > CURRENT_TIMESTAMP AND is_revoked = FALSE
        `;

        const result = await database.query(query, [this.id, tokenHash]);
        return result.rows.length > 0;
    }

    async revokeRefreshToken(token) {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        
        const query = `
            UPDATE refresh_tokens 
            SET is_revoked = TRUE 
            WHERE user_id = $1 AND token_hash = $2
        `;

        await database.query(query, [this.id, tokenHash]);
    }

    async revokeAllRefreshTokens() {
        const query = `
            UPDATE refresh_tokens 
            SET is_revoked = TRUE 
            WHERE user_id = $1
        `;

        await database.query(query, [this.id]);
    }

    // Clean expired tokens
    static async cleanExpiredTokens() {
        const query = `
            DELETE FROM refresh_tokens 
            WHERE expires_at < CURRENT_TIMESTAMP
        `;

        const result = await database.query(query);
        return result.rowCount;
    }

    // Convert to JSON (exclude sensitive data)
    toJSON() {
        return {
            id: this.id,
            email: this.email,
            displayName: this.displayName,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            preferences: this.preferences
        };
    }

    // Get user stats
    async getStats() {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM projects WHERE owner_id = $1) as project_count,
                (SELECT COUNT(*) FROM ai_sessions WHERE user_id = $1) as session_count,
                (SELECT COUNT(*) FROM code_executions WHERE user_id = $1) as execution_count
        `;

        const result = await database.query(query, [this.id]);
        return result.rows[0];
    }
}

module.exports = User;