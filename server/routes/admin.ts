import express from "express";
import db from "../db.ts";
import { authenticate, isAdmin } from "../middleware/auth.ts";
import { XPService } from "../services/xpService.ts";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendTPOCredentials } from "../services/emailService.ts";

const router = express.Router();

// Apply admin protection to all routes
router.use(authenticate, isAdmin);

// Helper for activity logging
async function logAdminAction(adminId: number, action: string, details: any, req: express.Request) {
  try {
    const ip = req.ip || req.connection.remoteAddress;
    await db.query(`
      INSERT INTO admin_logs (admin_id, action, details, ip_address)
      VALUES (?, ?, ?, ?)
    `, [adminId, action, typeof details === 'string' ? details : JSON.stringify(details), ip]);
  } catch (error) {
    console.error("Logging failed:", error);
  }
}

// --- COLLEGE MANAGEMENT ---

router.post("/colleges", async (req, res) => {
  try {
    const { college_name, college_code, university, address, district, state, website, contact_number } = req.body;
    
    const [result]: any = await db.query(`
      INSERT INTO college_master (college_name, college_code, university, address, district, state, website, contact_number)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [college_name, college_code, university, address, district, state, website, contact_number]);

    await logAdminAction((req as any).user.userId, "CREATE_COLLEGE", { college_name, college_code }, req);

    res.json({ success: true, message: "College created successfully", collegeId: result.insertId });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: "College code already exists" });
    }
    res.status(500).json({ success: false, message: "Error creating college" });
  }
});

router.get("/colleges", async (req, res) => {
  try {
    const [colleges]: any = await db.query("SELECT * FROM college_master WHERE status = 'ACTIVE' ORDER BY college_name ASC");
    res.json({ success: true, data: colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching colleges" });
  }
});

router.delete("/colleges/:id", async (req, res) => {
  try {
    const { id } = req.params;

    // Perform soft delete
    await db.query("UPDATE college_master SET status = 'INACTIVE' WHERE id = ?", [id]);
    
    // Optionally: Unlink students or handle other dependencies if needed
    // For soft-delete, we usually just change the status so they don't show up in lists.
    
    await logAdminAction((req as any).user.userId, "DELETE_COLLEGE", { collegeId: id, mode: "SOFT_DELETE" }, req);

    res.json({ success: true, message: "College marked as INACTIVE successfully" });
  } catch (error) {
    console.error("Delete College Error:", error);
    res.status(500).json({ success: false, message: "Error deleting college." });
  }
});

// --- TPO MANAGEMENT ---

router.post("/tpos", async (req, res) => {
  try {
    const { email, full_name, contact_number, designation, college_ids } = req.body;

    // 1. Create User
    const tempPassword = crypto.randomBytes(8).toString("hex");
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const [userResult]: any = await db.query(`
      INSERT INTO users (email, password_hash, role, status, is_verified)
      VALUES (?, ?, 'TPO', 'ACTIVE', 1)
    `, [email, passwordHash]);

    const userId = userResult.insertId;

    // 2. Create TPO Profile
    const [tpoResult]: any = await db.query(`
      INSERT INTO tpo_profiles (user_id, full_name, contact_number, designation)
      VALUES (?, ?, ?, ?)
    `, [userId, full_name, contact_number, designation]);

    const tpoId = tpoResult.insertId;

    // 3. Assign Colleges
    if (college_ids && Array.isArray(college_ids)) {
      for (const collegeId of college_ids) {
        await db.query("INSERT INTO tpo_colleges (tpo_id, college_id) VALUES (?, ?)", [tpoId, collegeId]);
      }
    }

    // 4. Send Email
    const loginUrl = `${process.env.APP_URL || 'http://localhost:5173'}/login`;
    await sendTPOCredentials(email, full_name, tempPassword, loginUrl);

    await logAdminAction((req as any).user.userId, "CREATE_TPO", { email, full_name, college_ids }, req);

    res.json({ success: true, message: "TPO account created and credentials sent" });
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }
    console.error(error);
    res.status(500).json({ success: false, message: "Error creating TPO account" });
  }
});

// Seed High-Fidelity Mock Data for TPO Ecosystem
router.post("/seed-tpo-data-v2", async (req, res) => {
  try {
    // 1. Colleges
    const colleges = [
      { name: "Orchid College of Engineering", code: "ORCHID-01", city: "Solapur" },
      { name: "WIT Solapur (Walchand Institute of Technology)", code: "WIT-02", city: "Solapur" },
      { name: "BMIT (Brahmdevdada Mane Institute of Technology)", code: "BMIT-03", city: "Solapur" }
    ];

    const collegeIds = [];
    for (const c of colleges) {
      const [existing]: any = await db.query("SELECT id FROM college_master WHERE college_code = ?", [c.code]);
      if (existing.length > 0) {
        collegeIds.push(existing[0].id);
      } else {
        const [res]: any = await db.query(`
          INSERT INTO college_master (college_name, college_code, district, state)
          VALUES (?, ?, ?, 'Maharashtra')
        `, [c.name, c.code, c.city]);
        collegeIds.push(res.insertId);
      }
    }

    // 2. Ensure at least one TPO exists for events
    let tpoId;
    const [tpos]: any = await db.query("SELECT id FROM tpo_profiles LIMIT 1");
    if (tpos.length > 0) {
      tpoId = tpos[0].id;
    } else {
      // Create a dummy TPO for seeding
      const tempPassword = await bcrypt.hash("Admin@123", 10);
      const [u]: any = await db.query("INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, 'TPO', 1)", [`seed_tpo@talentbridge.com`, tempPassword]);
      const [t]: any = await db.query("INSERT INTO tpo_profiles (user_id, full_name, designation) VALUES (?, 'System Seed TPO', 'Administrator')", [u.insertId]);
      tpoId = t.insertId;
      // Assign to all seeded colleges
      for (const cid of collegeIds) {
        await db.query("INSERT INTO tpo_colleges (tpo_id, college_id) VALUES (?, ?)", [tpoId, cid]);
      }
    }

    // 3. Students (20 High-Fidelity Profiles)
    const departments = ['CSE', 'ECE', 'Mechanical', 'Civil'];
    const years = ['Third Year', 'Final Year'];
    const names = ["Aditya", "Sneha", "Rohan", "Pooja", "Vikram", "Anjali", "Siddharth", "Nisha", "Sameer", "Riya", "Kunal", "Tanvi", "Pranav", "Ishita", "Yash", "Meera", "Abhishek", "Shweta", "Rahul", "Deepa"];

    for (let i = 0; i < 20; i++) {
      const email = `student${i + 100}@talentbridge.com`;
      const [existing]: any = await db.query("SELECT id FROM users WHERE email = ?", [email]);
      if (existing.length > 0) continue;

      const passwordHash = await bcrypt.hash("Student123!", 10);
      const [u]: any = await db.query("INSERT INTO users (email, password_hash, role, is_verified) VALUES (?, ?, 'STUDENT', 1)", [email, passwordHash]);
      const userId = u.insertId;

      const dept = departments[i % 4];
      const year = years[i % 2];
      const collegeId = collegeIds[i % collegeIds.length];
      const score = 30 + Math.floor(Math.random() * 65); // 30-95

      await db.query(`
        INSERT INTO student_profiles (user_id, college_id, full_name, completeness_score, skills_json, education_json)
        VALUES (?, ?, ?, 100, ?, ?)
      `, [userId, collegeId, names[i] + " Patil", 100, JSON.stringify(['React', 'Node.js', 'SQL']), JSON.stringify({ department: dept, year: year })]);

      await db.query(`
        INSERT INTO talent_scores (user_id, overall_score, breakdown_json)
        VALUES (?, ?, ?)
      `, [userId, score, JSON.stringify({ technical: score, aptitude: score - 5, communication: score + 5 })]);
    }

    // 4. Companies & Drives
    const dateSql = db.useMySQL ? "DATE_ADD(NOW(), INTERVAL 7 DAY)" : "datetime('now', '+7 days')";
    const [driveRes]: any = await db.query(`
      INSERT INTO events (college_id, tpo_id, title, description, event_type, start_date, status)
      VALUES (?, ?, 'TCS Ninja Drive 2026', 'Campus recruitment for TCS Ninja role', 'PLACEMENT_DRIVE', ${dateSql}, 'UPCOMING')
    `, [collegeIds[0], tpoId]);
    
    const eventId = driveRes.insertId;
    await db.query(`
      INSERT INTO placement_drives (event_id, company_name, job_role, package_details)
      VALUES (?, 'TCS', 'System Engineer', '3.6 - 7.0 LPA')
    `, [eventId]);

    // 5. Update college analytics
    for (const cid of collegeIds) {
      const statsData = [cid, 7, 2, 69.2, 72.5, 65.0];
      if (db.useMySQL) {
        await db.query(`
          INSERT INTO college_analytics (college_id, total_students, placed_students, avg_talent_score, avg_coding_score, avg_interview_score)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            total_students = VALUES(total_students), 
            placed_students = VALUES(placed_students), 
            avg_talent_score = VALUES(avg_talent_score),
            avg_coding_score = VALUES(avg_coding_score),
            avg_interview_score = VALUES(avg_interview_score)
        `, statsData);
      } else {
        await db.query(`
          INSERT INTO college_analytics (college_id, total_students, placed_students, avg_talent_score, avg_coding_score, avg_interview_score)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(college_id) DO UPDATE SET
            total_students = excluded.total_students,
            placed_students = excluded.placed_students,
            avg_talent_score = excluded.avg_talent_score,
            avg_coding_score = excluded.avg_coding_score,
            avg_interview_score = excluded.avg_interview_score
        `, statsData);
      }
    }

    res.json({ success: true, message: "Production-grade mock data seeded successfully" });
  } catch (error: any) {
    console.error("Seeding Error:", error);
    res.status(500).json({ success: false, message: `Seeding failed: ${error.message || 'Unknown error'}` });
  }
});

router.get("/tpos", async (req, res) => {
  try {
    const [tpos]: any = await db.query(`
      SELECT t.*, u.email, u.status as user_status, 
      GROUP_CONCAT(c.college_name) as assigned_colleges
      FROM tpo_profiles t
      JOIN users u ON t.user_id = u.id
      LEFT JOIN tpo_colleges tc ON t.id = tc.tpo_id
      LEFT JOIN college_master c ON tc.college_id = c.id
      GROUP BY t.id
    `);
    res.json({ success: true, data: tpos });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching TPOs" });
  }
});

// Admin stats
router.get("/stats", async (req, res) => {
  try {
    const [userCount]: any = await db.query("SELECT COUNT(*) as total FROM users");
    const [studentCount]: any = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'STUDENT'");
    const [companyCount]: any = await db.query("SELECT COUNT(*) as total FROM users WHERE role = 'COMPANY'");
    const [pendingCompanies]: any = await db.query("SELECT COUNT(*) as total FROM company_profiles WHERE status = 'PENDING'");
    const [jobCount]: any = await db.query("SELECT COUNT(*) as total FROM jobs");
    const [appCount]: any = await db.query("SELECT COUNT(*) as total FROM job_applications");
    const [shortlistedCount]: any = await db.query("SELECT COUNT(*) as total FROM job_applications WHERE status = 'SHORTLISTED'");

    // Application trend (last 7 days)
    const trendQuery = db.useMySQL ? `
      SELECT DATE(applied_at) as date, COUNT(*) as count 
      FROM job_applications 
      WHERE applied_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
      GROUP BY date
      ORDER BY date ASC
    ` : `
      SELECT date(applied_at) as date, COUNT(*) as count 
      FROM job_applications 
      WHERE applied_at >= date('now', '-7 days')
      GROUP BY date
      ORDER BY date ASC
    `;

    const [trend]: any = await db.query(trendQuery);

    res.json({
      success: true,
      data: {
        metrics: {
          totalUsers: userCount[0]?.total || 0,
          students: studentCount[0]?.total || 0,
          companies: companyCount[0]?.total || 0,
          pendingVerifications: pendingCompanies[0]?.total || 0,
          totalJobs: jobCount[0]?.total || 0,
          totalApplications: appCount[0]?.total || 0,
          shortlisted: shortlistedCount[0]?.total || 0
        },
        trend
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching stats" });
  }
});

// Get Comprehensive Student Details
router.get("/students/:userId/details", async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Check if student exists
    const [userQuery]: any = await db.query("SELECT id, email, status, role, created_at FROM users WHERE id = ?", [userId]);
    if (userQuery.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    const user = userQuery[0];

    const [profiles]: any = await db.query("SELECT * FROM student_profiles WHERE user_id = ?", [userId]);
    const profile = profiles[0] || null;

    if (!profile) {
      return res.json({ success: true, data: { user, profile: null } });
    }

    const studentId = profile.id;

    const [education]: any = await db.query("SELECT * FROM student_education WHERE student_id = ? ORDER BY start_date DESC", [studentId]);
    const [experience]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ? ORDER BY start_date DESC", [studentId]);
    const [projects]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ? ORDER BY created_at DESC", [studentId]);
    const [certifications]: any = await db.query("SELECT * FROM student_certifications WHERE student_id = ? ORDER BY issue_date DESC", [studentId]);
    const [extracurriculars]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ? ORDER BY activity_date DESC", [userId]);
    
    const [applications]: any = await db.query(`
      SELECT a.id, a.status, a.applied_at, j.title as job_title, cp.company_name
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      WHERE a.student_id = ?
      ORDER BY a.applied_at DESC
    `, [studentId]);

    res.json({ 
      success: true, 
      data: {
        user,
        profile,
        education,
        experience,
        projects,
        certifications,
        extracurriculars,
        applications
      }
    });
  } catch (error) {
    console.error("Error fetching detailed student info:", error);
    res.status(500).json({ success: false, message: "Error fetching details" });
  }
});

// Get Comprehensive Company Details
router.get("/companies/:userId/details", async (req, res) => {
  try {
    const { userId } = req.params;
    
    const [userQuery]: any = await db.query("SELECT id, email, status, role, created_at FROM users WHERE id = ?", [userId]);
    if (userQuery.length === 0) return res.status(404).json({ success: false, message: "User not found" });
    const user = userQuery[0];

    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    const profile = profiles[0] || null;

    if (!profile) {
      return res.json({ success: true, data: { user, profile: null } });
    }

    const companyId = profile.id;

    // Fetch jobs
    const [jobs]: any = await db.query("SELECT * FROM jobs WHERE company_id = ? ORDER BY created_at DESC", [companyId]);

    // Fetch documents
    const [documents]: any = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [companyId]);

    // Fetch brief application stats
    const [applications]: any = await db.query(`
      SELECT a.status, COUNT(*) as count
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = ?
      GROUP BY a.status
    `, [companyId]);

    res.json({ 
      success: true, 
      data: {
        user,
        profile,
        jobs,
        documents,
        applicationStats: applications
      }
    });

  } catch (error) {
    console.error("Error fetching detailed company info:", error);
    res.status(500).json({ success: false, message: "Error fetching details" });
  }
});

// List all users
router.get("/users", async (req, res) => {
  try {
    const [users]: any = await db.query(`
      SELECT u.id, u.email, u.role, u.status, u.created_at,
             cp.company_name, cp.status as company_status, cp.id as company_profile_id,
             cp.company_type, cp.industry, cp.city as location, cp.contact_number, cp.about as description,
             sp.full_name as student_name, sp.id as student_profile_id, sp.completeness_score
      FROM users u
      LEFT JOIN company_profiles cp ON u.id = cp.user_id
      LEFT JOIN student_profiles sp ON u.id = sp.user_id
      ORDER BY u.created_at DESC
    `);
    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching users" });
  }
});

// Pending verification list with details
router.get("/companies/pending", async (req, res) => {
  try {
    const [pending]: any = await db.query(`
      SELECT C.*, U.email 
      FROM company_profiles C 
      JOIN users U ON C.user_id = U.id 
      WHERE C.status = 'PENDING'
      ORDER BY C.updated_at ASC
    `);

    // Fetch documents for each pending company
    const enriched = await Promise.all(pending.map(async (p: any) => {
      const [docs]: any = await db.query("SELECT id, doc_type, status FROM company_documents WHERE company_id = ?", [p.id]);
      return { ...p, documents: docs };
    }));

    res.json({ success: true, data: enriched });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching pending list" });
  }
});

// Approve/Reject Company
router.post("/companies/verify", async (req, res) => {
  const { companyId, status, reason } = req.body;
  const adminId = (req as any).user.userId;

  try {
    const verifiedAt = status === 'APPROVED' ? new Date() : null;
    
    await db.query(`
      UPDATE company_profiles 
      SET status = ?, rejection_reason = ?, verified_at = ?
      WHERE id = ?
    `, [status, status === 'REJECTED' ? reason : null, verifiedAt, companyId]);

    // Log the review
    await db.query(`
      INSERT INTO admin_reviews (company_id, admin_id, action, reason)
      VALUES (?, ?, ?, ?)
    `, [companyId, adminId, status, reason]);

    await logAdminAction(adminId, `VERIFY_COMPANY_${status}`, { companyId, reason }, req);

    res.json({ success: true, message: `Company ${status}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Verification failed" });
  }
});

// Applications Tracker (Global)
router.get("/applications", async (req, res) => {
  try {
    const [apps]: any = await db.query(`
      SELECT a.*, sp.full_name as student_name, j.title as job_title, cp.company_name
      FROM applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN jobs j ON a.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      ORDER BY a.applied_at DESC
    `);
    res.json({ success: true, data: apps });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching applications" });
  }
});

// Talent Score Monitoring
router.get("/monitoring/talent-scores", async (req, res) => {
  try {
    const [scores]: any = await db.query(`
      SELECT sp.full_name, sp.id as profile_id, u.email, sp.completeness_score,
             (SELECT COUNT(*) FROM applications WHERE student_id = sp.id) as app_count
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      ORDER BY sp.completeness_score DESC
      LIMIT 100
    `);
    res.json({ success: true, data: scores });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching talent scores" });
  }
});

// Admin Logs
router.get("/logs", async (req, res) => {
  try {
    const [logs]: any = await db.query(`
      SELECT al.*, u.email as admin_email
      FROM admin_logs al
      JOIN users u ON al.admin_id = u.id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching logs" });
  }
});

// Moderate jobs
router.get("/jobs", async (req, res) => {
  try {
    const [jobs]: any = await db.query(`
      SELECT j.*, cp.company_name 
      FROM jobs j
      JOIN company_profiles cp ON j.company_id = cp.id
      ORDER BY j.created_at DESC
    `);
    res.json({ success: true, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching jobs" });
  }
});

router.delete("/jobs/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  try {
    await db.query("DELETE FROM jobs WHERE id = ?", [req.params.id]);
    await logAdminAction(adminId, "DELETE_JOB", { jobId: req.params.id }, req);
    res.json({ success: true, message: "Job deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
});

// Update user account status (Ban/Unban)
router.patch("/users/:id/status", async (req, res) => {
  const { status } = req.body;
  const adminId = (req as any).user.userId;
  try {
    await db.query("UPDATE users SET status = ? WHERE id = ?", [status, req.params.id]);
    await logAdminAction(adminId, `USER_STATUS_${status}`, { userId: req.params.id }, req);
    res.json({ success: true, message: `User status updated to ${status}` });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// --- PSYCHOMETRIC QUESTION MANAGEMENT ---

// List all psychometric questions
router.get("/psychometric/questions", async (req, res) => {
  try {
    const [questions]: any = await db.query("SELECT * FROM psychometric_questions ORDER BY created_at DESC");
    res.json({ success: true, data: questions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching psychometric questions" });
  }
});

// Add new psychometric question
router.post("/psychometric/questions", async (req, res) => {
  const { category, trait, question_text, options_json } = req.body;
  const adminId = (req as any).user.userId;
  try {
    const [result]: any = await db.query(
      "INSERT INTO psychometric_questions (category, trait, question_text, options_json) VALUES (?, ?, ?, ?)",
      [category, trait, question_text, JSON.stringify(options_json)]
    );
    await logAdminAction(adminId, "ADD_PSYCHOMETRIC_QUESTION", { id: result.insertId, category, trait }, req);
    res.json({ success: true, message: "Question added", id: result.insertId });
  } catch (error) {
    console.error("❌ Error adding psychometric question:", error);
    res.status(500).json({ success: false, message: "Error adding question: " + (error as any).message });
  }
});

// Update psychometric question
router.put("/psychometric/questions/:id", async (req, res) => {
  const { category, trait, question_text, options_json } = req.body;
  const adminId = (req as any).user.userId;
  try {
    await db.query(
      "UPDATE psychometric_questions SET category = ?, trait = ?, question_text = ?, options_json = ? WHERE id = ?",
      [category, trait, question_text, JSON.stringify(options_json), req.params.id]
    );
    await logAdminAction(adminId, "UPDATE_PSYCHOMETRIC_QUESTION", { id: req.params.id }, req);
    res.json({ success: true, message: "Question updated" });
  } catch (error) {
    console.error("❌ Error updating psychometric question:", error);
    res.status(500).json({ success: false, message: "Error updating question: " + (error as any).message });
  }
});

// Delete psychometric question
router.delete("/psychometric/questions/:id", async (req, res) => {
  const adminId = (req as any).user.userId;
  try {
    await db.query("DELETE FROM psychometric_questions WHERE id = ?", [req.params.id]);
    await logAdminAction(adminId, "DELETE_PSYCHOMETRIC_QUESTION", { id: req.params.id }, req);
    res.json({ success: true, message: "Question deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting question" });
  }
});

// --- DYNAMIC PRICING & SYSTEM CONFIGURATION MANAGEMENT ---

// Fetch all system configs
router.get("/config", async (req, res) => {
  try {
    const [configs] = await db.query("SELECT config_key, config_value, description FROM system_configs");
    res.json({ success: true, data: configs });
  } catch (error: any) {
    console.error("❌ Error fetching configuration:", error);
    res.status(500).json({ success: false, message: "Error fetching configs: " + error.message });
  }
});

// Update a system config key value
router.put("/config/:key", async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  const adminId = (req as any).user.userId;

  try {
    await db.query(
      "UPDATE system_configs SET config_value = ? WHERE config_key = ?",
      [String(value), key]
    );

    await logAdminAction(adminId, "UPDATE_SYSTEM_CONFIG", { key, value }, req);
    res.json({ success: true, message: `Config '${key}' updated successfully` });
  } catch (error: any) {
    console.error("❌ Error updating configuration:", error);
    res.status(500).json({ success: false, message: "Error updating config: " + error.message });
  }
});

// --- Dynamic XP Packages Management ---

// Fetch all packages for editing/management
router.get("/packages", async (req, res) => {
  try {
    const [packages] = await db.query("SELECT * FROM xp_packages ORDER BY price_inr ASC");
    res.json({ success: true, data: packages });
  } catch (error: any) {
    console.error("❌ Error fetching packages:", error);
    res.status(500).json({ success: false, message: "Error fetching packages" });
  }
});

// Add a new package
router.post("/packages", async (req, res) => {
  const { name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included } = req.body;
  const adminId = (req as any).user.userId;

  try {
    const [result]: any = await db.query(
      "INSERT INTO xp_packages (name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        name, 
        Number(xp_amount), 
        Number(price_inr), 
        is_popular ? 1 : 0, 
        is_best_value ? 1 : 0,
        mock_interviews_included !== undefined && mock_interviews_included !== null ? Number(mock_interviews_included) : null,
        resume_reviews_included !== undefined && resume_reviews_included !== null ? Number(resume_reviews_included) : null
      ]
    );

    await logAdminAction(adminId, "ADD_XP_PACKAGE", { name, xp_amount, price_inr }, req);
    res.json({ success: true, message: "XP package added successfully", id: result.insertId });
  } catch (error: any) {
    console.error("❌ Error adding package:", error);
    res.status(500).json({ success: false, message: "Error adding package: " + error.message });
  }
});

// Edit existing package
router.put("/packages/:id", async (req, res) => {
  const { id } = req.params;
  const { name, xp_amount, price_inr, is_popular, is_best_value, mock_interviews_included, resume_reviews_included } = req.body;
  const adminId = (req as any).user.userId;

  try {
    await db.query(
      "UPDATE xp_packages SET name = ?, xp_amount = ?, price_inr = ?, is_popular = ?, is_best_value = ?, mock_interviews_included = ?, resume_reviews_included = ? WHERE id = ?",
      [
        name, 
        Number(xp_amount), 
        Number(price_inr), 
        is_popular ? 1 : 0, 
        is_best_value ? 1 : 0,
        mock_interviews_included !== undefined && mock_interviews_included !== null ? Number(mock_interviews_included) : null,
        resume_reviews_included !== undefined && resume_reviews_included !== null ? Number(resume_reviews_included) : null,
        id
      ]
    );

    await logAdminAction(adminId, "UPDATE_XP_PACKAGE", { id, name, xp_amount, price_inr }, req);
    res.json({ success: true, message: "XP package updated successfully" });
  } catch (error: any) {
    console.error("❌ Error updating package:", error);
    res.status(500).json({ success: false, message: "Error updating package: " + error.message });
  }
});

// Delete package
router.delete("/packages/:id", async (req, res) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;

  try {
    await db.query("DELETE FROM xp_packages WHERE id = ?", [id]);
    await logAdminAction(adminId, "DELETE_XP_PACKAGE", { id }, req);
    res.json({ success: true, message: "XP package deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting package:", error);
    res.status(500).json({ success: false, message: "Error deleting package" });
  }
});

// --- ADMIN COMMUNITY post & XP MANAGEMENT ---

// List all community posts
router.get("/community/posts", async (req, res) => {
  try {
    const queryStr = `
      SELECT p.*, u.email as creator_email, u.name as creator_name, u.photo as creator_photo
      FROM posts p
      JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
    `;
    const [posts] = await db.query(queryStr);
    res.json({ success: true, posts });
  } catch (error: any) {
    console.error("❌ Error loading admin posts:", error);
    res.status(500).json({ success: false, message: "Error loading community posts: " + error.message });
  }
});

// Toggle post verification / badge
router.put("/community/posts/:id/verify", async (req, res) => {
  const { id } = req.params;
  let { is_verified, send_reward } = req.body;
  if (is_verified === undefined) is_verified = true;
  if (send_reward === undefined) send_reward = true;
  const adminId = (req as any).user.userId;

  try {
    const [posts]: any = await db.query("SELECT * FROM posts WHERE id = ?", [id]);
    if (posts.length === 0) {
      return res.status(404).json({ success: false, message: "Post not found" });
    }
    const post = posts[0];

    await db.query("UPDATE posts SET is_verified = ? WHERE id = ?", [is_verified ? 1 : 0, id]);

    if (is_verified && send_reward) {
      // Award Verification Bonus XP!
      await XPService.addXP(post.user_id, 100, "BONUS", `[Community] Double Verification Reward for post: "${post.title}"`);
    }

    await logAdminAction(adminId, "TOGGLE_COMMUNITY_POST_VERIFICATION", { id, is_verified, send_reward }, req);
    res.json({ success: true, message: `Post verification toggled successfully. ${is_verified && send_reward ? "100 XP award granted to user." : ""}` });
  } catch (error: any) {
    console.error("❌ Error toggling post verification:", error);
    res.status(500).json({ success: false, message: "Error toggling post verification: " + error.message });
  }
});

// Adjust rating / manual scoring
router.put("/community/posts/:id/update-score", async (req, res) => {
  const { id } = req.params;
  const { content_score, quality_analysis } = req.body;
  const adminId = (req as any).user.userId;

  try {
    await db.query(
      "UPDATE posts SET content_score = ?, quality_analysis = ? WHERE id = ?",
      [Number(content_score), quality_analysis, id]
    );

    await logAdminAction(adminId, "UPDATE_COMMUNITY_POST_SCORE", { id, content_score }, req);
    res.json({ success: true, message: "Content score and evaluation updated successfully." });
  } catch (error: any) {
    console.error("❌ Error updating post score:", error);
    res.status(500).json({ success: false, message: "Error updating post score: " + error.message });
  }
});

// Delete community post
router.delete("/community/posts/:id", async (req, res) => {
  const { id } = req.params;
  const adminId = (req as any).user.userId;

  try {
    await db.query("DELETE FROM posts WHERE id = ?", [id]);
    await logAdminAction(adminId, "DELETE_COMMUNITY_POST", { id }, req);
    res.json({ success: true, message: "Post deleted successfully" });
  } catch (error: any) {
    console.error("❌ Error deleting community post:", error);
    res.status(500).json({ success: false, message: "Error deleting community post" });
  }
});

// Grant or deduct User XP directly
router.post("/community/users/:id/grant-xp", async (req, res) => {
  const { id } = req.params;
  const { amount, description } = req.body;
  const adminId = (req as any).user.userId;

  try {
    const amt = Number(amount);
    if (isNaN(amt) || amt === 0) {
      return res.status(400).json({ success: false, message: "Invalid amount value." });
    }

    if (amt > 0) {
      await XPService.addXP(Number(id), amt, "BONUS", description || "[Community] Admin Community Bonus award");
      await logAdminAction(adminId, "GRANT_USER_XP", { id, amount: amt, description }, req);
    } else {
      // For backwards compatibility let's safeguard DB. This does not crash even if client sends deductXP or we do it directly
      await db.query(`
        UPDATE users 
        SET xp_balance = MAX(0, xp_balance - ?)
        WHERE id = ?
      `, [Math.abs(amt), Number(id)]);
      await logAdminAction(adminId, "DEDUCT_USER_XP", { id, amount: Math.abs(amt), description }, req);
    }

    res.json({ success: true, message: "User XP updated successfully." });
  } catch (error: any) {
    console.error("❌ Error adjusting user XP:", error);
    res.status(500).json({ success: false, message: "Error adjusting user XP: " + error.message });
  }
});

export default router;
