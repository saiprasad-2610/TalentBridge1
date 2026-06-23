import db, { initDb } from './server/db.ts';
async function test() {
  try {
    await initDb();
    await db.query(`
          INSERT INTO interview_schedules (application_id, stage_id, interview_type, location_or_link, scheduled_at, notes)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [1, 1, 'INTERVIEW_ONLINE', 'Link', '2023-01-01T00:00:00Z', 'Test Notes']);
    console.log("Success!");
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit();
}
test();
