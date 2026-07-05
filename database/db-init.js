const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// ---------------------------------------------------------------------------
// Connection factory — returns a raw connection (no database selected yet)
// ---------------------------------------------------------------------------
async function createConnection(withDatabase = true) {
    const config = {
        host:     process.env.DB_HOST     || 'localhost',
        user:     process.env.DB_USER     || 'root',
        password: process.env.DB_PASSWORD || '',
    };
    if (withDatabase) {
        config.database = process.env.DB_NAME || 'healthcare_management';
    }
    return mysql.createConnection(config);
}

// ---------------------------------------------------------------------------
// Utility: execute a SQL file split on semicolons, skipping blank/comment lines
// ---------------------------------------------------------------------------
async function executeSqlFile(connection, filePath) {
    console.log(`\n📄 Reading SQL file: ${filePath}`);
    const sql = fs.readFileSync(filePath, 'utf8');

    // Split on semicolons, strip comment-only lines, skip empty blocks
    const statements = sql
        .split(';')
        .map(block =>
            block
                .split('\n')
                .filter(line => {
                    const t = line.trim();
                    return t && !t.startsWith('--') && !t.startsWith('#');
                })
                .join('\n')
                .trim()
        )
        .filter(Boolean);

    console.log(`   Found ${statements.length} statement(s).`);

    for (let i = 0; i < statements.length; i++) {
        try {
            await connection.query(statements[i]);
        } catch (err) {
            console.error(`   ❌ Error on statement ${i + 1}:`, err.message);
            console.error('   Statement:', statements[i].substring(0, 120));
            throw err;
        }
    }
    console.log(`   ✅ File executed successfully.`);
}

// ---------------------------------------------------------------------------
// PHASE 1: Full schema initialisation (schema.sql)
// Run this when setting up the project from scratch.
// ---------------------------------------------------------------------------
async function initSchema() {
    console.log('\n🔧 PHASE 1 — Schema Initialisation');
    const logConfig = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: (process.env.DB_PASSWORD || '') ? '****' : '(none)',
    };
    console.log('   Connecting to MySQL server:', logConfig);

    const connection = await createConnection(false); // no DB selected yet
    console.log('   ✅ Connected.');

    try {
        await executeSqlFile(connection, path.join(__dirname, 'schema.sql'));
        console.log('\n✅ Schema initialisation complete.');
    } finally {
        await connection.end();
    }
}

// ---------------------------------------------------------------------------
// PHASE 2: Incremental migrations
// Reads every .sql file from database/migrations/ in filename order and
// executes it against the target database. Safe to run repeatedly because
// every migration uses CREATE TABLE IF NOT EXISTS / similar guards.
// ---------------------------------------------------------------------------
async function runMigrations() {
    console.log('\n🔧 PHASE 2 — Incremental Migrations');

    const migrationsDir = path.join(__dirname, 'migrations');
    if (!fs.existsSync(migrationsDir)) {
        console.log('   No migrations directory found — skipping.');
        return;
    }

    const migrationFiles = fs
        .readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort(); // alphabetical = chronological by prefix convention

    if (migrationFiles.length === 0) {
        console.log('   No migration files found — skipping.');
        return;
    }

    console.log(`   Found ${migrationFiles.length} migration file(s):`, migrationFiles);

    const connection = await createConnection(true); // uses healthcare_management DB
    console.log('   ✅ Connected to database.');

    try {
        for (const file of migrationFiles) {
            await executeSqlFile(connection, path.join(migrationsDir, file));
        }
        console.log('\n✅ All migrations applied successfully.');
    } finally {
        await connection.end();
    }
}

// ---------------------------------------------------------------------------
// PHASE 3: Verification
// Queries information_schema to confirm all expected tables exist.
// ---------------------------------------------------------------------------
async function verifyTables() {
    console.log('\n🔍 PHASE 3 — Verification');

    const expectedTables = [
        'users', 'medicines', 'inventory', 'prescriptions',
        'sold_medicines', 'reminders', 'dose_confirmations',
        'notifications', 'audit_logs',
        'ai_chat_history',           // added by migration 001
    ];

    const connection = await createConnection(true);
    try {
        const dbName = process.env.DB_NAME || 'healthcare_management';
        const [rows] = await connection.query(
            `SELECT TABLE_NAME
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ?
             ORDER BY TABLE_NAME`,
            [dbName]
        );

        const found = rows.map(r => r.TABLE_NAME);
        console.log(`\n   Tables in "${dbName}":`, found);

        const missing = expectedTables.filter(t => !found.includes(t));
        if (missing.length > 0) {
            console.error('\n   ❌ Missing tables:', missing);
            process.exit(1);
        }

        console.log('\n✅ All expected tables verified.');
    } finally {
        await connection.end();
    }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
async function main() {
    const args = process.argv.slice(2);
    const skipSchema = args.includes('--migrate-only');

    try {
        if (!skipSchema) {
            await initSchema();
        }
        await runMigrations();
        await verifyTables();
        console.log('\n🎉 Database setup complete.\n');
    } catch (err) {
        console.error('\n❌ Fatal error during database setup:', err.message);
        process.exit(1);
    }
}

main();
