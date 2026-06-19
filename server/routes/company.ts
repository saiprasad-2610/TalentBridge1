import express from "express";
import db from "../db.ts";
import path from "path";
import fs from "fs";

const router = express.Router();

// Helper to calculate completeness
const calculateCompleteness = (profile: any, docs: any[]) => {
  let score = 0;
  
  // 1. Basic Identity (20%)
  if (profile.company_name) score += 5;
  if (profile.logo_url) score += 5;
  if (profile.website) score += 5;
  if (profile.company_email && profile.contact_number) score += 5;

  // 2. Business & Legal Details (30%)
  if (profile.business_name) score += 5;
  if (profile.gst_no) score += 10;
  if (profile.cin_no || profile.pan_no) score += 5;
  if (profile.address && profile.city) score += 10;

  // 3. Verification Documents (30%)
  const hasGst = docs.some(d => d.doc_type === 'GST Certificate');
  const hasReg = docs.some(d => d.doc_type === 'Business Registration Certificate');
  const hasPan = docs.some(d => d.doc_type === 'PAN Card');
  
  if (hasGst) score += 10;
  if (hasReg) score += 10;
  if (hasPan) score += 10;

  // 4. Company Narrative & Social (20%)
  if (profile.about && profile.about.length > 200) score += 10;
  else if (profile.about && profile.about.length > 50) score += 5;
  
  if (profile.linkedin_url || profile.github_url) score += 10;

  return Math.min(100, score);
};

// Company profile
router.get("/profile/:userId", async (req, res) => {
  try {
    const [profiles] = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [req.params.userId]);
    if (!profiles[0]) {
      return res.json({ success: true, data: null });
    }
    const [docs] = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [profiles[0].id]);
    res.json({ success: true, data: { ...profiles[0], documents: docs } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching profile" });
  }
});

