import express from "express";
import db from "../db.ts";
import { authenticate, authorize } from "../middleware/auth.ts";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Apply TPO protection to all routes
router.use(authenticate, authorize(['TPO']));

// Helper to get TPO Profile and Assigned College IDs
async function getTPOContext(userId: number) {
  const [tpoProfiles]: any = await db.query("SELECT id FROM tpo_profiles WHERE user_id = ?", [userId]);
  if (tpoProfiles.length === 0) return null;
  const tpoId = tpoProfiles[0].id;

  const [colleges]: any = await db.query("SELECT college_id FROM tpo_colleges WHERE tpo_id = ?", [tpoId]);
  const collegeIds = colleges.map((c: any) => c.college_id);

  return { tpoId, collegeIds };
}

// Dashboard Stats
router.get("/dashboard-stats", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.json({ 
        success: true, 
        data: { 
          metrics: {
            totalStudents: 0,
            activeStudents: 0,
            placedStudents: 0,
            placementRate: 0,
            avgTalentScore: 0,
            atRiskStudents: 0
          }, 
          collegeAnalytics: [] 
        } 
      });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // 1. Core Metrics
    const [studentStats]: any = await db.query(`
      SELECT COUNT(*) as totalStudents,
             SUM(CASE WHEN completeness_score >= 80 THEN 1 ELSE 0 END) as activeStudents
      FROM student_profiles
      WHERE college_id IN (${placeholders})
    `, [...collegeIds]);

    const [placementStats]: any = await db.query(`
      SELECT COUNT(*) as placedStudents
      FROM event_registrations er
      JOIN student_profiles sp ON er.student_id = sp.id
      WHERE sp.college_id IN (${placeholders}) AND er.status = 'SELECTED'
    `, [...collegeIds]);

    const [talentStats]: any = await db.query(`
      SELECT AVG(overall_score) as avgTalentScore,
             SUM(CASE WHEN overall_score < 40 THEN 1 ELSE 0 END) as atRiskStudents
      FROM talent_scores ts
      JOIN student_profiles sp ON ts.user_id = sp.user_id
      WHERE sp.college_id IN (${placeholders})
    `, [...collegeIds]);

    // 2. College-wise Analytics
    const [collegeAnalytics]: any = await db.query(`
      SELECT cm.college_name, ca.*
      FROM college_analytics ca
      JOIN college_master cm ON ca.college_id = cm.id
      WHERE ca.college_id IN (${placeholders})
    `, [...collegeIds]);

    res.json({
      success: true,
      data: {
        metrics: {
          totalStudents: studentStats[0].totalStudents || 0,
          activeStudents: studentStats[0].activeStudents || 0,
          placedStudents: placementStats[0].placedStudents || 0,
          placementRate: studentStats[0].totalStudents > 0 ? (placementStats[0].placedStudents / studentStats[0].totalStudents) * 100 : 0,
          avgTalentScore: talentStats[0].avgTalentScore || 0,
          atRiskStudents: talentStats[0].atRiskStudents || 0
        },
        collegeAnalytics
      }
    });
  } catch (error) {
    console.error("TPO Dashboard Stats Error:", error);
    res.status(500).json({ success: false, message: "Error fetching dashboard stats" });
  }
});

// Get Students for Assigned Colleges
router.get("/students", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    const [students]: any = await db.query(`
      SELECT sp.*, u.email, ts.overall_score as talent_score, cm.college_name
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      JOIN college_master cm ON sp.college_id = cm.id
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
      WHERE sp.college_id IN (${placeholders})
      ORDER BY ts.overall_score DESC
    `, [...collegeIds]);

    res.json({ success: true, data: students });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching students" });
  }
});

