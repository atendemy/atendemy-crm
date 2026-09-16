const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  try {
    const res = await pool.query("SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'platform_branding_accent_hex';");
    console.log("Constraint:", res.rows[0].pg_get_constraintdef);
  } catch(e) {
    console.error("Error:", e.message);
  }
  pool.end();
}
run();
