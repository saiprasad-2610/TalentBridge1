import express from "express";
import db from "../db.ts";
import { sendEmail } from "../services/emailService.ts";
import { authenticate } from "../middleware/auth.ts";

const router = express.Router();

// List jobs with filtering and search
router.get("/", async (req, res) => {
  const { search, skills, location, type, experience, studentId } = req.query;
  try {
    let query = `
      SELECT J.*, C.company_name, C.logo_url 
      FROM jobs J 
      JOIN company_profiles C ON J.company_id = C.id 
      WHERE J.status = 'OPEN'
    `;
    const params: any[] = [];

    if (search) {
      query += ` AND (J.title LIKE ? OR C.company_name LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (location) {
      query += ` AND J.location LIKE ?`;
      params.push(`%${location}%`);
    }

    if (type) {
      query += ` AND J.job_type = ?`;
      params.push(type);
    }

    if (experience) {
      query += ` AND J.experience_level = ?`;
      params.push(experience);
    }

    const [jobs]: any = await db.query(query, params);

    // If studentId is provided, calculate match scores
    let enrichedJobs = jobs;
    if (studentId) {
       const [profiles]: any = await db.query("SELECT skills_json FROM student_profiles WHERE id = ?", [studentId]);
       if (profiles.length > 0) {
          const studentSkills = profiles[0].skills_json ? (typeof profiles[0].skills_json === 'string' ? JSON.parse(profiles[0].skills_json) : profiles[0].skills_json) : [];
          enrichedJobs = jobs.map((job: any) => {
             const jobSkills = job.skills_json ? (typeof job.skills_json === 'string' ? JSON.parse(job.skills_json) : job.skills_json) : [];
             if (!Array.isArray(jobSkills) || jobSkills.length === 0) return { ...job, match_score: 100 };
             
             const matches = jobSkills.filter((s: string) => 
                studentSkills.some((ss: any) => {
                   const sName = typeof ss === 'string' ? ss : (ss.name || "");
                   return sName.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(sName.toLowerCase());
                })
             );
             const score = Math.round((matches.length / jobSkills.length) * 100);
             return { ...job, match_score: score };
          });
       }
    }

    res.json({ success: true, data: enrichedJobs });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    res.status(500).json({ success: false, message: "Error fetching jobs" });
  }
});

// Create job with stages
router.post("/", authenticate, async (req: any, res) => {
  const { 
    title, description, skills, location, jobType, 
    experienceLevel, educationRequirement, responsibilities, 
    qualifications, additionalNotes, startDate, deadline, stages,
    salaryRange
  } = req.body;

  try {
    // Auth safety: Resolve company ID directly from authenticated user
    const userId = req.user.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User is not authenticated." });
    }

    const [profiles]: any = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    if (!profiles[0]) {
      return res.status(404).json({ success: false, message: "Company profile not found for authenticated user." });
    }

    const companyId = profiles[0].id;
    const companyStatus = profiles[0].status;

    if (companyStatus !== 'APPROVED') {
      return res.status(403).json({ success: false, message: "Only approved companies can post job opportunities." });
    }

    // Input Validation
    if (!title || typeof title !== "string" || !title.trim()) {
      return res.status(400).json({ success: false, message: "Job title is required." });
    }
    if (!description || typeof description !== "string" || !description.trim()) {
      return res.status(400).json({ success: false, message: "Job description is required." });
    }
    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({ success: false, message: "Job location is required." });
    }
    if (!deadline) {
      return res.status(400).json({ success: false, message: "Application end deadline is required." });
    }

    // Date validations
    const start = new Date(startDate || new Date().toISOString().split('T')[0]);
    const end = new Date(deadline);

    if (isNaN(start.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid application start date format." });
    }
    if (isNaN(end.getTime())) {
      return res.status(400).json({ success: false, message: "Invalid application end deadline format." });
    }
    if (end < start) {
      return res.status(400).json({ success: false, message: "Application end deadline cannot be before start date." });
    }

    const [result]: any = await db.query(`
      INSERT INTO jobs (
        company_id, title, description, skills_json, location, job_type,
        experience_level, salary_range, education_requirement, responsibilities,
        qualifications, additional_notes, application_start_date, deadline
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      companyId, title, description, JSON.stringify(skills || []), location, jobType || "Full-time",
      experienceLevel || "Entry Level", salaryRange || "", educationRequirement || "", responsibilities || "",
      qualifications || "", additionalNotes || "", startDate || new Date().toISOString().split('T')[0], deadline
    ]);

    const jobId = result.insertId;

    // Transaction safety & Manual cleanup of partial jobs if any stage insert fails
    try {
      if (stages && Array.isArray(stages)) {
        for (let i = 0; i < stages.length; i++) {
          const [stageResult]: any = await db.query(`
            INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order, description, config_json)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            jobId, 
            stages[i].name, 
            stages[i].type || 'APPLICATION',
            i + 1, 
            stages[i].description || "",
            JSON.stringify(stages[i].config || {})
          ]);

          const stageId = stageResult.insertId;

          // If stage is a test and has questions, insert them
          if (stages[i].type === 'TEST' && stages[i].questions) {
             for (const q of stages[i].questions) {
                await db.query(`
                  INSERT INTO test_questions (stage_id, question_text, options_json, correct_answer)
                  VALUES (?, ?, ?, ?)
                `, [stageId, q.text, JSON.stringify(q.options), q.correctAnswer]);
             }
          }
        }
      }
    } catch (stageError) {
      console.error("[JOB REQUISITION TRANSACTION FAILED] Reverting job id:", jobId, stageError);
      await db.query("DELETE FROM jobs WHERE id = ?", [jobId]);
      throw stageError;
    }

    res.json({ success: true, message: "Job opportunity published successfully", jobId });
  } catch (error: any) {
    console.error("Error posting job:", error);
    res.status(500).json({ success: false, message: error.message || "Internal server error occurred while posting job." });
  }
});

// Get current stage details for student
router.get("/application-status/:appId", async (req, res) => {
  try {
     const [apps]: any = await db.query(`
       SELECT JA.*, JS.stage_name, JS.stage_type, JS.config_json, JS.stage_order, JS.job_id
       FROM job_applications JA
       JOIN job_stages JS ON JA.current_stage_id = JS.id
       WHERE JA.id = ?
     `, [req.params.appId]);

     if (apps.length === 0) return res.status(404).json({ success: false, message: "Application not found" });
     const app = apps[0];

     let content: any = {};

     if (app.stage_type === 'TEST') {
        const [questions] = await db.query("SELECT id, question_text, options_json FROM test_questions WHERE stage_id = ?", [app.current_stage_id]);
        content.questions = questions;

        const testScheduleQuery = db.useMySQL ? `
          SELECT id, job_id, stage_id, DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, duration_minutes, cutoff_score, status
          FROM test_schedules 
          WHERE job_id = ? AND stage_id = ?
        ` : `
          SELECT id, job_id, stage_id, scheduled_at, duration_minutes, cutoff_score, status
          FROM test_schedules 
          WHERE job_id = ? AND stage_id = ?
        `;
        const [schedules]: any = await db.query(testScheduleQuery, [app.job_id, app.current_stage_id]);
        content.schedule = schedules[0] || null;
     } else if (app.stage_type.startsWith('INTERVIEW')) {
        const interviewScheduleQuery = db.useMySQL ? `
          SELECT id, application_id, stage_id, interview_type, location_or_link, DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, notes
          FROM interview_schedules 
          WHERE application_id = ? AND stage_id = ?
        ` : `
          SELECT id, application_id, stage_id, interview_type, location_or_link, scheduled_at, notes
          FROM interview_schedules 
          WHERE application_id = ? AND stage_id = ?
        `;
        const [schedules]: any = await db.query(interviewScheduleQuery, [app.id, app.current_stage_id]);
        content.schedule = schedules[0] || null;
     }

     res.json({ success: true, data: { ...app, content } });
  } catch (error) {
     res.status(500).json({ success: false, message: "Error fetching status" });
  }
});

// Bulk Actions for Applicants
router.post("/bulk-action", async (req, res) => {
  const { applicationIds, action, stageId, notes } = req.body;
  try {
    if (!applicationIds || !Array.isArray(applicationIds)) {
      return res.status(400).json({ success: false, message: "applicationIds must be an array" });
    }

    for (const appId of applicationIds) {
      let status = 'IN_PROGRESS';
      if (action === 'REJECTED') status = 'REJECTED';
      else if (action === 'SELECTED') status = 'SELECTED';

      await db.query(`
        UPDATE job_applications 
        SET current_stage_id = COALESCE(?, current_stage_id), status = ?
        WHERE id = ?
      `, [stageId || null, status, appId]);

      await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
        appId, stageId || null, action, notes || `Bulk action: ${action}`
      ]);

      // Notify student
      const [jobInfo]: any = await db.query(`
        SELECT J.title, JS.stage_name, SP.user_id
        FROM job_applications JA
        JOIN jobs J ON JA.job_id = J.id
        LEFT JOIN job_stages JS ON JA.current_stage_id = JS.id
        JOIN student_profiles SP ON JA.student_id = SP.id
        WHERE JA.id = ?
      `, [appId]);

      if (jobInfo.length > 0) {
        const info = jobInfo[0];
        let title = "Application Update";
        let message = `Your application for ${info.title} has an update.`;
        
        if (action === 'REJECTED') {
          title = "Application Status";
          message = `Your application for ${info.title} has been rejected.`;
        } else if (stageId) {
          message = `Your application for ${info.title} has been moved to ${info.stage_name || 'next stage'}.`;
        }

        await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
          info.user_id, title, message, action === 'REJECTED' ? 'REJECT' : 'INFO'
        ]);
      }
    }

    res.json({ success: true, message: `Bulk action ${action} completed for ${applicationIds.length} applicants` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Bulk action failed" });
  }
});

// Schedule Bulk Test for Selected Candidates
router.post("/schedule-test-bulk", async (req, res) => {
  const { applicationIds, scheduledAt, durationMinutes, cutoffScore } = req.body;
  try {
    if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
      return res.status(400).json({ success: false, message: "Invalid application list" });
    }

    // Since we need a stageId to attach the test to, we find the first application's current stage and job
    const [appsInfo]: any = await db.query(`
       SELECT job_id, current_stage_id FROM job_applications WHERE id = ?
    `, [applicationIds[0]]);
    
    if (appsInfo.length === 0) {
       return res.status(404).json({ success: false, message: "Application not found" });
    }

    const { job_id: jobId, current_stage_id: stageId } = appsInfo[0];

    // Clear existing schedule for this stage to override
    await db.query("DELETE FROM test_schedules WHERE job_id = ? AND stage_id = ?", [jobId, stageId]);
    
    // Create new global test schedule for this stage
    const [result]: any = await db.query(`
      INSERT INTO test_schedules (job_id, stage_id, scheduled_at, duration_minutes, cutoff_score)
      VALUES (?, ?, ?, ?, ?)
    `, [jobId, stageId, scheduledAt, durationMinutes, cutoffScore]);
    
    const placeholders = applicationIds.map(() => '?').join(',');

    // Notify only selected users
    const [applicants]: any = await db.query(`
      SELECT SP.user_id, J.title 
      FROM job_applications JA
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN jobs J ON JA.job_id = J.id
      WHERE JA.id IN (${placeholders})
    `, [...applicationIds]);

    for (const applicant of applicants) {
      await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
        applicant.user_id, 
        "Test Scheduled", 
        `Action Required: Official technical assessment for ${applicant.title} scheduled on ${scheduledAt.replace('T', ' ')}.`, 
        "WARNING"
      ]);
    }
    
    // Auto-Move selected applicants to TESTING stage if they aren't there yet
    for (const appId of applicationIds) {
      await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
        appId, stageId, 'INFO', `Bulk Test Scheduled: ${durationMinutes} mins at ${scheduledAt.replace('T', ' ')}`
      ]);
    }

    res.json({ success: true, message: "Tests scheduled successfully for all selected applicants." });
  } catch (error) {
    console.error("Bulk schedule error:", error);
    res.status(500).json({ success: false, message: "Failed to schedule test" });
  }
});

// Schedule Automated Test
router.post("/schedule-test", async (req, res) => {
  const { jobId, stageId, scheduledAt, durationMinutes, cutoffScore } = req.body;
  try {
    // Delete existing schedule for this stage if any
    await db.query("DELETE FROM test_schedules WHERE job_id = ? AND stage_id = ?", [jobId, stageId]);
    
    const [result]: any = await db.query(`
      INSERT INTO test_schedules (job_id, stage_id, scheduled_at, duration_minutes, cutoff_score)
      VALUES (?, ?, ?, ?, ?)
    `, [jobId, stageId, scheduledAt, durationMinutes, cutoffScore]);

    // Notify ALL applicants in this stage
    const [applicants]: any = await db.query(`
      SELECT SP.user_id, J.title 
      FROM job_applications JA
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN jobs J ON JA.job_id = J.id
      WHERE JA.job_id = ? AND JA.current_stage_id = ?
    `, [jobId, stageId]);

    for (const applicant of applicants) {
      await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
        applicant.user_id, 
        "Test Scheduled", 
        `An automated test for ${applicant.title} has been scheduled for ${scheduledAt.replace('T', ' ')}.`, 
        "WARNING"
      ]);
    }

    res.json({ success: true, message: "Test scheduled successfully", scheduleId: result.insertId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to schedule test" });
  }
});

// Get test schedule for job
router.get("/test-schedules/:jobId", async (req, res) => {
  try {
    const testSchedulesQuery = db.useMySQL ? `
      SELECT id, job_id, stage_id, DATE_FORMAT(scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, duration_minutes, cutoff_score, status, created_at
      FROM test_schedules 
      WHERE job_id = ?
    ` : `
      SELECT id, job_id, stage_id, scheduled_at, duration_minutes, cutoff_score, status, created_at
      FROM test_schedules 
      WHERE job_id = ?
    `;
    const [schedules] = await db.query(testSchedulesQuery, [req.params.jobId]);
    res.json({ success: true, data: schedules });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching schedules" });
  }
});

// Get active/upcoming tests for student
router.get("/student/active-tests/:studentId", async (req, res) => {
  try {
    const activeTestsQuery = db.useMySQL ? `
      SELECT TS.id, TS.job_id, TS.stage_id, DATE_FORMAT(TS.scheduled_at, '%Y-%m-%d %H:%i:%s') as scheduled_at, 
             TS.duration_minutes, TS.cutoff_score, TS.status, J.title as job_title, JS.stage_name
      FROM test_schedules TS
      JOIN jobs J ON TS.job_id = J.id
      JOIN job_stages JS ON TS.stage_id = JS.id
      JOIN job_applications JA ON JA.job_id = J.id AND JA.current_stage_id = TS.stage_id
      WHERE JA.student_id = ? AND TS.status != 'COMPLETED'
    ` : `
      SELECT TS.id, TS.job_id, TS.stage_id, TS.scheduled_at, 
             TS.duration_minutes, TS.cutoff_score, TS.status, J.title as job_title, JS.stage_name
      FROM test_schedules TS
      JOIN jobs J ON TS.job_id = J.id
      JOIN job_stages JS ON TS.stage_id = JS.id
      JOIN job_applications JA ON JA.job_id = J.id AND JA.current_stage_id = TS.stage_id
      WHERE JA.student_id = ? AND TS.status != 'COMPLETED'
    `;
    const [tests] = await db.query(activeTestsQuery, [req.params.studentId]);
    res.json({ success: true, data: tests });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching active tests" });
  }
});

// Submit Test with Anti-cheating
router.post("/applications/submit-test", async (req, res) => {
  const { applicationId, stageId, answers, tabSwitches, violationCount, isAutoSubmitted } = req.body;
  try {
     const [questions]: any = await db.query("SELECT * FROM test_questions WHERE stage_id = ?", [stageId]);
     let correctCount = 0;
     
     questions.forEach((q: any) => {
        if (answers[q.id] === q.correct_answer) correctCount++;
     });

     const score = questions.length > 0 ? (correctCount / questions.length) * 100 : 0;
     
     // Get applicant info
     const [apps]: any = await db.query("SELECT * FROM job_applications WHERE id = ?", [applicationId]);
     if (apps.length === 0) throw new Error("Application not found");
     const app = apps[0];

     // Record submission
     await db.query(`
       INSERT INTO test_submissions (application_id, student_id, stage_id, answers_json, score, tab_switches, violation_count, is_auto_submitted)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     `, [applicationId, app.student_id, stageId, JSON.stringify(answers), score, tabSwitches || 0, violationCount || 0, isAutoSubmitted ? 1 : 0]);

     // Auto progress logic
     const [schedules]: any = await db.query("SELECT cutoff_score FROM test_schedules WHERE job_id = ? AND stage_id = ?", [app.job_id, stageId]);
     const [jobStages]: any = await db.query("SELECT config_json FROM job_stages WHERE id = ?", [stageId]);
     const config = jobStages[0].config_json ? (typeof jobStages[0].config_json === 'string' ? JSON.parse(jobStages[0].config_json) : jobStages[0].config_json) : {};
     
     const passScore = schedules.length > 0 ? schedules[0].cutoff_score : (config.passScore || 60);

     if (score >= passScore && (violationCount || 0) < 5) {
        // Move to next stage
        const [nextStages]: any = await db.query(`
          SELECT id, stage_name FROM job_stages 
          WHERE job_id = (SELECT job_id FROM job_stages WHERE id = ?) 
          AND stage_order > (SELECT stage_order FROM job_stages WHERE id = ?)
          ORDER BY stage_order ASC LIMIT 1
        `, [stageId, stageId]);

        if (nextStages.length > 0) {
           await db.query("UPDATE job_applications SET current_stage_id = ? WHERE id = ?", [nextStages[0].id, applicationId]);
           await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
              applicationId, nextStages[0].id, 'MOVED', `Auto-passed test with score ${Math.round(score)}%`
           ]);
        } else {
           await db.query("UPDATE job_applications SET status = 'SELECTED' WHERE id = ?", [applicationId]);
        }
     } else {
        await db.query("UPDATE job_applications SET status = 'REJECTED' WHERE id = ?", [applicationId]);
        const reason = (violationCount || 0) >= 5 ? 'Cheating detected' : `Failed test with score ${Math.round(score)}%`;
        await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
           applicationId, stageId, 'REJECTED', reason
        ]);
     }

     res.json({ success: true, score, passed: score >= passScore && (violationCount || 0) < 5 });
  } catch (error) {
     console.error(error);
     res.status(500).json({ success: false, message: "Error submitting test" });
  }
});

// Schedule Interview
router.post("/applications/schedule-interview", async (req, res) => {
  let { applicationId, stageId, interviewType, locationOrLink, scheduledAt, notes } = req.body;
  const appId = Number(applicationId);
  let stgId = Number(stageId);
  try {
     // Verify the application exists and get its job_id
     const [apps]: any = await db.query("SELECT job_id, current_stage_id FROM job_applications WHERE id = ?", [appId]);
     if (apps.length === 0) {
        return res.status(404).json({ success: false, message: "Application not found" });
     }
     const jobId = apps[0].job_id;

     // Ensure stageId is valid
     const [stages]: any = await db.query("SELECT id FROM job_stages WHERE id = ?", [stgId]);
     if (stages.length === 0) {
        // Find any existing stage for this job
        const [jobStages]: any = await db.query("SELECT id FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC LIMIT 1", [jobId]);
        if (jobStages.length > 0) {
           stgId = Number(jobStages[0].id);
        } else {
           // Create a default stage
           const [newStage]: any = await db.query(
             "INSERT INTO job_stages (job_id, stage_name, stage_type, stage_order) VALUES (?, 'Interview', 'INTERVIEW', 1)",
             [jobId]
           );
           stgId = Number((newStage.insertId !== undefined) ? newStage.insertId : newStage[0]?.insertId);
           // Update application to this stage
           await db.query("UPDATE job_applications SET current_stage_id = ? WHERE id = ?", [stgId, appId]);
        }
     }

     let formattedScheduledAt = null;
     if (scheduledAt) {
        try {
           formattedScheduledAt = new Date(scheduledAt).toISOString().slice(0, 19).replace('T', ' ');
        } catch (e) {
           return res.status(400).json({ success: false, message: "Invalid scheduled date format" });
        }
     }

     const durationVal = req.body.duration ? Number(req.body.duration) : 30;
     const interviewerNameVal = req.body.interviewerName || "Staff Recruiter";
     const instructionsVal = req.body.instructions || notes || "Please join the room on time.";

     const [existing]: any = await db.query("SELECT id FROM interview_schedules WHERE application_id = ? AND stage_id = ?", [appId, stgId]);
     
     if (existing.length > 0) {
        await db.query(`
          UPDATE interview_schedules 
          SET interview_type = ?, location_or_link = ?, scheduled_at = ?, notes = ?, duration = ?, interviewer_name = ?, instructions = ?
          WHERE application_id = ? AND stage_id = ?
        `, [interviewType, locationOrLink, formattedScheduledAt, notes, durationVal, interviewerNameVal, instructionsVal, appId, stgId]);
     } else {
        await db.query(`
          INSERT INTO interview_schedules (application_id, stage_id, interview_type, location_or_link, scheduled_at, notes, duration, interviewer_name, instructions)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [appId, stgId, interviewType, locationOrLink, formattedScheduledAt, notes, durationVal, interviewerNameVal, instructionsVal]);
     }

     // Automatically send Notification / In-App notification / Alert
     try {
        const [studentInfo]: any = await db.query("SELECT user_id, full_name FROM student_profiles WHERE id = (SELECT student_id FROM job_applications WHERE id = ?)", [appId]);
        if (studentInfo && studentInfo.length > 0) {
           const studentUserId = studentInfo[0].user_id;
           const notificationMsg = `An interview of type: ${interviewType} has been scheduled for ${scheduledAt} with duration ${durationVal} mins. Interviewer: ${interviewerNameVal}. Instructions: ${instructionsVal}`;
           await db.query("INSERT INTO notifications (user_id, title, message, is_read) VALUES (?, 'Interview Scheduled', ?, 0)", [studentUserId, notificationMsg]);
        }
     } catch (e) {
        console.warn("Failed to notify student of scheduled interview:", e);
     }

     res.json({ success: true, message: "Interview scheduled" });
  } catch (error) {
     console.error("Schedule error:", error);
     res.status(500).json({ success: false, message: "Failed to schedule interview", error: (error as Error).message });
  }
});

// Apply to job
router.post("/apply", async (req, res) => {
  const { studentId, jobId } = req.body;
  console.log(`Apply request: studentId=${studentId}, jobId=${jobId}`);
  
  try {
    if (!studentId || !jobId) {
       return res.status(400).json({ success: false, message: "Missing required fields: Student ID and Job ID." });
    }

    // Check job exists and its status
    const [jobs]: any = await db.query("SELECT deadline, status, title FROM jobs WHERE id = ?", [jobId]);
    if (jobs.length === 0) return res.status(404).json({ success: false, message: "Job position not found." });
    
    if (jobs[0].status !== 'OPEN') {
      return res.status(400).json({ success: false, message: "This hiring process is currently closed." });
    }

    // Check job deadline
    if (jobs[0].deadline) {
      const deadline = new Date(jobs[0].deadline);
      deadline.setHours(23, 59, 59, 999);
      if (deadline < new Date()) {
        return res.status(400).json({ success: false, message: "The application deadline for this position has passed." });
      }
    }

    // Check student profile completeness and resume
    const [profiles]: any = await db.query("SELECT completeness_score, resume_url, user_id FROM student_profiles WHERE id = ?", [studentId]);
    if (profiles.length === 0) {
       return res.status(404).json({ success: false, message: "Student profile record not found." });
    }
    
    const profile = profiles[0];

    // Mandatory Psychometric Check
    const [psychResults]: any = await db.query("SELECT id FROM psychometric_results WHERE user_id = ?", [profile.user_id]);
    if (psychResults.length === 0) {
      return res.status(403).json({ 
        success: false, 
        message: "Mandatory Assessment Required: Please complete the Psychometric Assessment on your dashboard before applying to jobs." 
      });
    }

    if ((profile.completeness_score || 0) < 70) {
      return res.status(403).json({ 
        success: false, 
        message: `Profile incomplete (${profile.completeness_score || 0}%). You need at least 70% completeness to enable "Apply Now".` 
      });
    }

    if (!profile.resume_url) {
      return res.status(403).json({ 
        success: false, 
        message: "No resume found. Please upload a PDF resume in your profile before applying." 
      });
    }

    // Get initial stage
    const [stages]: any = await db.query("SELECT id FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC LIMIT 1", [jobId]);
    const firstStageId = stages.length > 0 ? stages[0].id : null;

    // Create application
    const [appResult]: any = await db.query(
      "INSERT INTO job_applications (student_id, job_id, current_stage_id, status) VALUES (?, ?, ?, ?)", 
      [studentId, jobId, firstStageId, 'APPLIED']
    );
    
    const applicationId = appResult.insertId;

    // Record in history
    await db.query(
      "INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", 
      [applicationId, firstStageId, 'APPLIED', 'Application submitted via TalentBridge portal']
    );

    // Notify student
    await db.query(
      "INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", 
      [profile.user_id, "Application Successful", `Your application for ${jobs[0].title} has been received.`, "INFO"]
    );

    res.json({ success: true, message: "Application submitted successfully", applicationId });
  } catch (error: any) {
    console.error("Apply error:", error);
    
    // Check for duplicate application
    const errorMsg = error.message || String(error);
    if (error.code === 'ER_DUP_ENTRY' || errorMsg.includes('UNIQUE') || error.code === 'SQLITE_CONSTRAINT') {
       return res.status(400).json({ success: false, message: "You have already applied for this position." });
    }
    
    res.status(500).json({ success: false, message: "A server error occurred while processing your application." });
  }
});

// Get full application timeline
router.get("/application/:appId/timeline", async (req, res) => {
  try {
    const [apps]: any = await db.query(`
      SELECT JA.*, J.id as job_id
      FROM job_applications JA
      JOIN jobs J ON JA.job_id = J.id
      WHERE JA.id = ?
    `, [req.params.appId]);

    if (apps.length === 0) return res.status(404).json({ success: false, message: "Application not found" });
    const app = apps[0];

    const [stages]: any = await db.query(`
      SELECT id, stage_name, stage_order, stage_type
      FROM job_stages
      WHERE job_id = ?
      ORDER BY stage_order ASC
    `, [app.job_id]);

    const [history]: any = await db.query(`
      SELECT stage_id, action, created_at, notes
      FROM application_history
      WHERE application_id = ?
      ORDER BY created_at ASC
    `, [req.params.appId]);

    res.json({ success: true, data: { application: app, stages, history } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching timeline" });
  }
});

// Get application history
router.get("/applications/history/:appId", async (req, res) => {
  try {
    const [history] = await db.query(`
      SELECT AH.*, JS.stage_name
      FROM application_history AH
      LEFT JOIN job_stages JS ON AH.stage_id = JS.id
      WHERE AH.application_id = ?
      ORDER BY AH.created_at DESC
    `, [req.params.appId]);
    res.json({ success: true, data: history });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching history" });
  }
});

// Update applicant stage
router.post("/update-stage", async (req, res) => {
  const { applicationId, stageId, action, notes } = req.body;
  try {
    // Verify application
    const [apps]: any = await db.query("SELECT * FROM job_applications WHERE id = ?", [applicationId]);
    if (apps.length === 0) return res.status(404).json({ success: false, message: "Application not found" });
    
    let status = apps[0].status;
    if (action === 'REJECTED') {
      status = 'REJECTED';
    } else if (action === 'SELECTED') {
      status = 'SELECTED';
    } else {
      status = 'IN_PROGRESS';
    }

    await db.query(`
      UPDATE job_applications 
      SET current_stage_id = ?, status = ?
      WHERE id = ?
    `, [stageId, status, applicationId]);

    await db.query("INSERT INTO application_history (application_id, stage_id, action, notes) VALUES (?, ?, ?, ?)", [
      applicationId, stageId, action, notes
    ]);

    // Notify student
    const [jobInfo]: any = await db.query(`
      SELECT J.title, JS.stage_name, SP.user_id, SP.full_name, U.email
      FROM job_applications JA
      JOIN jobs J ON JA.job_id = J.id
      LEFT JOIN job_stages JS ON JA.current_stage_id = JS.id
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN users U ON SP.user_id = U.id
      WHERE JA.id = ?
    `, [applicationId]);

    if (jobInfo.length > 0) {
      const info = jobInfo[0];
      const stageName = info.stage_name || "Assessment/Next Phase";
      let title = "Application Update";
      let message = `Your application for ${info.title} has been moved to ${stageName}.`;
      
      if (action === 'REJECTED') {
        title = "Application Status: Rejected";
        message = `We regret to inform you that your application for ${info.title} has been rejected.`;
      } else if (status === 'SELECTED') {
        title = "Congratulations!";
        message = `You have been selected for ${info.title}! Check your email for next steps.`;
      }

      await db.query("INSERT INTO notifications (user_id, title, message, type) VALUES (?, ?, ?, ?)", [
        info.user_id, title, message, action === 'REJECTED' ? 'REJECT' : status === 'SELECTED' ? 'SUCCESS' : 'INFO'
      ]);

      // Send email to student asynchronously
      if (info.email) {
        let emailSubject = `Application Update: Moved to ${stageName}`;
        let emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #2b6cb0; margin-bottom: 20px;">TalentBridge Application Update</h2>
            <p>Hello ${info.full_name || 'Student'},</p>
            <p>Your application for the position of <strong>${info.title}</strong> has been updated.</p>
            <p>Current Stage: <strong>${stageName}</strong></p>
            <p>Please log in to the TalentBridge student portal to check your updated status and see if there are any pending assessments or interview schedules.</p>
            <div style="margin: 30px 0; text-align: center;">
              <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Portal</a>
            </div>
            <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
              This is an automated message from TalentBridge. Please do not reply to this email.
            </p>
          </div>
        `;

        if (action === 'REJECTED') {
          emailSubject = `Application Status Update: ${info.title}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #e53e3e; margin-bottom: 20px;">TalentBridge Application Status Update</h2>
              <p>Hello ${info.full_name || 'Student'},</p>
              <p>We regret to inform you that your application for the position of <strong>${info.title}</strong> has been updated to <strong>REJECTED</strong>.</p>
              <p>Thank you for your interest in TalentBridge and for taking the time to apply and participate in our process. We wish you the best of luck in your job search.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="background-color: #3182ce; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Portal</a>
              </div>
              <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                This is an automated message from TalentBridge. Please do not reply to this email.
              </p>
            </div>
          `;
        } else if (status === 'SELECTED') {
          emailSubject = `Congratulations! Selected for ${info.title}`;
          emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #38a169; margin-bottom: 20px;">Congratulations!</h2>
              <p>Hello ${info.full_name || 'Student'},</p>
              <p>We are thrilled to inform you that you have been <strong>SELECTED</strong> for the position of <strong>${info.title}</strong>!</p>
              <p>Our team will reach out to you shortly with details regarding onboarding, documentation, and the final steps. In the meantime, you can review your application history in the portal.</p>
              <div style="margin: 30px 0; text-align: center;">
                <a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="background-color: #38a169; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Go to Student Portal</a>
              </div>
              <p style="color: #718096; font-size: 12px; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
                This is an automated message from TalentBridge. Please do not reply to this email.
              </p>
            </div>
          `;
        }

        sendEmail(info.email, emailSubject, emailHtml).catch(err => {
          console.error("Async email sending failed:", err.message);
        });
      }
    }

    res.json({ success: true, message: "Stage updated" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update stage" });
  }
});

// Get full student details for an application
router.get("/student-full-details/:studentId", async (req, res) => {
  const { studentId } = req.params;
  try {
    // Try to find by student_profile ID first, then by user_id
    const [profile]: any = await db.query(`
      SELECT sp.*, u.email, ts.overall_score as talent_score, ts.breakdown_json
      FROM student_profiles sp
      JOIN users u ON sp.user_id = u.id
      LEFT JOIN talent_scores ts ON u.id = ts.user_id
      WHERE sp.id = ? OR sp.user_id = ?
    `, [studentId, studentId]);

    if (profile.length === 0) return res.status(404).json({ success: false, message: "Student profile not found" });

    const actualStudentId = profile[0].id;

    const [mockInterviews]: any = await db.query(`
      SELECT * 
      FROM interview_history 
      WHERE student_id = ? 
      ORDER BY created_at DESC
    `, [actualStudentId]);

    const [education]: any = await db.query("SELECT * FROM student_education WHERE student_id = ? ORDER BY start_date DESC", [actualStudentId]);
    const [experience]: any = await db.query("SELECT * FROM student_experience WHERE student_id = ? ORDER BY start_date DESC", [actualStudentId]);
    const [projects]: any = await db.query("SELECT * FROM student_projects WHERE student_id = ? ORDER BY created_at DESC", [actualStudentId]);
    const [extracurriculars]: any = await db.query("SELECT * FROM extracurricular_activities WHERE user_id = ? ORDER BY activity_date DESC", [profile[0].user_id]);

    res.json({
      success: true,
      data: {
        profile: profile[0],
        mockInterviews,
        education,
        experience,
        projects,
        extracurriculars
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching student full details" });
  }
});

// Get applicants for a job (Kanban View Data)
router.get("/applicants/:jobId", async (req, res) => {
  try {
    const [applicants]: any = await db.query(`
      SELECT 
        JA.id as application_id,
        JA.status,
        JA.applied_at,
        JA.current_stage_id,
        JA.job_id as job_id,
        SP.id as student_id,
        U.id as user_id,
        SP.full_name,
        U.email,
        SP.resume_url,
        SP.skills_json,
        SP.profile_photo_url,
        TS.overall_score as talent_score,
        PR.overall_score as psychometric_score,
        PR.traits_json as psychometric_traits,
        PR.personality_type as psychometric_personality,
        (SELECT score FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_score,
        (SELECT violation_count FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_violations,
        (SELECT is_auto_submitted FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_auto_submitted,
        (SELECT answers_json FROM test_submissions WHERE application_id = JA.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_answers,
        SPS.avg_interview_score
      FROM job_applications JA
      JOIN student_profiles SP ON JA.student_id = SP.id
      JOIN users U ON SP.user_id = U.id
      LEFT JOIN talent_scores TS ON U.id = TS.user_id
      LEFT JOIN psychometric_results PR ON U.id = PR.user_id
      LEFT JOIN student_performance_stats SPS ON U.id = SPS.user_id
      WHERE JA.job_id = ?
    `, [req.params.jobId]);

    const [stages] = await db.query("SELECT * FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC", [req.params.jobId]);

    res.json({ success: true, data: { applicants, stages } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching applicants" });
  }
});

// Get student's applications
router.get("/student/:studentId", async (req, res) => {
  try {
    const [applications] = await db.query(`
      SELECT 
        JA.*, 
        J.title, J.deadline, J.job_type,
        CP.company_name, CP.logo_url,
        JS.stage_name as current_stage_name
      FROM job_applications JA
      JOIN jobs J ON JA.job_id = J.id
      JOIN company_profiles CP ON J.company_id = CP.id
      LEFT JOIN job_stages JS ON JA.current_stage_id = JS.id
      WHERE JA.student_id = ?
      ORDER BY JA.applied_at DESC
    `, [req.params.studentId]);
    res.json({ success: true, data: applications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching applications" });
  }
});

// Get single job details including stages
router.get("/:id", async (req, res) => {
  try {
    const [jobs]: any = await db.query(`
      SELECT J.*, C.company_name, C.logo_url 
      FROM jobs J 
      JOIN company_profiles C ON J.company_id = C.id 
      WHERE J.id = ?
    `, [req.params.id]);
    
    if (jobs.length === 0) return res.status(404).json({ success: false, message: "Job not found" });

    const [stages] = await db.query("SELECT * FROM job_stages WHERE job_id = ? ORDER BY stage_order ASC", [req.params.id]);
    
    res.json({ success: true, data: { ...jobs[0], stages } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching job details" });
  }
});

export default router;

