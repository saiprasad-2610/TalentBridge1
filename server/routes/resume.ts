import express from "express";
import db from "../db.ts";
import { XPService } from "../services/xpService.ts";

const router = express.Router();

// Resume Templates Metadata
const RESUME_TEMPLATES = [
  { 
    id: "academic-latex", 
    name: "Latex Scholar", 
    description: "Classic academic style based on LaTeX formatting. Perfect for SDE roles.",
    type: "ACADEMIC" 
  },
  { 
    id: "hybrid-ats-premium", 
    name: "Hybrid ATS Premium", 
    description: "Standard single-column layout optimized for executive screeners and complex ATS parsers. 100% parse rate.",
    type: "ATS_GOLD" 
  },
  { 
    id: "silicon-valley-tech", 
    name: "Silicon Valley Tech", 
    description: "Modern sans-serif design optimized for software, product, and tech corporate placements.",
    type: "TECH_PRO" 
  },
  { 
    id: "modern-pro", 
    name: "Modern Professional", 
    description: "Clean layout with subtle accents and section dividers.",
    type: "PROFESSIONAL" 
  },
  { 
    id: "executive-grid", 
    name: "Executive Grid", 
    description: "Structured two-column layout for experienced candidates.",
    type: "EXECUTIVE" 
  },
  { 
    id: "minimal-swiss", 
    name: "Minimal Swiss", 
    description: "Clean, bold typography with a focus on whitespace.",
    type: "MINIMAL" 
  },
  { 
    id: "technical-elite", 
    name: "Technical Elite", 
    description: "Sidebar-focused design highlighting technical skill proficiencies.",
    type: "TECHNICAL" 
  },
  { 
    id: "classic-ats", 
    name: "Classic ATS", 
    description: "Single column, minimal design, strictly ATS-friendly.",
    type: "ATS" 
  }
];

// Check Reset Daily Limit
async function checkAndResetLimit(userId: number) {
  const [profiles]: any = await db.query("SELECT daily_resume_count, last_resume_reset_at FROM student_profiles WHERE user_id = ?", [userId]);
  if (profiles.length === 0) return { count: 0, reset: true };

  const profile = profiles[0];
  const lastReset = new Date(profile.last_resume_reset_at);
  const now = new Date();

  // Reset if it's a new day
  if (now.toDateString() !== lastReset.toDateString()) {
    await db.query("UPDATE student_profiles SET daily_resume_count = 0, last_resume_reset_at = ? WHERE user_id = ?", [now, userId]);
    return { count: 0, reset: true };
  }

  return { count: profile.daily_resume_count, reset: false };
}

router.get("/templates", (req, res) => {
  res.json(RESUME_TEMPLATES);
});

router.get("/status/:userId", async (req, res) => {
  try {
    const { count } = await checkAndResetLimit(parseInt(req.params.userId));
    
    // Fetch profile
    const [profiles]: any = await db.query("SELECT * FROM student_profiles WHERE user_id = ?", [req.params.userId]);
    if (profiles.length === 0) return res.status(404).json({ message: "Profile not found" });

    const p = profiles[0];

    const education = typeof p.education_json === 'string' ? JSON.parse(p.education_json) : (p.education_json || []);
    const projects = typeof p.projects_json === 'string' ? JSON.parse(p.projects_json) : (p.projects_json || []);
    const skills = typeof p.skills_json === 'string' ? JSON.parse(p.skills_json) : (p.skills_json || []);

    const errors = [];
    if (p.completeness_score < 70) errors.push("Profile completion must be at least 70%");
    if (!p.profile_photo_url) errors.push("Profile photo is mandatory");
    if (projects.length < 1) errors.push("At least one project is required");
    if (skills.length < 3) errors.push("At least 3 skills are required");

    res.json({
      dailyCount: count,
      limit: 3,
      isEligible: errors.length === 0 && count < 3,
      errors
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch status" });
  }
});

router.post("/generate", async (req, res) => {
  const { userId, templateId, summary } = req.body;
  
  try {
    const { count } = await checkAndResetLimit(userId);
    if (count >= 3) {
      return res.status(403).json({ success: false, message: "You have reached today's limit (3 resumes). Try again tomorrow." });
    }

    // Check if enough XP
    const cost = await XPService.getConfigValue('RESUME_ANALYSIS_COST', 50);
    const [users]: any = await db.query("SELECT xp_balance FROM users WHERE id = ?", [userId]);
    const xpBalance = users[0]?.xp_balance || 0;
    if (xpBalance < cost) {
      return res.status(403).json({ success: false, message: `Insufficient XP. Generating a resume requires ${cost} XP.` });
    }

    // Deduct cost
    await XPService.deductXP(userId, cost, 'RESUME_GENERATION', "AI Resume Builder Draft Generation");

    // Increment daily count
    await db.query("UPDATE student_profiles SET daily_resume_count = daily_resume_count + 1 WHERE user_id = ?", [userId]);

    // Save to history
    await db.query("INSERT INTO resume_history (user_id, template_id, summary) VALUES (?, ?, ?)", [userId, templateId, summary]);

    res.json({
      success: true,
      dailyCount: count + 1
    });
  } catch (error) {
    console.error("Resume Action Tracking Error:", error);
    res.status(500).json({ message: "Failed to track resume generation" });
  }
});

router.get("/history/:userId", async (req, res) => {
  try {
    const [history] = await db.query("SELECT * FROM resume_history WHERE user_id = ? ORDER BY created_at DESC", [req.params.userId]);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch history" });
  }
});

export default router;
