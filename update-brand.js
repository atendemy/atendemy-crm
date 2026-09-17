const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.SUPABASE_DB_URL });
async function run() {
  try {
    await pool.query("UPDATE platform_branding SET accent_hex = '#eab308' WHERE id = 1;");
    console.log("Color updated!");
  } catch(e) {
    console.error("Error:", e.message);
  }
  pool.end();
}
run();