// Update Company Profile
router.put("/profile/:userId", async (req, res) => {
  const profile = req.body;
  const userId = req.params.userId;

  try {
    // Check if profile exists
    const [existing] = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    
    if (existing[0]) {
      await db.query(`
        UPDATE company_profiles 
        SET 
          company_name = ?, logo_url = ?, website = ?, company_email = ?, contact_number = ?,
          company_type = ?, industry = ?, company_size = ?, year_established = ?,
          business_name = ?, gst_no = ?, cin_no = ?, pan_no = ?,
          address = ?, operating_address = ?, country = ?, state = ?, city = ?,
          about = ?, services = ?, linkedin_url = ?, github_url = ?
        WHERE user_id = ?
      `, [
        profile.company_name, profile.logo_url, profile.website, profile.company_email, profile.contact_number,
        profile.company_type, profile.industry, profile.company_size, profile.year_established,
        profile.business_name, profile.gst_no, profile.cin_no, profile.pan_no,
        profile.address, profile.operating_address, profile.country, profile.state, profile.city,
        profile.about, profile.services, profile.linkedin_url, profile.github_url,
        userId
      ]);
    } else {
      await db.query(`
        INSERT INTO company_profiles (
          user_id, company_name, logo_url, website, company_email, contact_number,
          company_type, industry, company_size, year_established,
          business_name, gst_no, cin_no, pan_no,
          address, operating_address, country, state, city,
          about, services, linkedin_url, github_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        userId, profile.company_name, profile.logo_url, profile.website, profile.company_email, profile.contact_number,
        profile.company_type, profile.industry, profile.company_size, profile.year_established,
        profile.business_name, profile.gst_no, profile.cin_no, profile.pan_no,
        profile.address, profile.operating_address, profile.country, profile.state, profile.city,
        profile.about, profile.services, profile.linkedin_url, profile.github_url
      ]);
    }

    // Refresh score
    const [refProf] = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    const [refDocs] = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [refProf[0].id]);
    const score = calculateCompleteness(refProf[0], refDocs);
    await db.query("UPDATE company_profiles SET completeness_score = ? WHERE user_id = ?", [score, userId]);

    res.json({ success: true, message: "Profile updated successfully", score });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Update failed" });
  }
});

// Document Upload
router.post("/profile/:userId/documents", async (req, res) => {
  const { doc_type, doc_url } = req.body;
  const userId = req.params.userId;

  try {
    const [profiles] = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
    if (!profiles[0]) return res.status(404).json({ success: false, message: "Profile not found" });

    const companyId = profiles[0].id;

    // Check if document of this type already exists, if so delete/replace
    // For now, we allow multiple if needed, but let's replace for same type for cleaner UI
    await db.query("DELETE FROM company_documents WHERE company_id = ? AND doc_type = ?", [companyId, doc_type]);
    
    await db.query("INSERT INTO company_documents (company_id, doc_type, doc_url) VALUES (?, ?, ?)", [companyId, doc_type, doc_url]);

    // Recalculate score
    const [refProf] = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [userId]);
    const [refDocs] = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [refProf[0].id]);
    const score = calculateCompleteness(refProf[0], refDocs);
    await db.query("UPDATE company_profiles SET completeness_score = ? WHERE user_id = ?", [score, userId]);

    res.json({ success: true, message: "Document uploaded successfully", score });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Document upload failed" });
  }
});

// Submit for Verification
router.post("/profile/:userId/submit", async (req, res) => {
  try {
    const [profiles] = await db.query("SELECT * FROM company_profiles WHERE user_id = ?", [req.params.userId]);
    if (!profiles[0]) return res.status(404).json({ success: false, message: "Profile not found" });

    const [docs] = await db.query("SELECT * FROM company_documents WHERE company_id = ?", [profiles[0].id]);
    const score = calculateCompleteness(profiles[0], docs);

    if (score < 80) {
      return res.status(400).json({ success: false, message: "Profile incompleteness. Must reach 80% with required documents." });
    }

    await db.query("UPDATE company_profiles SET status = 'PENDING', is_submitted = 1, completeness_score = ? WHERE user_id = ?", [score, req.params.userId]);
    res.json({ success: true, message: "Profile submitted for verification" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Submission failed" });
  }
});

// Test management for companies
router.post("/tests", async (req, res) => {
  const { jobId, questions } = req.body;
  try {
    await db.query(`
      INSERT INTO tests (job_id, questions_json) VALUES (?, ?) 
      ON DUPLICATE KEY UPDATE questions_json = VALUES(questions_json)
    `, [jobId, JSON.stringify(questions)]);
    res.json({ success: true, message: "Test created successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to create test" });
  }
});

router.get("/tests/:jobId", async (req, res) => {
  try {
    const jobId = req.params.jobId;
    console.log(`📡 Fetching tests for Job ID: ${jobId}`);

    const [questions] = await db.query(`
      SELECT TQ.*, JS.stage_name, JS.job_id
      FROM test_questions TQ
      JOIN job_stages JS ON TQ.stage_id = JS.id
      WHERE JS.job_id = ?
    `, [jobId]);
    
    if (questions.length > 0) {
       console.log(`✅ Found ${questions.length} stage-specific questions`);
       return res.json({ success: true, data: questions });
    }

    // Fallback to legacy tests table
    console.log(`🔍 No stage-specific questions, checking legacy tests table for job ${jobId}...`);
    const [legacyTests] = await db.query("SELECT * FROM tests WHERE job_id = ?", [jobId]);
    if (legacyTests.length > 0) {
       console.log(`✅ Found legacy test for job ${jobId}`);
       const qs = typeof legacyTests[0].questions_json === 'string' ? JSON.parse(legacyTests[0].questions_json) : legacyTests[0].questions_json;
       const mapped = qs.map((q: any, i: number) => ({
          id: `legacy-${i}`,
          question_text: q.text || q.question,
          options_json: q.options || q.options_json,
          correct_answer: q.correctAnswer || q.answer || q.correct_answer,
          stage_id: -1
       }));
       return res.json({ success: true, data: mapped });
    }

    console.log(`⚠️ No questions found at all for job ${jobId}`);
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching test questions" });
  }
});

export default router;
