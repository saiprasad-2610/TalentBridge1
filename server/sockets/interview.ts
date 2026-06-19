import { Server, Socket } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../services/authService.ts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function setupInterviewSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log("New interview session started:", socket.id);

    let chatSession: any = null;
    let studentId: number | null = null;
    let resumeText = "";
    let silenceTimer: any = null;

    const startSilenceDetection = () => {
      stopSilenceDetection();
      silenceTimer = setTimeout(async () => {
        if (chatSession) {
          console.log("DEBUG: Silence detected in socket session", socket.id);
          try {
            const nudge = await chatSession.sendMessage({ 
              message: "[SYSTEM: The candidate has been silent for 10 seconds. They might be stuck. Please proactively offer a small hint or gently rephrase the current question to help them move forward.]" 
            });
            socket.emit("ai_message", { text: nudge.text, isHint: true });
            // Restart timer after nudge
            startSilenceDetection();
          } catch (err) {
            console.error("Silence nudge error:", err);
          }
        }
      }, 10000); // 10 seconds of silence
    };

    const stopSilenceDetection = () => {
      if (silenceTimer) {
        clearTimeout(silenceTimer);
        silenceTimer = null;
      }
    };

    // --- SECURE LIVE INTERVIEW WEBRTC SIGNALING ---
    socket.on("interview:join-room", async ({ token, interviewId }) => {
      try {
        if (!token) {
          return socket.emit("interview:error", { message: "Authentication token required." });
        }

        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const { userId, role } = decoded;

        // Verify schedule existence
        const scheduleQuery = `
          SELECT i.id, i.application_id, a.student_id, j.company_id
          FROM interview_schedules i
          JOIN job_applications a ON i.application_id = a.id
          JOIN jobs j ON a.job_id = j.id
          WHERE i.id = ?
        `;
        const [schedules] = await db.query(scheduleQuery, [interviewId]);
        if (!schedules || schedules.length === 0) {
          return socket.emit("interview:error", { message: "Interview schedule not found." });
        }

        const schedule = schedules[0];

        // Access control authorization
        if (role === 'STUDENT') {
          const [studentProfile] = await db.query("SELECT id FROM student_profiles WHERE user_id = ?", [userId]);
          if (!studentProfile || studentProfile.length === 0 || studentProfile[0].id !== schedule.student_id) {
            return socket.emit("interview:error", { message: "Access denied: Not your scheduled interview." });
          }
        } else if (role === 'COMPANY') {
          const [companyProfile] = await db.query("SELECT id FROM company_profiles WHERE user_id = ?", [userId]);
          if (!companyProfile || companyProfile.length === 0 || companyProfile[0].id !== schedule.company_id) {
            return socket.emit("interview:error", { message: "Access denied: Not your company's interview." });
          }
        } else if (role !== 'ADMIN' && role !== 'SUPER_ADMIN') {
          return socket.emit("interview:error", { message: "Access denied." });
        }

        const roomId = `interview_${interviewId}`;
        socket.join(roomId);

        // Populate socket session state
        socket.data.roomId = roomId;
        socket.data.userId = userId;
        socket.data.role = role;

        console.log(`🔌 Socket ${socket.id} (${role}) joined live interview room ${roomId}`);

        // Emit joined confirmation
        socket.emit("interview:joined", { roomId, role });

        // Inform others in room
        socket.to(roomId).emit("interview:user-joined", { userId, role });

        // Check if both student & company are present to begin calling negotiation
        const clients = await io.in(roomId).fetchSockets();
        const rolesInRoom = clients.map((s) => s.data.role);
        
        const hasCompany = rolesInRoom.includes('COMPANY') || rolesInRoom.includes('ADMIN') || rolesInRoom.includes('SUPER_ADMIN');
        const hasStudent = rolesInRoom.includes('STUDENT');

        if (hasCompany && hasStudent) {
          console.log(`📡 Both peers present in live room ${roomId}. Sending interview:ready.`);
          io.to(roomId).emit("interview:ready");
        }

      } catch (err) {
        console.error("Socket room join error:", err);
        socket.emit("interview:error", { message: "Invalid token or room join failure." });
      }
    });

    // WebRTC Signaling Signal Forwarders (No global broadcast - routed inside room)
    socket.on("rtc:offer", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        socket.to(roomId).emit("rtc:offer", data);
      }
    });

    socket.on("rtc:answer", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        socket.to(roomId).emit("rtc:answer", data);
      }
    });

    socket.on("rtc:ice-candidate", (data) => {
      const roomId = socket.data.roomId;
      if (roomId) {
        socket.to(roomId).emit("rtc:ice-candidate", data);
      }
    });

    socket.on("interview:end-call", () => {
      const roomId = socket.data.roomId;
      const role = socket.data.role;
      if (roomId) {
        socket.to(roomId).emit("interview:user-left", { role });
        if (role === 'COMPANY' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
          io.to(roomId).emit("interview:ended");
        }
      }
    });

    // --- END SECURE LIVE INTERVIEW WEBRTC ---

    socket.on("start_interview", async (data) => {
      const { userId, resume } = data;
      const { XPService } = await import("../services/xpService.ts");
      
      try {
        await XPService.spendInterviewCredit(userId);
      } catch (err: any) {
        return socket.emit("error", "INSUFFICIENT_CREDITS");
      }

      studentId = userId;
      resumeText = resume || "No resume provided.";

      const chat = ai.chats.create({
        model: "gemini-3-flash-preview",
        config: {
          systemInstruction: `You are Aoede, a charismatic and sharp senior technical interviewer.
          
          MOCK INTERVIEW MODE:
          1. Conduct a "Gemini Live" style 1-on-1 interview.
          2. BE EXTREMELY BRIEF. Use only 1-2 sentences per response. 
          3. Ask questions that feel natural and conversational.
          4. If the candidate is vague, ask a quick follow-up. 
          5. Never use markdown formatting (no bold/italics/bullets) as this is for voice.
          
          ACCURACY & GUIDANCE:
          - Your evaluation must be 100% accurate based on technical depth.
          - If the candidate repeats the same answer or seems stuck, call it out politely and offer a hint or a slightly easier question.
          - If you receive a [SYSTEM] message about silence, it means the user is stuck. Immediately offer a gentle hint or rephrase.
          
          Start immediately with a very friendly greeting and your first question based on their profile.`
        }
      });
      chatSession = chat;

      const initial = await chat.sendMessage({ message: "Please start the interview now with a greeting and a first question." });
      socket.emit("ai_message", { text: initial.text });
      startSilenceDetection();
    });

    socket.on("user_message", async (message: string) => {
      if (!chatSession || !message) return;
      stopSilenceDetection();

      try {
        const result = await chatSession.sendMessage({ message });
        socket.emit("ai_message", { text: result.text });
        startSilenceDetection();
      } catch (error) {
        console.error("AI Response Error:", error);
        socket.emit("error", "I'm having trouble hearing you. Can you repeat that?");
        startSilenceDetection();
      }
    });

    socket.on("disconnect", () => {
      console.log("Interview session ended:", socket.id);
      stopSilenceDetection();
      const roomId = socket.data.roomId;
      const role = socket.data.role;
      if (roomId) {
        socket.to(roomId).emit("interview:user-left", { role });
      }
    });
  });
}
