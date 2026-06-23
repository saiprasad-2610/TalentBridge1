import express from "express";
import db from "../db.ts";
import { logProfileView, updateDailyTask, calculateTalentScore, updateLoginStreak } from "../services/analyticsService.ts";

const router = express.Router();

// Daily Check-in
router.post("/check-in", async (req, res) => {
  const { userId } = req.body;
  try {
    const { XPService } = await import("../services/xpService.ts");
    
    // 1. Mark as completed in daily tasks for analytics
    await updateDailyTask(userId, 'CHECK_IN');
    
    // 2. Use XPService to handle the transaction, streak and xp balance
    const xpResult = await XPService.claimDailyReward(userId);
    
    res.json({ 
      success: true, 
      message: `Check-in successful! +${xpResult.rewardAmount} XP`,
      ...xpResult
    });
  } catch (error: any) {
    res.status(400).json({ success: false, message: error.message || "Check-in failed" });
  }
});

// GET Student Analytics
router.get("/student/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    await updateLoginStreak(Number(userId));
    
    // Recalculate score on fetch to ensure dynamic updates for the user
    await calculateTalentScore(Number(userId));

    const [stats]: any = await db.query(`
      SELECT sps.*, u.xp_balance, u.total_earned_xp, u.login_streak 
      FROM users u
      LEFT JOIN student_performance_stats sps ON sps.user_id = u.id
      WHERE u.id = ?
    `, [userId]);
    const [talent]: any = await db.query("SELECT * FROM talent_scores WHERE user_id = ?", [userId]);
    const [tasks]: any = await db.query("SELECT * FROM daily_tasks WHERE user_id = ? AND task_date = CURRENT_DATE", [userId]);
    const [badges]: any = await db.query("SELECT * FROM user_badges WHERE user_id = ?", [userId]);
    const [views]: any = await db.query(`
      SELECT COUNT(*) as view_count 
      FROM profile_views pv 
      JOIN student_profiles sp ON pv.student_id = sp.id 
      WHERE sp.user_id = ?
    `, [userId]);

    const [interviewHistory]: any = await db.query(`
      SELECT score, created_at 
      FROM interview_history ih
      JOIN student_profiles sp ON ih.student_id = sp.id
      WHERE sp.user_id = ?
      ORDER BY created_at ASC
      LIMIT 10
    `, [userId]);

    const { XPService } = await import("../services/xpService.ts");
    const systemConfigs = await XPService.getConfigs();

    res.json({
      success: true,
      data: {
        performance: stats[0] || {},
        talentScore: talent[0] || { overall_score: 0, breakdown_json: {} },
        dailyTasks: tasks[0] || { is_check_in_completed: 0, is_interview_completed: 0, is_profile_updated: 0 },
        badges: badges || [],
        totalViews: views[0]?.view_count || 0,
        interviewTrend: interviewHistory || [],
        dailyRewardBase: systemConfigs.DAILY_REWARD_BASE || 50,
        streakBonusStep: systemConfigs.STREAK_BONUS_STEP || 10
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching student analytics", error: String(error) });
  }
});

// GET Student Applications
router.get("/student/:userId/applications", async (req, res) => {
  const { userId } = req.params;
  try {
    const [apps]: any = await db.query(`
      SELECT 
        ja.id, ja.status, ja.applied_at,
        j.title as job_title, j.id as job_id, j.deadline, j.job_type,
        cp.company_name,
        js.stage_name as current_stage_name,
        js.stage_type
      FROM job_applications ja
      JOIN jobs j ON ja.job_id = j.id
      JOIN company_profiles cp ON j.company_id = cp.id
      JOIN student_profiles sp ON ja.student_id = sp.id
      LEFT JOIN job_stages js ON ja.current_stage_id = js.id
      WHERE sp.user_id = ?
      ORDER BY ja.applied_at DESC
    `, [userId]);

    res.json({ success: true, data: apps });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching applications" });
  }
});

// GET Student Check-ins
router.get("/student/:userId/check-ins", async (req, res) => {
  const { userId } = req.params;
  try {
    const [checkins]: any = await db.query(`
      SELECT task_date 
      FROM daily_tasks 
      WHERE user_id = ? AND is_check_in_completed = 1
    `, [userId]);
    res.json({ success: true, data: checkins });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Error fetching check-ins" });
  }
});

// GET Employer Analytics & Candidates
router.get("/employer/:companyUserId", async (req, res) => {
  const { companyUserId } = req.params;
  try {
    const [company]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [companyUserId]);
    if (!company[0]) {
      return res.json({
        success: true,
        data: {
          stats: { totalJobs: 0, totalApps: 0, totalHires: 0, totalViews: 0 },
          applicants: []
        }
      });
    }

    const companyId = company[0].id;

    // Get stats
    const [jobsCount]: any = await db.query("SELECT COUNT(*) as totalJobs FROM jobs WHERE company_id = ?", [companyId]);
    const [appsCount]: any = await db.query("SELECT COUNT(*) as totalApps FROM job_applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = ?", [companyId]);
    const [hiresCount]: any = await db.query("SELECT COUNT(*) as totalHires FROM job_applications a JOIN jobs j ON a.job_id = j.id WHERE j.company_id = ? AND a.status = 'SELECTED'", [companyId]);
    const [viewsCount]: any = await db.query("SELECT COUNT(*) as totalViews FROM profile_views WHERE company_id = ?", [companyId]);

    const totalJobs = jobsCount[0]?.totalJobs || 0;
    const totalApps = appsCount[0]?.totalApps || 0;
    const totalHires = hiresCount[0]?.totalHires || 0;
    const totalViews = viewsCount[0]?.totalViews || 0;

    // Get candidates applied to this company's jobs
    const [applicants]: any = await db.query(`
      SELECT 
        sp.*, 
        sp.id as student_id,
        u.email as email,
        ts.overall_score as talent_score, ts.breakdown_json,
        a.status,
        a.id as application_id,
        a.current_stage_id,
        a.applied_at,
        j.title as job_title,
        sps.avg_interview_score,
        (SELECT score FROM test_submissions WHERE application_id = a.id ORDER BY submitted_at DESC LIMIT 1) as latest_test_score
      FROM job_applications a
      JOIN student_profiles sp ON a.student_id = sp.id
      JOIN users u ON sp.user_id = u.id
      JOIN jobs j ON a.job_id = j.id
      LEFT JOIN talent_scores ts ON sp.user_id = ts.user_id
      LEFT JOIN student_performance_stats sps ON sp.user_id = sps.user_id
      WHERE j.company_id = ?
      ORDER BY a.applied_at DESC
    `, [companyId]);

    // Get Application Trend (last 7 days)
    const trendQuery = db.useMySQL ? `
      SELECT 
        DATE_FORMAT(a.applied_at, '%a') as name,
        COUNT(*) as apps
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = ? AND a.applied_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
      GROUP BY DATE(a.applied_at), name
      ORDER BY DATE(a.applied_at) ASC
    ` : `
      SELECT 
        CASE strftime('%w', a.applied_at)
          WHEN '0' THEN 'Sun' WHEN '1' THEN 'Mon' WHEN '2' THEN 'Tue'
          WHEN '3' THEN 'Wed' WHEN '4' THEN 'Thu' WHEN '5' THEN 'Fri'
          WHEN '6' THEN 'Sat'
        END as name,
        COUNT(*) as apps
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = ? AND a.applied_at >= date('now', '-7 days')
      GROUP BY date(a.applied_at), name
      ORDER BY date(a.applied_at) ASC
    `;

    const [trend]: any = await db.query(trendQuery, [companyId]);

    // Get Funnel Data
    const [funnel]: any = await db.query(`
      SELECT 
        a.status as name,
        COUNT(*) as value
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE j.company_id = ?
      GROUP BY a.status
    `, [companyId]);

    // Map status to funnel names
    const funnelMap: any = {
      'APPLIED': 'Applied',
      'TESTING': 'Test',
      'INTERVIEW': 'Interview',
      'SHORTLISTED': 'HR Round',
      'SELECTED': 'Hired'
    };
    const mappedFunnel = funnel.map((f: any) => ({
      name: funnelMap[f.name] || f.name,
      value: f.value
    }));

    // Get Top Skills in Demand (from company's own jobs)
    const [jobs]: any = await db.query("SELECT skills_json FROM jobs WHERE company_id = ?", [companyId]);
    const skillCounts: any = {};
    jobs.forEach((j: any) => {
      try {
        const skills = typeof j.skills_json === 'string' ? JSON.parse(j.skills_json) : (j.skills_json || []);
        skills.forEach((s: string) => {
          skillCounts[s] = (skillCounts[s] || 0) + 1;
        });
      } catch (e) {}
    });
    const skillData = Object.entries(skillCounts)
      .map(([name, count]) => ({ name, count: count as number }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get Actual Rejections
    const [rejections]: any = await db.query(`
      SELECT 
        COALESCE(ah.notes, 'Other') as reason,
        COUNT(*) as count
      FROM job_applications a
      JOIN jobs j ON a.job_id = j.id
      JOIN application_history ah ON a.id = ah.application_id
      WHERE j.company_id = ? AND ah.action = 'REJECTED'
      GROUP BY reason
    `, [companyId]);

    const rejectionData = rejections.length > 0 
      ? rejections.map((r: any) => {
          // Normalize reasons
          let name = 'Other';
          const lowerRes = r.reason.toLowerCase();
          if (lowerRes.includes('skill') || lowerRes.includes('test')) name = 'Skill Mismatch';
          else if (lowerRes.includes('experience') || lowerRes.includes('exp')) name = 'Exp. Level';
          else if (lowerRes.includes('culture') || lowerRes.includes('fit') || lowerRes.includes('interview')) name = 'Culture Fit';
          
          return { name, value: r.count };
        }).reduce((acc: any[], curr: any) => {
          const existing = acc.find(x => x.name === curr.name);
          if (existing) existing.value += curr.value;
          else acc.push(curr);
          return acc;
        }, [])
      : [ { name: 'No Rejections Yet', value: 1 } ];

    res.json({
      success: true,
      data: {
        stats: {
          totalJobs,
          totalApps,
          totalHires,
          totalViews,
          applicationRate: totalApps > 0 ? ((totalApps / (totalViews || 1)) * 100).toFixed(1) + '%' : '0%',
          avgTimeToHire: '14 Days', // Placeholder or calculate if data exists
          interviewSuccess: totalApps > 0 ? ((totalHires / totalApps) * 100).toFixed(1) + '%' : '0%'
        },
        trendData: trend,
        funnelData: mappedFunnel,
        skillData: skillData,
        rejectionData,
        applicants
      }
    });
  } catch (error) {
    console.error("Employer Analytics Error:", error);
    res.status(500).json({ success: false, message: "Error fetching employer analytics", error: String(error) });
  }
});

// LOG Profile View
router.post("/profile-view", async (req, res) => {
  const { studentUserId, companyUserId } = req.body;
  try {
    await logProfileView(studentUserId, companyUserId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false });
  }
});

// GET Company Interviews
router.get("/employer/:companyUserId/interviews", async (req, res) => {
  const { companyUserId } = req.params;
  try {
    const [company]: any = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [companyUserId]);
    if (!company[0]) {
      return res.json({ success: true, data: [] });
    }
    const companyId = company[0].id;

    const interviewQuery = db.useMySQL ? `
      SELECT 
        i.id,
        i.application_id,
        i.interview_type as type,
        i.location_or_link,
        DATE_FORMAT(i.scheduled_at, '%Y-%m-%dT%H:%i:%s.000Z') as time,
        j.title as role,
        sp.full_name as candidate,
        sp.profile_photo_url as photo
      FROM interview_schedules i
      JOIN job_applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN student_profiles sp ON a.student_id = sp.id
      WHERE j.company_id = ?
      ORDER BY i.scheduled_at ASC
    ` : `
      SELECT 
        i.id,
        i.application_id,
        i.interview_type as type,
        i.location_or_link,
        i.scheduled_at as time,
        j.title as role,
        sp.full_name as candidate,
        sp.profile_photo_url as photo
      FROM interview_schedules i
      JOIN job_applications a ON i.application_id = a.id
      JOIN jobs j ON a.job_id = j.id
      JOIN student_profiles sp ON a.student_id = sp.id
      WHERE j.company_id = ?
      ORDER BY i.scheduled_at ASC
    `;

    const [interviews]: any = await db.query(interviewQuery, [companyId]);
    
    // Compute status in JS
    const now = new Date();
    const computedInterviews = interviews.map((i: any) => {
      const time = new Date(i.time);
      let status = 'UPCOMING';
      if (time < now) {
        status = 'COMPLETED';
      }
      return { ...i, status };
    });

    res.json({ success: true, data: computedInterviews });
  } catch (error) {
    console.error("Fetch Interviews Error:", error);
    res.status(500).json({ success: false, message: "Error fetching interviews" });
  }
});

    // GET Admin Analytics
