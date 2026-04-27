import { Pool } from 'pg';

// Get DATABASE_URL from environment (supports multiple env var names)
function getDatabaseUrl(): string {
	return (
		process.env.DATABASE_URL ||
		process.env.PGDATABASE_URL ||
		process.env.DATABASE_DIRECT_URL ||
		''
	);
}

// Direct PostgreSQL connection pool
const pool = new Pool({
	connectionString: getDatabaseUrl(),
	ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export async function query<T = Record<string, unknown>>(
	text: string,
	params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
	const client = await pool.connect();
	try {
		const result = await client.query(text, params);
		return { rows: result.rows as T[], rowCount: result.rowCount ?? 0 };
	} finally {
		client.release();
	}
}

export async function queryOne<T = Record<string, unknown>>(
	text: string,
	params?: unknown[]
): Promise<T | null> {
	const result = await query<T>(text, params);
	return result.rows[0] || null;
}

export { pool };
