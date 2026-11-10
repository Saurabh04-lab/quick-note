
const { Pool } = require("pg");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing.");
}

// Neon connection string includes sslmode=require.
// Do not override its TLS settings with an insecure SSL configuration.
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 15000,
    keepAlive: true
});

pool.on("error", error => {
    console.error("PostgreSQL pool error:", error.message);
});

async function initializeDatabase() {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS notes (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                owner_id UUID NOT NULL
                    REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(150) NOT NULL,
                content TEXT NOT NULL DEFAULT '',
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_notes_owner_updated
            ON notes(owner_id, updated_at DESC)
        `);

        // One-time legacy JSON import tracking.
        await client.query(`
            CREATE TABLE IF NOT EXISTS legacy_note_migrations (
                owner_id UUID NOT NULL
                    REFERENCES users(id) ON DELETE CASCADE,
                source_id TEXT NOT NULL,
                imported_note_id UUID
                    REFERENCES notes(id) ON DELETE SET NULL,
                imported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                PRIMARY KEY (owner_id, source_id)
            )
        `);

        await client.query("COMMIT");

        console.log("PostgreSQL schema initialized.");

    } catch (error) {
        await client.query("ROLLBACK");
        console.error("Database initialization failed:", error.message);
        throw error;

    } finally {
        client.release();
    }
}

async function checkDatabase() {
    const result = await pool.query(
        "SELECT NOW() AS database_time"
    );

    return result.rows[0];
}

module.exports = {
    pool,
    initializeDatabase,
    checkDatabase
};
