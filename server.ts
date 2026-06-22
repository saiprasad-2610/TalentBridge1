import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import { createServer as createViteServer } from "vite";
import path from "path";
import cors from "cors";
import fs from "fs";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { sanitizeInput, detectPromptInjection, strictAuthLimiter, apiLimiter, configureCors, aiServiceLimiter, secureHeadersConfig } from "./server/middleware/security.ts";

// Initialize DB
import { initDb } from "./server/db.ts";

// Import Routes
import authRoutes from "./server/routes/auth.ts";
import studentRoutes from "./server/routes/student.ts";
import companyRoutes from "./server/routes/company.ts";
import jobRoutes from "./server/routes/job.ts";
import aiRoutes from "./server/routes/ai.ts";
import adminRoutes from "./server/routes/admin.ts";
import tpoRoutes from "./server/routes/tpo.ts";
import resumeRoutes from "./server/routes/resume.ts";
import analyticsRoutes from "./server/routes/analytics.ts";
import psychometricRoutes from "./server/routes/psychometric.ts";
import accessibilityRoutes from "./server/routes/accessibility.ts";
import xpRoutes from "./server/routes/xp.ts";
import quizRoutes from "./server/routes/quiz.ts";
import codingRoutes from "./server/routes/coding.ts";
import chatbotRoutes from "./server/routes/chatbot.ts";
import intelligenceRoutes from "./server/routes/intelligence.ts";
import communityRoutes from "./server/routes/community.ts";
import careerGapRoutes from "./server/routes/careerGap.ts";
import interviewRoutes from "./server/routes/interview.ts";

async function startServer() {
  const app = express();
  
  // Security Headers
  if (process.env.NODE_ENV === "production") {
    app.use(helmet(secureHeadersConfig()));
  } else {
    app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP for local dev/iframe to avoid blocking AI viewports
      crossOriginEmbedderPolicy: false
    }));
  }

  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(configureCors());
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));
  
  // Apply Input and Parameter Sanitization (OWASP A03 / XSS Mitigation)
  app.use(sanitizeInput);

  // Apply general API Throttling Rate Limiting
  app.use("/api", apiLimiter);
  
  // Apply strict Brute Force Rate Limiting exclusively to authentication endpoints
  app.use("/api/auth", strictAuthLimiter);

  // Apply Prompt Injection protection and Cost-limiting filters on AI/LLM interfaces
  app.use("/api/ai", aiServiceLimiter, detectPromptInjection);
  app.use("/api/chatbot", aiServiceLimiter, detectPromptInjection);

  // Hardened serving of /uploads preventing RCE, content injection, and script execution
  app.use("/uploads", (req, res, next) => {
    const ext = path.extname(req.path).toLowerCase();
    const bannedExtensions = ['.js', '.jsx', '.ts', '.tsx', '.sh', '.bash', '.php', '.exe', '.bat', '.cmd', '.py', '.pl', '.html', '.htm', '.jsp', '.asp', '.aspx', '.json'];
    if (bannedExtensions.includes(ext)) {
      return res.status(403).json({ error: "Access denied. Action blocked by container safety policy." });
    }
    
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox;");
    res.setHeader("X-Frame-Options", "DENY");
    next();
  }, express.static("uploads"));

  if (!fs.existsSync("./uploads")) {
    fs.mkdirSync("./uploads");
  }

  // Initialize Database
  await initDb();

  // API Routes
  app.use("/api/auth", authRoutes);
  app.use("/api/students", studentRoutes);
  app.use("/api/companies", companyRoutes);
  app.use("/api/jobs", jobRoutes);
  app.use("/api/ai", aiRoutes);
  app.use("/api/admin", adminRoutes);
  app.use("/api/tpo", tpoRoutes);
  app.use("/api/resume", resumeRoutes);
  app.use("/api/analytics", analyticsRoutes);
  app.use("/api/psychometric", psychometricRoutes);
  app.use("/api/accessibility", accessibilityRoutes);
  app.use("/api/xp", xpRoutes);
  app.use("/api/quiz", quizRoutes);
  app.use("/api/coding", codingRoutes);
  app.use("/api/chatbot", chatbotRoutes);
  app.use("/api/intelligence", intelligenceRoutes);
  app.use("/api/community", communityRoutes);
  app.use("/api/career-gap", careerGapRoutes);
  app.use("/api/interviews", interviewRoutes);

  // WebSocket for AI Mock Interview
  const { setupInterviewSocket } = await import("./server/sockets/interview.ts");
  setupInterviewSocket(io);

  // WebSocket for WebRTC Live Interview
  const { setupWebRTCInterviewSocket } = await import("./server/sockets/webrtc-interview.ts");
  setupWebRTCInterviewSocket(io);

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      optimizeDeps: {
        force: true
      }
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 TalentBridge Server running on http://localhost:${PORT}`);
  });
}

startServer();
