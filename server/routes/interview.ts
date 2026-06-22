import { Router } from "express";
import { db } from "../db.ts";
import { authenticate } from "../middleware/auth.ts";

const router = Router();

// Get upcoming interviews for the logged-in student
router.get("/student", authenticate, async (req: any, res) => {
  const userId = req.user.userId;
  try {
    const [student] = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
    if (!student || student.length === 0) {
      return res.json({ success: true, data: [] });
    }
    const studentId = student[0].id;

    const interviewQuery = db.useMySQL ? `
      SELECT 
        i.id,
        i.application_id,
        i.interview_type as type,
        i.location_or_link,
        DATE_FORMAT(i.scheduled_at, '%Y-%m-%dT%H:%i:%s.000Z') as time,
        j.title as role,
        cp.company_name as company,
        cp.logo_url as company_logo,
        i.status,
        i.notes
      FROM interview_schedules i
      JOIN job_applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      WHERE a.student_id = ?
      ORDER BY i.scheduled_at ASC
    ` : `
      SELECT 
        i.id,
        i.application_id,
        i.interview_type as type,
        i.location_or_link,
        i.scheduled_at as time,
        j.title as role,
        cp.company_name as company,
        cp.logo_url as company_logo,
        i.status,
        i.notes
      FROM interview_schedules i
      JOIN job_applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      WHERE a.student_id = ?
      ORDER BY i.scheduled_at ASC
    `;

    const [interviews] = await db.query(interviewQuery, [studentId]);
    
    // Normalize status in JS if status is NULL
    const computed = interviews.map((i: any) => {
      let currentStatus = i.status || 'UPCOMING';
      return { ...i, status: currentStatus };
    });

    res.json({ success: true, data: computed });
  } catch (err) {
    console.error("Error loading student interviews:", err);
    res.status(500).json({ success: false, message: "Error loading interviews" });
  }
});

// Get interview schedules for a specific application (for recruiter tracking)
router.get("/application/:applicationId", authenticate, async (req: any, res) => {
  const { applicationId } = req.params;
  try {
    const [schedules] = await db.query(
      "SELECT id, application_id, stage_id, interview_type as type, location_or_link, scheduled_at, notes, status FROM interview_schedules WHERE application_id = ?",
      [applicationId]
    );
    res.json({ success: true, data: schedules });
  } catch (err) {
    console.error("Error loading application interview schedule:", err);
    res.status(500).json({ success: false, message: "Error loading application schedule" });
  }
});

// Validate and get canonical interview room details for authorized users
router.get("/:interviewId/room", authenticate, async (req: any, res) => {
  const { interviewId } = req.params;
  const { userId, role } = req.user;

  try {
    // 1. Fetch interview schedule and check if it exists
    const scheduleQuery = `
      SELECT 
        i.id, i.application_id, i.stage_id, i.interview_type, i.scheduled_at, i.status, i.notes,
        a.student_id, j.company_id, j.title as job_title,
        sp.full_name as student_name, cp.company_name
      FROM interview_schedules i
      JOIN job_applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN company_profiles cp ON j.company_id = cp.id
      WHERE i.id = ?
    `;
    const [scheduleRows] = await db.query(scheduleQuery, [interviewId]);
    if (!scheduleRows || scheduleRows.length === 0) {
      return res.status(404).json({ success: false, message: "Interview schedule not found" });
    }

    const schedule = scheduleRows[0];

    // 2. Access control validation
    if (role === 'STUDENT') {
      const [studentProfile] = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
      if (!studentProfile || studentProfile.length === 0 || studentProfile[0].id !== schedule.student_id) {
        return res.status(403).json({ success: false, message: "Access denied: This interview is not assigned to you" });
      }
    } else if (role === 'COMPANY') {
      const [companyProfile] = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
      if (!companyProfile || companyProfile.length === 0 || companyProfile[0].id !== schedule.company_id) {
        return res.status(403).json({ success: false, message: "Access denied: This interview is not belongs to your company" });
      }
    } else if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
      // Allow Admin to join, reject others
      return res.status(403).json({ success: false, message: "Access denied" });
    }

    res.json({
      success: true,
      roomId: `interview_${interviewId}`,
      role: role,
      interview: {
        id: schedule.id,
        applicationId: schedule.application_id,
        interviewType: schedule.interview_type,
        scheduledAt: schedule.scheduled_at,
        status: schedule.status || 'UPCOMING',
        jobTitle: schedule.job_title,
        studentName: schedule.student_name,
        companyName: schedule.company_name,
        notes: schedule.notes
      }
    });

  } catch (err) {
    console.error("Error resolving interview room:", err);
    res.status(500).json({ success: false, message: "Error resolving interview room" });
  }
});

// Update interview status to LIVE / start
router.post("/:interviewId/start", authenticate, async (req: any, res) => {
  const { interviewId } = req.params;
  const { userId, role } = req.user;

  if (role !== 'COMPANY' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  try {
    const [schedule] = await db.query("SELECT i.*, j.company_id FROM interview_schedules i JOIN job_applications a ON i.application_id = a.id JOIN jobs j ON a.job_id = j.id WHERE i.id = ?", [interviewId]);
    if (!schedule || schedule.length === 0) {
      return res.status(404).json({ success: false, message: "Interview schedule not found" });
    }

    if (role === 'COMPANY') {
      const [companyProfile] = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
      if (!companyProfile || companyProfile.length === 0 || companyProfile[0].id !== schedule[0].company_id) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    await db.query("UPDATE interview_schedules SET status = 'LIVE' WHERE id = ?", [interviewId]);

    // Track activity in history
    await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, 'LIVE_INTERVIEW_STARTED', 'Live interview room was started by the company.')", 
      [schedule[0].application_id, schedule[0].stage_id]
    );

    res.json({ success: true, message: "Interview started successfully" });
  } catch (err) {
    console.error("Error starting interview:", err);
    res.status(500).json({ success: false, message: "Error starting interview" });
  }
});

// End live interview and mark as COMPLETED
router.post("/:interviewId/end", authenticate, async (req: any, res) => {
  const { interviewId } = req.params;
  const { userId, role } = req.user;

  if (role !== 'COMPANY' && role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
    return res.status(403).json({ success: false, message: "Access denied" });
  }

  try {
    const [schedule] = await db.query("SELECT i.*, j.company_id FROM interview_schedules i JOIN job_applications a ON i.application_id = a.id JOIN jobs j ON a.job_id = j.id WHERE i.id = ?", [interviewId]);
    if (!schedule || schedule.length === 0) {
      return res.status(404).json({ success: false, message: "Interview schedule not found" });
    }

    if (role === 'COMPANY') {
      const [companyProfile] = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
      if (!companyProfile || companyProfile.length === 0 || companyProfile[0].id !== schedule[0].company_id) {
        return res.status(403).json({ success: false, message: "Access denied" });
      }
    }

    await db.query("UPDATE interview_schedules SET status = 'COMPLETED' WHERE id = ?", [interviewId]);

    // Track activity in history
    await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, 'LIVE_INTERVIEW_COMPLETED', 'Live interview was successfully conducted and completed.')", 
      [schedule[0].application_id, schedule[0].stage_id]
    );

    res.json({ success: true, message: "Interview concluded successfully" });
  } catch (err) {
    console.error("Error ending interview:", err);
    res.status(500).json({ success: false, message: "Error ending interview" });
  }
});

export default router;