router.get("/admin/metrics", async (req, res) => {
  try {
    const [studentsResult]: any = await db.query("SELECT COUNT(*) as students FROM users WHERE role = 'STUDENT'");
    const [companiesResult]: any = await db.query("SELECT COUNT(*) as companies FROM users WHERE role = 'COMPANY'");
    const [appsResult]: any = await db.query("SELECT COUNT(*) as applications FROM job_applications");
    const [jobsResult]: any = await db.query("SELECT COUNT(*) as totalJobs FROM jobs");
    const [shortlistedResult]: any = await db.query("SELECT COUNT(*) as count FROM job_applications WHERE status IN ('SHORTLISTED', 'TESTING', 'INTERVIEW', 'SELECTED')");
    
    // Check pending company verifications using some logic (maybe company_profiles where some field is not verified, but since we don't have is_verified, assume 0 or count companies without jobs)
    const [pendingResult]: any = await db.query("SELECT COUNT(*) as count FROM company_profiles cp LEFT JOIN jobs j ON cp.id = j.company_id WHERE j.id IS NULL");
    
    const [talentResult]: any = await db.query("SELECT AVG(overall_score) as avg FROM talent_scores");
    
    const students = studentsResult[0]?.students || 0;
    const companies = companiesResult[0]?.companies || 0;
    const applications = appsResult[0]?.applications || 0;
    const totalJobs = jobsResult[0]?.totalJobs || 0;
    const shortlistedCount = shortlistedResult[0]?.count || 0;
    const pendingVerifications = pendingResult[0]?.count || 0;
    const avgTalentScore = Math.round(Number(talentResult[0]?.avg || 0));

    // Calculate Application Trends (last 7 days platform wide)
    const trendQuery = db.useMySQL ? `
      SELECT 
        DATE(applied_at) as date,
        COUNT(*) as count
      FROM job_applications
      WHERE applied_at >= DATE_SUB(CURRENT_DATE, INTERVAL 7 DAY)
      GROUP BY DATE(applied_at)
      ORDER BY DATE(applied_at) ASC
    ` : `
      SELECT 
        date(applied_at) as date,
        COUNT(*) as count
      FROM job_applications
      WHERE applied_at >= date('now', '-7 days')
      GROUP BY date(applied_at)
      ORDER BY date(applied_at) ASC
    `;
    const [trendResult]: any = await db.query(trendQuery);

    // Calculate Interview to Offer Conversion Rate
    const [conversionResult]: any = await db.query(`
      SELECT 
        SUM(CASE WHEN status = 'SELECTED' THEN 1 ELSE 0 END) as offers,
        SUM(CASE WHEN status IN ('INTERVIEW', 'SELECTED') THEN 1 ELSE 0 END) as interviews
      FROM job_applications
    `);
    let conversionRate = 0;
    if (conversionResult[0]?.interviews > 0) {
      conversionRate = Math.round((conversionResult[0].offers / conversionResult[0].interviews) * 100);
    }

    res.json({
      success: true,
      data: {
        metrics: {
          students,
          companies,
          pendingVerifications,
          totalJobs,
          totalApplications: applications,
          shortlisted: shortlistedCount
        },
        trend: trendResult,
        extraStats: {
          avgTalentScore,
          conversionRate
        }
      }
    });
  } catch (error) {
    console.error("Admin Metrics Error:", error);
    res.status(500).json({ success: false, message: "Error fetching admin metrics" });
  }
});

export default router;