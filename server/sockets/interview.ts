import { Server, Socket } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";

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

    // --- ADDITIVE WEBRTC SIGNALING SYSTEM ---
    socket.on("join_video_room", async (data: { interviewId: number; name: string; role: string; userId: number }) => {
      const { interviewId, name, role, userId } = data;
      console.log(`[WebRTC] User ${name} (${role}) joining room: interview_${interviewId}`);
      
      try {
        const [rows]: any = await db.query(
          `SELECT i.*, s.user_id as student_user_id, c.user_id as company_user_id
           FROM interviews i
           JOIN company_profiles c ON i.company_id = c.id
           JOIN student_profiles s ON i.student_id = s.id
           WHERE i.id = ?`,
          [interviewId]
        );

        if (!rows || rows.length === 0) {
          socket.emit("error", "Interview room not found.");
          return;
        }

        const interview = rows[0];
        let isAuthorized = false;

        if (role === "STUDENT" && interview.student_user_id === userId) {
          isAuthorized = true;
        } else if (role === "COMPANY" && interview.company_user_id === userId) {
          isAuthorized = true;
        } else if (role === "ADMIN" || role === "SUPER_ADMIN") {
          isAuthorized = true;
        }

        if (!isAuthorized) {
          console.warn(`[WebRTC Socket] Unauthorized entry attempt by user ${name} (${role}) to room: ${interviewId}`);
          socket.emit("error", "Unauthorized access to this interview room.");
          return;
        }
      } catch (err) {
        console.error("Socket authorization database query error:", err);
        socket.emit("error", "Authorization lookup failed.");
        return;
      }
      
      socket.join(`interview_${interviewId}`);
      (socket as any).interviewId = interviewId;
      (socket as any).userId = userId;
      (socket as any).role = role;
      (socket as any).userName = name;

      // Log participant join in database
      try {
        await db.query(
          "INSERT INTO interview_participants (interview_id, user_id, name, email, role, join_status, joined_at) VALUES (?, ?, ?, ?, ?, 'JOINED', CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE join_status='JOINED', joined_at=CURRENT_TIMESTAMP",
          [interviewId, userId, name, `${role.toLowerCase()}-${userId}@tb.com`, role]
        );
      } catch (e) {
        // Fallback for sqlite / error tolerance
        try {
          await db.query(
            "INSERT INTO interview_participants (interview_id, user_id, name, email, role, join_status, joined_at) VALUES (?, ?, ?, ?, ?, 'JOINED', CURRENT_TIMESTAMP)",
            [interviewId, userId, name, `${role.toLowerCase()}-${userId}@tb.com`, role]
          );
        } catch (_) {}
      }

      // Notify others in room
      socket.to(`interview_${interviewId}`).emit("peer_joined", {
        socketId: socket.id,
        userId,
        name,
        role
      });

      // Send list of current room participants back to the new joiner
      const clients = io.sockets.adapter.rooms.get(`interview_${interviewId}`);
      const peers: any[] = [];
      if (clients) {
        for (const clientId of clients) {
          if (clientId !== socket.id) {
            const clientSocket = io.sockets.sockets.get(clientId);
            if (clientSocket) {
              peers.push({
                socketId: clientId,
                userId: (clientSocket as any).userId,
                name: (clientSocket as any).userName,
                role: (clientSocket as any).role
              });
            }
          }
        }
      }
      socket.emit("room_peers", peers);
    });

    socket.on("relay_signal", (data: { targetSocketId: string; signal: any }) => {
      io.to(data.targetSocketId).emit("signal_received", {
        senderSocketId: socket.id,
        signal: data.signal
      });
    });

    socket.on("send_room_message", (data: { interviewId: number; text: string; senderName: string }) => {
      io.to(`interview_${data.interviewId}`).emit("room_message", {
        senderSocketId: socket.id,
        senderName: data.senderName,
        text: data.text,
        timestamp: new Date().toISOString()
      });
    });

    socket.on("trigger_proctoring_alert", async (data: { interviewId: number; studentId: number; eventType: string; severity: string; details: string }) => {
      const { interviewId, studentId, eventType, severity, details } = data;
      console.warn(`[PROCTORING] ${eventType} alert for student ${studentId} in interview ${interviewId}: ${details}`);
      
      try {
        const metadata = JSON.stringify({ details, timestamp: new Date().toISOString() });
        await db.query(
          "INSERT INTO interview_proctoring_events (interview_id, student_id, event_type, severity, metadata_json, occurred_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
          [interviewId, studentId, eventType, severity, metadata]
        );
      } catch (err) {
        console.error("Failed to log proctoring event in DB:", err);
      }

      // Alert the company/interviewers in the room instantly
      io.to(`interview_${interviewId}`).emit("proctoring_notification", {
        studentId,
        eventType,
        severity,
        details
      });
    });

    socket.on("disconnect", () => {
      console.log("Interview session ended:", socket.id);
      stopSilenceDetection();

      const interviewId = (socket as any).interviewId;
      if (interviewId) {
        socket.to(`interview_${interviewId}`).emit("peer_left", {
          socketId: socket.id,
          userId: (socket as any).userId,
          name: (socket as any).userName
        });
        
        // Update participant left_at time in DB
        db.query(
          "UPDATE interview_participants SET join_status='LEFT', left_at=CURRENT_TIMESTAMP WHERE interview_id=? AND user_id=?",
          [interviewId, (socket as any).userId]
        ).catch(() => {});
      }
    });
  });
}
