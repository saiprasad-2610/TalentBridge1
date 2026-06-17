import express from "express";
import db from "../db.ts";
import { authenticate } from "../middleware/auth.ts";

const router = express.Router();

// Get settings
router.get("/settings", authenticate, async (req: any, res) => {
  try {
    const [userExists]: any = await db.query("SELECT id FROM users WHERE id = ?", [req.user.userId]);
    if (!userExists || userExists.length === 0) {
      return res.json({ success: true, data: null, message: "User not found in system" });
    }

    const [prefs]: any = await db.query(
      "SELECT * FROM accessibility_preferences WHERE user_id = ?",
      [req.user.userId]
    );
    res.json({ success: true, data: prefs[0] || null });
  } catch (e) {
    console.error("Accessibility GET error:", e);
    res.json({ success: true, data: null, message: "Database read skipped" });
  }
});

// Update settings
router.post("/settings", authenticate, async (req: any, res) => {
  try {
    const [userExists]: any = await db.query("SELECT id FROM users WHERE id = ?", [req.user.userId]);
    if (!userExists || userExists.length === 0) {
      return res.json({ success: true, message: "User not found in system, skip sync" });
    }

    const accessibility_mode = req.body.accessibility_mode ? 1 : 0;
    const voice_enabled = req.body.voice_enabled ? 1 : 0;
    const contrast_mode = req.body.contrast_mode || "NORMAL";
    const font_size = req.body.font_size || "MEDIUM";
    const last_used_voice = req.body.last_used_voice || null;
    
    // Check if exists
    const [exists]: any = await db.query("SELECT id FROM accessibility_preferences WHERE user_id = ?", [req.user.userId]);
    
    if (exists && exists.length > 0) {
      await db.query(
        `UPDATE accessibility_preferences 
         SET accessibility_mode = ?, voice_enabled = ?, contrast_mode = ?, font_size = ?, last_used_voice = ?
         WHERE user_id = ?`,
        [
          accessibility_mode, 
          voice_enabled, 
          contrast_mode, 
          font_size, 
          last_used_voice, 
          req.user.userId
        ]
      );
    } else {
      await db.query(
        `INSERT INTO accessibility_preferences 
         (user_id, accessibility_mode, voice_enabled, contrast_mode, font_size, last_used_voice)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          req.user.userId, 
          accessibility_mode, 
          voice_enabled, 
          contrast_mode, 
          font_size, 
          last_used_voice
        ]
      );
    }
    
    res.json({ success: true });
  } catch (e) {
    console.error("Accessibility POST error:", e);
    res.status(500).json({ success: false, message: "Database error" });
  }
});

// Log voice command
router.post("/log-command", authenticate, async (req: any, res) => {
  try {
    const [userExists]: any = await db.query("SELECT id FROM users WHERE id = ?", [req.user.userId]);
    if (!userExists || userExists.length === 0) {
      return res.json({ success: true, message: "User not found in system, skip logging" });
    }

    const { command, intent, confidence, success } = req.body;
    await db.query(
      "INSERT INTO voice_command_logs (user_id, command, intent, confidence, success) VALUES (?, ?, ?, ?, ?)",
      [req.user.userId, command, intent, confidence, success]
    );
    res.json({ success: true });
  } catch (e) {
    res.json({ success: true, message: "Database log skipped" });
  }
});

export default router;
