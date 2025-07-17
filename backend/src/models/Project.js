const database = require('../config/database');

class Project {
    constructor(data) {
        this.id = data.id;
        this.name = data.name;
        this.description = data.description;
        this.projectType = data.project_type;
        this.ownerId = data.owner_id;
        this.configuration = data.configuration || {};
        this.createdAt = data.created_at;
        this.updatedAt = data.updated_at;
    }

    static async create({ name, description, projectType, ownerId, configuration = {} }) {
        const query = `
            INSERT INTO projects (name, description, project_type, owner_id, configuration)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await database.query(query, [
            name, 
            description, 
            projectType, 
            ownerId, 
            JSON.stringify(configuration)
        ]);
        
        return new Project(result.rows[0]);
    }

    static async findById(id) {
        const query = 'SELECT * FROM projects WHERE id = $1';
        const result = await database.query(query, [id]);
        
        if (result.rows.length === 0) {
            return null;
        }
        
        return new Project(result.rows[0]);
    }

    static async findByOwnerId(ownerId, limit = 50, offset = 0, filter = null) {
        let query = `
            SELECT p.*, 
                   (SELECT COUNT(*) FROM project_files WHERE project_id = p.id) as file_count,
                   (SELECT COUNT(*) FROM project_collaborators WHERE project_id = p.id) as collaborator_count
            FROM projects p
            WHERE p.owner_id = $1
        `;
        
        const params = [ownerId];
        let paramCount = 2;

        if (filter) {
            query += ` AND (p.name ILIKE $${paramCount} OR p.description ILIKE $${paramCount})`;
            params.push(`%${filter}%`);
            paramCount++;
        }

        query += ` ORDER BY p.created_at DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
        params.push(limit, offset);

        const result = await database.query(query, params);
        return result.rows.map(row => {
            const project = new Project(row);
            project.fileCount = parseInt(row.file_count);
            project.collaboratorCount = parseInt(row.collaborator_count);
            return project;
        });
    }

    static async findAccessibleByUserId(userId, limit = 50, offset = 0) {
        const query = `
            SELECT DISTINCT p.*, 
                   (SELECT COUNT(*) FROM project_files WHERE project_id = p.id) as file_count,
                   (SELECT COUNT(*) FROM project_collaborators WHERE project_id = p.id) as collaborator_count
            FROM projects p
            LEFT JOIN project_collaborators pc ON p.id = pc.project_id
            WHERE p.owner_id = $1 OR pc.user_id = $1
            ORDER BY p.created_at DESC
            LIMIT $2 OFFSET $3
        `;

        const result = await database.query(query, [userId, limit, offset]);
        return result.rows.map(row => {
            const project = new Project(row);
            project.fileCount = parseInt(row.file_count);
            project.collaboratorCount = parseInt(row.collaborator_count);
            return project;
        });
    }

    async update(updates) {
        const allowedUpdates = ['name', 'description', 'configuration'];
        const setClause = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (allowedUpdates.includes(key)) {
                const dbKey = key === 'projectType' ? 'project_type' : key;
                setClause.push(`${dbKey} = $${paramCount}`);
                values.push(key === 'configuration' ? JSON.stringify(value) : value);
                paramCount++;
            }
        }

        if (setClause.length === 0) {
            return this;
        }

        values.push(this.id);
        
        const query = `
            UPDATE projects 
            SET ${setClause.join(', ')}, updated_at = CURRENT_TIMESTAMP
            WHERE id = $${paramCount}
            RETURNING *
        `;

        const result = await database.query(query, values);
        const updatedProject = new Project(result.rows[0]);
        
        Object.assign(this, updatedProject);
        return this;
    }

    async delete() {
        // This will cascade delete files, collaborators, sessions, etc.
        const query = 'DELETE FROM projects WHERE id = $1';
        await database.query(query, [this.id]);
    }

    async addCollaborator(userId, role = 'collaborator') {
        const query = `
            INSERT INTO project_collaborators (project_id, user_id, role)
            VALUES ($1, $2, $3)
            ON CONFLICT (project_id, user_id) 
            DO UPDATE SET role = EXCLUDED.role, added_at = CURRENT_TIMESTAMP
        `;

        await database.query(query, [this.id, userId, role]);
    }

    async removeCollaborator(userId) {
        const query = `
            DELETE FROM project_collaborators 
            WHERE project_id = $1 AND user_id = $2
        `;

        await database.query(query, [this.id, userId]);
    }

    async getCollaborators() {
        const query = `
            SELECT u.id, u.email, u.display_name, pc.role, pc.added_at
            FROM project_collaborators pc
            JOIN users u ON pc.user_id = u.id
            WHERE pc.project_id = $1
            ORDER BY pc.added_at DESC
        `;

        const result = await database.query(query, [this.id]);
        return result.rows;
    }

    async hasAccess(userId) {
        if (this.ownerId === userId) {
            return true;
        }

        const query = `
            SELECT 1 FROM project_collaborators 
            WHERE project_id = $1 AND user_id = $2
        `;

        const result = await database.query(query, [this.id, userId]);
        return result.rows.length > 0;
    }

    async getFiles() {
        const query = `
            SELECT * FROM project_files 
            WHERE project_id = $1 
            ORDER BY file_path ASC
        `;

        const result = await database.query(query, [this.id]);
        return result.rows;
    }

    async createFile({ filePath, content = '', language, modifiedBy }) {
        const query = `
            INSERT INTO project_files (project_id, file_path, content, language, modified_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const result = await database.query(query, [
            this.id, 
            filePath, 
            content, 
            language, 
            modifiedBy
        ]);

        return result.rows[0];
    }

    async getStats() {
        const query = `
            SELECT 
                (SELECT COUNT(*) FROM project_files WHERE project_id = $1) as file_count,
                (SELECT COUNT(*) FROM project_collaborators WHERE project_id = $1) as collaborator_count,
                (SELECT COUNT(*) FROM ai_sessions WHERE project_id = $1) as session_count,
                (SELECT COUNT(*) FROM code_executions WHERE project_id = $1) as execution_count
        `;

        const result = await database.query(query, [this.id]);
        return result.rows[0];
    }

    toJSON() {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            projectType: this.projectType,
            ownerId: this.ownerId,
            configuration: this.configuration,
            createdAt: this.createdAt,
            updatedAt: this.updatedAt,
            fileCount: this.fileCount || 0,
            collaboratorCount: this.collaboratorCount || 0
        };
    }
}

module.exports = Project;