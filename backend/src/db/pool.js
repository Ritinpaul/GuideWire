/**
 * PostgreSQL connection pool with exponential-backoff retry.
 * Retries up to 8 times with increasing delays — handles Docker startup race
 * where backend starts before Postgres is ready.
 */
import pg from 'pg';

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 15,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
});

pool.on('error', (err) => {
  console.error('❌ Idle DB client error:', err.message);
});

/**
 * Probe the pool with a lightweight query.
 * Returns the server timestamp on success.
 */
async function probe() {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT NOW() AS now');
    return rows[0].now;
  } finally {
    client.release();
  }
}

/**
 * Retry connecting to DB on startup (Docker readiness race).
 */
async function connectWithRetry(maxRetries = 8, baseDelayMs = 1500) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const ts = await probe();
      console.log(`✅ PostgreSQL ready (server time: ${ts})`);
      return;
    } catch (err) {
      const delay = baseDelayMs * attempt;
      console.warn(
        `⚠️  DB attempt ${attempt}/${maxRetries} failed: ${err.message} — retrying in ${delay}ms`,
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error('❌ Could not reach PostgreSQL — running without DB');
      }
    }
  }
}

// Fire-and-forget on module load
connectWithRetry();

export default pool;
export { probe };
