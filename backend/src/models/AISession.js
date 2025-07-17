const database = require('../config/database');

class AISession {
    constructor(data) {
        this.id = data.id;
        this.userId = data.user_id;
        this.projectId = data.project_id;
        this.activeAgents = data.active_agents || [];
        this.context = data.context || {};
        this.status = data.status;
        this.startedAt = data.started_at;
        this.lastActivity = data.last_activity;
    }

    static async create({ userId, projectId, activeAgents = [], context = {} }) {
        const query = `
            INSERT INTO ai_sessions (user_id, project_id, active_agents, context)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const result = await database.query(query, [
            userId,
            projectId,
            activeAgents,
            JSON.stringify(context)
        ]);

        return new AISession(result.rows[0]);
    }

    static async findById(id) {
        const query = 'SELECT * FROM ai_sessions WHERE id = $1';
        const result = await database.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new AISession(result.rows[0]);
    }

    static async findByUserId(userId, limit = 50, offset = 0) {
        const query = `
            SELECT s.*, p.name as project_name
            FROM ai_sessions s
            LEFT JOIN projects p ON s.project_id = p.id
            WHERE s.user_id = $1
            ORDER BY s.last_activity DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await database.query(query, [userId, limit, offset]);
        return result.rows.map(row => {
            const session = new AISession(row);
            session.projectName = row.project_name;
            return session;
        });
    }

    static async findByProjectId(projectId, limit = 50, offset = 0) {
        const query = `
            SELECT * FROM ai_sessions 
            WHERE project_id = $1
            ORDER BY last_activity DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await database.query(query, [projectId, limit, offset]);
        return result.rows.map(row => new AISession(row));
    }

    async update(updates) {
        const allowedUpdates = ['active_agents', 'context', 'status'];
        const setClause = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedUpdates.includes(key)) {
                setClause.push(`${key} = $${paramCount}`);
                if (key === 'context') {
                    values.push(JSON.stringify(value));
                } else {
                    values.push(value);
                }
                paramCount++;
            }
        }

        if (setClause.length === 0) {
            return this;
        }

        // Always update last_activity when updating session
        setClause.push(`last_activity = CURRENT_TIMESTAMP`);
        values.push(this.id);
        
        const query = `
            UPDATE ai_sessions 
            SET ${setClause.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await database.query(query, values);
        const updatedSession = new AISession(result.rows[0]);
        
        Object.assign(this, updatedSession);
        return this;
    }

    async delete() {
        // This will cascade delete messages
        const query = 'DELETE FROM ai_sessions WHERE id = $1';
        await database.query(query, [this.id]);
    }

    async addMessage({ senderType, senderId, content, messageType = 'user_input', targetAgent = null, metadata = {} }) {
        const query = `
            INSERT INTO ai_messages (session_id, sender_type, sender_id, content, message_type, target_agent, metadata)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await database.query(query, [
            this.id,
            senderType,
            senderId,
            content,
            messageType,
            targetAgent,
            JSON.stringify(metadata)
        ]);

        return result.rows[0];
    }

    async getMessages(limit = 50, beforeMessageId = null) {
        let query = `
            SELECT * FROM ai_messages 
            WHERE session_id = $1
        `;
        
        const params = [this.id];
        let paramCount = 2;

        if (beforeMessageId) {
            query += ` AND created_at < (SELECT created_at FROM ai_messages WHERE id = $${paramCount})`;
            params.push(beforeMessageId);
            paramCount++;
        }

        query += ` ORDER BY created_at DESC LIMIT $${paramCount}`;
        params.push(limit);

        const result = await database.query(query, params);
        
        // Return in chronological order (oldest first)
        return result.rows.reverse();
    }

    async getMessageCount() {
        const query = `
            SELECT COUNT(*) as count FROM ai_messages 
            WHERE session_id = $1
        `;

        const result = await database.query(query, [this.id]);
        return parseInt(result.rows[0].count);
    }

    async updateActivity() {
        const query = `
            UPDATE ai_sessions 
            SET last_activity = CURRENT_TIMESTAMP 
            WHERE id = $1
            RETURNING last_activity
        `;

        const result = await database.query(query, [this.id]);
        this.lastActivity = result.rows[0].last_activity;
        return this;
    }

    async hasAccess(userId) {
        // Check if user owns the session
        if (this.userId === userId) {
            return true;
        }

        // Check if user has access to the project (if session is project-specific)
        if (this.projectId) {
            const query = `
                SELECT 1 FROM projects p
                LEFT JOIN project_collaborators pc ON p.id = pc.project_id
                WHERE p.id = $1 AND (p.owner_id = $2 OR pc.user_id = $2)
            `;

            const result = await database.query(query, [this.projectId, userId]);
            return result.rows.length > 0;
        }

        return false;
    }

    // Get session statistics
    async getStats() {
        const query = `
            SELECT 
                COUNT(*) as message_count,
                COUNT(CASE WHEN sender_type = 'user' THEN 1 END) as user_messages,
                COUNT(CASE WHEN sender_type = 'agent' THEN 1 END) as agent_messages,
                MIN(created_at) as first_message,
                MAX(created_at) as last_message
            FROM ai_messages 
            WHERE session_id = $1
        `;

        const result = await database.query(query, [this.id]);
        return result.rows[0];
    }

    // Clean up old sessions
    static async cleanupOldSessions(daysOld = 30) {
        const query = `
            DELETE FROM ai_sessions 
            WHERE status = 'completed' 
            AND last_activity < CURRENT_TIMESTAMP - INTERVAL '${daysOld} days'
        `;

        const result = await database.query(query);
        return result.rowCount;
    }

    toJSON() {
        return {
            id: this.id,
            userId: this.userId,
            projectId: this.projectId,
            activeAgents: this.activeAgents,
            context: this.context,
            status: this.status,
            startedAt: this.startedAt,
            lastActivity: this.lastActivity
        };
    }
}

module.exports = AISession;