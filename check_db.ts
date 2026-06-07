import db, { initDb } from './server/db.ts';

async function check() {
  try {
    await initDb();
    const [cols] = await db.query(`PRAGMA table_info(users)`);
    console.log("Cols length", cols.length);
  } catch (e) {
    console.error(e);
  }
}
check();
