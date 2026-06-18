import db, { initDb } from './server/db.ts';

async function check() {
  try {
    await initDb();
    const [users]: any = await db.query(`SELECT id, email, role FROM users`);
    console.log("--- USERS ---", users);
    const [profiles]: any = await db.query(`SELECT id, user_id, full_name, completeness_score FROM student_profiles`);
    console.log("--- PROFILES ---", profiles);
    const [interviews]: any = await db.query(`SELECT id, student_id, title, status FROM interviews`);
    console.log("--- INTERVIEWS ---", interviews);
    const [notifications]: any = await db.query(`SELECT id, user_id, title, is_read FROM notifications`);
    console.log("--- NOTIFICATIONS ---", notifications);
  } catch (e) {
    console.error(e);
  }
}
check();