// AI Skill Gap Analysis
router.get("/ai-skill-gap", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.status(400).json({ success: false, message: "No colleges assigned" });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // Get aggregated skills and scores from students
    const [studentData]: any = await db.query(`
      SELECT sp.skills_json, ts.overall_score, ts.breakdown_json, cs.topics_json
      FROM student_profiles sp
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
      LEFT JOIN coding_profiles cp ON sp.user_id = cp.user_id
      LEFT JOIN coding_stats cs ON cp.id = cs.profile_id
      WHERE sp.college_id IN (${placeholders})
    `, [...collegeIds]);

    const allSkills = studentData.flatMap((s: any) => {
      try {
        return typeof s.skills_json === 'string' ? JSON.parse(s.skills_json) : (s.skills_json || []);
      } catch (e) { return []; }
    });

    // Aggregate skills frequency
    const skillFrequency: Record<string, number> = {};
    allSkills.forEach((s: string) => {
      skillFrequency[s] = (skillFrequency[s] || 0) + 1;
    });

    const avgScore = studentData.reduce((acc: number, curr: any) => acc + (curr.overall_score || 0), 0) / (studentData.length || 1);
    
    // Get latest job requirements
    const [jobs]: any = await db.query("SELECT title, skills_json FROM jobs WHERE status = 'OPEN' LIMIT 20");
    const jobReqs = jobs.map((j: any) => {
      const skills = typeof j.skills_json === 'string' ? JSON.parse(j.skills_json) : (j.skills_json || []);
      return `${j.title}: ${skills.join(', ')}`;
    }).join('\n');

    const prompt = `
      As an EdTech Placement Expert and AI Career Architect, analyze this college's talent pool data:
      
      COLLEGE DATA:
      - Total Students Analyzed: ${studentData.length}
      - Average Talent Score: ${avgScore.toFixed(2)}/100
      - Student Skill Frequency: ${JSON.stringify(skillFrequency)}
      
      CURRENT MARKET JOB REQUIREMENTS (OPEN POSITIONS):
      ${jobReqs}

      Generate a comprehensive Placement Intelligence Report in JSON format:
      {
        "placement_readiness": number (0-100),
        "top_missing_skills": string[],
        "college_strengths": string[],
        "college_weaknesses": string[],
        "branch_recommendations": string[],
        "training_roadmap": [
          { "phase": "string", "focus": "string", "duration": "string" }
        ],
        "market_fit_analysis": "string"
      }
    `;

    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    const text = result.text;
    
    // Production-grade JSON extraction
    let jsonReport;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : text;
      jsonReport = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("AI JSON Parse Error:", parseError, "Original Text:", text);
      return res.status(500).json({ 
        success: false, 
        message: "AI generated an invalid report format. Please try again.",
        retryable: true 
      });
    }

    res.json({ success: true, data: jsonReport });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error generating AI analysis" });
  }
});

// Event Management
router.post("/events", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(403).json({ success: false, message: "TPO profile not found" });

    const { title, description, event_type, start_date, end_date, location_or_link, college_id, image_url } = req.body;

    const targetCollegeId = Number(college_id);
    if (!context.collegeIds.map((id: any) => Number(id)).includes(targetCollegeId)) {
      return res.status(403).json({ success: false, message: "Unauthorized for this college" });
    }

    const [result]: any = await db.query(`
      INSERT INTO events (college_id, tpo_id, title, description, event_type, start_date, end_date, location_or_link, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [targetCollegeId, context.tpoId, title, description, event_type, start_date, end_date, location_or_link, image_url || null]);

    res.json({ success: true, message: "Event created successfully", eventId: result.insertId });
  } catch (error) {
    console.error("Error creating event:", error);
    res.status(500).json({ success: false, message: "Error creating event" });
  }
});

router.get("/events", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.json({ success: true, data: [] });

    const placeholders = context.collegeIds.map(() => '?').join(',');

    const [events]: any = await db.query(`
      SELECT e.*, cm.college_name,
             (SELECT COUNT(*) FROM event_registrations WHERE event_id = e.id) as registration_count
      FROM events e
      JOIN college_master cm ON e.college_id = cm.id
      WHERE e.college_id IN (${placeholders})
      ORDER BY e.start_date DESC
    `, [...context.collegeIds]);

    res.json({ success: true, data: events });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching events" });
  }
});

// --- ASSESSMENT ENGINE ---

router.post("/tests", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context) return res.status(403).json({ success: false, message: "Unauthorized" });

    const { title, duration, total_marks, questions, college_id } = req.body;

    const [result]: any = await db.query(`
      INSERT INTO tpo_tests (tpo_id, college_id, title, duration_minutes, total_marks, questions_json)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [context.tpoId, college_id, title, duration, total_marks, JSON.stringify(questions)]);

    res.json({ success: true, message: "Test created successfully", testId: result.insertId });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating test" });
  }
});

router.get("/tests", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.json({ success: true, data: [] });

    const placeholders = context.collegeIds.map(() => '?').join(',');

    const [tests]: any = await db.query(`
      SELECT t.*, cm.college_name,
             (SELECT COUNT(*) FROM student_test_submissions WHERE test_id = t.id) as submission_count
      FROM tpo_tests t
      JOIN college_master cm ON t.college_id = cm.id
      WHERE t.college_id IN (${placeholders})
      ORDER BY t.created_at DESC
    `, [...context.collegeIds]);

    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching tests" });
  }
});

router.get("/colleges", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) return res.json({ success: true, data: [] });

    const placeholders = context.collegeIds.map(() => '?').join(',');
    const [colleges]: any = await db.query(`
      SELECT id, college_name, college_code, district, state 
      FROM college_master 
      WHERE id IN (${placeholders}) AND status = 'ACTIVE'
    `, [...context.collegeIds]);

    res.json({ success: true, data: colleges });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching assigned colleges" });
  }
});

router.get("/reports/download", async (req: any, res) => {
  try {
    const { type } = req.query;
    // Mock PDF generation - in a real app, use a library like PDFKit or puppeteer
    // For this demo, we return a mock blob
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_report.pdf`);
    res.send(Buffer.from("Mock PDF Content - TalentBridge Report Engine"));
  } catch (error) {
    res.status(500).json({ success: false, message: "Error generating report" });
  }
});

// Self-bootstrap table for verifications
(async () => {
  try {
    const isProduction = process.env.NODE_ENV === "production";
    const useMySQL = !!(process.env.DB_HOST && !isProduction);
    
    if (useMySQL) {
      await db.query(`
        CREATE TABLE IF NOT EXISTS tpo_verifications (
          id INT PRIMARY KEY AUTO_INCREMENT,
          student_id INT NOT NULL,
          document_type VARCHAR(100) NOT NULL,
          document_url VARCHAR(255) NOT NULL,
          status VARCHAR(20) DEFAULT 'PENDING',
          rejection_reason TEXT,
          verified_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    } else {
      await db.query(`
        CREATE TABLE IF NOT EXISTS tpo_verifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          student_id INTEGER NOT NULL,
          document_type TEXT NOT NULL,
          document_url TEXT NOT NULL,
          status TEXT DEFAULT 'PENDING',
          rejection_reason TEXT,
          verified_at TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }
    console.log("✅ tpo_verifications table dynamically initialized.");
  } catch (error) {
    console.error("Failed to bootstrap tpo_verifications table:", error);
  }
})();

// Get Verifications for Assigned Colleges
router.get("/verifications", async (req: any, res) => {
  try {
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // 1. Proactive auto-generation of verification rows for student profiles who uploaded resumes but don't have records
    const [eligibleStudents]: any = await db.query(`
      SELECT sp.id, sp.resume_url, sp.aadhar_or_college_id
      FROM student_profiles sp
      WHERE sp.college_id IN (${placeholders}) 
        AND (sp.resume_url IS NOT NULL AND sp.resume_url != '')
    `, [...collegeIds]);

    for (const student of eligibleStudents) {
      if (student.resume_url) {
        const [existing]: any = await db.query(
          "SELECT id FROM tpo_verifications WHERE student_id = ? AND document_type = 'Resume'",
          [student.id]
        );
        if (existing.length === 0) {
          await db.query(`
            INSERT INTO tpo_verifications (student_id, document_type, document_url, status)
            VALUES (?, 'Resume', ?, 'PENDING')
          `, [student.id, student.resume_url]);
        }
      }
    }

    // Checking for Aadhar / College ID Card
    const [eligibleIdStudents]: any = await db.query(`
      SELECT sp.id, sp.aadhar_or_college_id
      FROM student_profiles sp
      WHERE sp.college_id IN (${placeholders}) 
        AND (sp.aadhar_or_college_id IS NOT NULL AND sp.aadhar_or_college_id != '')
    `, [...collegeIds]);

    for (const student of eligibleIdStudents) {
      if (student.aadhar_or_college_id) {
        const [existing]: any = await db.query(
          "SELECT id FROM tpo_verifications WHERE student_id = ? AND document_type = 'College ID Card'",
          [student.id]
        );
        if (existing.length === 0) {
          let url = student.aadhar_or_college_id;
          if (!url.startsWith('http') && !url.startsWith('/')) {
            url = `/id-proof-text-declaration?id=${encodeURIComponent(url)}`;
          }
          await db.query(`
            INSERT INTO tpo_verifications (student_id, document_type, document_url, status)
            VALUES (?, 'College ID Card', ?, 'PENDING')
          `, [student.id, url]);
        }
      }
    }

    // 2. Fetch all verification records for assigned colleges
    const [verifications]: any = await db.query(`
      SELECT v.*, sp.full_name, cm.college_name as college_name, u.email
      FROM tpo_verifications v
      JOIN student_profiles sp ON v.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN college_master cm ON sp.college_id = cm.id
      WHERE sp.college_id IN (${placeholders})
      ORDER BY v.created_at DESC
    `, [...collegeIds]);

    res.json({ success: true, data: verifications });
  } catch (error) {
    console.error("Verification retrieval error:", error);
    res.status(500).json({ success: false, message: "Error fetching verification requests" });
  }
});

// Approve Verification
router.post("/verifications/:id/approve", async (req: any, res) => {
  try {
    const { id } = req.params;
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // Ensure verification belongs to a student of TPO's assigned colleges
    const [verification]: any = await db.query(`
      SELECT v.id, v.student_id
      FROM tpo_verifications v
      JOIN student_profiles sp ON v.student_id = sp.id
      WHERE v.id = ? AND sp.college_id IN (${placeholders})
    `, [id, ...collegeIds]);

    if (verification.length === 0) {
      return res.status(403).json({ success: false, message: "Verification record not found or access denied" });
    }

    const now = new Date();
    await db.query(
      "UPDATE tpo_verifications SET status = 'VERIFIED', verified_at = ? WHERE id = ?",
      [now, id]
    );

    res.json({ success: true, message: "Document verified successfully" });
  } catch (error) {
    console.error("Verification approve error:", error);
    res.status(500).json({ success: false, message: "Error approving verification" });
  }
});

// Reject Verification
router.post("/verifications/:id/reject", async (req: any, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const context = await getTPOContext(req.user.userId);
    if (!context || context.collegeIds.length === 0) {
      return res.status(403).json({ success: false, message: "Unauthorized" });
    }

    const { collegeIds } = context;
    const placeholders = collegeIds.map(() => '?').join(',');

    // Ensure verification belongs to a student of TPO's assigned colleges
    const [verification]: any = await db.query(`
      SELECT v.id, v.student_id
      FROM tpo_verifications v
      JOIN student_profiles sp ON v.student_id = sp.id
      WHERE v.id = ? AND sp.college_id IN (${placeholders})
    `, [id, ...collegeIds]);

    if (verification.length === 0) {
      return res.status(403).json({ success: false, message: "Verification record not found or access denied" });
    }

    await db.query(
      "UPDATE tpo_verifications SET status = 'REJECTED', rejection_reason = ? WHERE id = ?",
      [reason || 'Incorrect document or low resolution', id]
    );

    res.json({ success: true, message: "Document verification rejected" });
  } catch (error) {
    console.error("Verification reject error:", error);
    res.status(500).json({ success: false, message: "Error rejecting verification" });
  }
});

export default router;
