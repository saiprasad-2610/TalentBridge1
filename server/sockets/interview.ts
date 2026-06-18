import { Server, Socket } from "socket.io";
import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";
import { verifyToken } from "../services/authService.ts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export function setupInterviewSocket(io: Server) {
  // 1. Strict Socket JWT Authentication Middleware
  io.use((socket: Socket, next) => {
    let token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
    if (token && token.startsWith("Bearer ")) {
      token = token.slice(7);
    }
    if (!token) {
      console.warn(`[Socket Auth Warning] Handshake missing credential token for ${socket.id}`);
      return next(new Error("Authentication error: Connection credentials token is missing."));
    }
    const decoded = verifyToken(token) as any;
    if (!decoded) {
      console.warn(`[Socket Auth Warning] Expired or invalid credential token for ${socket.id}`);
      return next(new Error("Authentication error: Expired or invalid verification token."));
    }
    socket.data = socket.data || {};
    socket.data.user = decoded; // Contains { userId, role, email }
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log("New validated interview session established:", socket.id);

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
      // Derive authenticated student ID from Token, fallback to payload
      const userId = socket.data?.user?.userId || data.userId;
      const { XPService } = await import("../services/xpService.ts");
      
      try {
        await XPService.spendInterviewCredit(userId);
      } catch (err: any) {
        return socket.emit("error", "INSUFFICIENT_CREDITS");
      }

      studentId = userId;
      resumeText = data.resume || "No resume provided.";

      const chat = ai.chats.create({
        model: "gemini-3.5-flash",
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

    // --- SECURE AUTHENTICATED WEBRTC ROOM SYSTEM ---
    const handleJoinWebRTCRoom = async (interviewId: number, name: string) => {
      // Identity derived entirely from JWT to enforce Zero-Trust Architecture
      const userFromToken = socket.data?.user;
      if (!userFromToken) {
        socket.emit("error", "Unauthorized: Valid token credentials required.");
        return;
      }

      const userId = userFromToken.userId;
      const role = userFromToken.role;

      console.log(`[WebRTC Server] Authenticated user ${userId} (${role}) joining room: interview_${interviewId}`);
      
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
          socket.emit("error", "Designated interview session does not exist.");
          return;
        }

        const interview = rows[0];
        let isAuthorized = false;

        // Perform RBAC validation
        if (role === "STUDENT" && interview.student_user_id === userId) {
          isAuthorized = true;
        } else if (role === "COMPANY" && interview.company_user_id === userId) {
          isAuthorized = true;
        } else if (["ADMIN", "SUPER_ADMIN", "TPO"].includes(role)) {
          isAuthorized = true;
        }

        if (!isAuthorized) {
          console.warn(`[WebRTC Unauthorized Entry] Blocked user ${userId} (${role}) fetching room ${interviewId}`);
          socket.emit("error", "Unauthorized access. You are not assigned to this interview.");
          return;
        }

        if (interview.status === "CANCELLED") {
          socket.emit("error", "This scheduled interview has been cancelled.");
          return;
        }
      } catch (err) {
        console.error("[WebRTC Server] Database authorization lookup error:", err);
        socket.emit("error", "Server failed to verify session permissions.");
        return;
      }
      
      socket.join(`interview_${interviewId}`);
      (socket as any).interviewId = interviewId;
      (socket as any).userId = userId;
      (socket as any).role = role;
      (socket as any).userName = name;

      // Log/Update participant connection trace
      try {
        await db.query(
          "INSERT INTO interview_participants (interview_id, user_id, name, email, role, join_status, joined_at) VALUES (?, ?, ?, ?, ?, 'JOINED', CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE join_status='JOINED', joined_at=CURRENT_TIMESTAMP",
          [interviewId, userId, name, `${role.toLowerCase()}-${userId}@tb.com`, role]
        );
      } catch (e) {
        try {
          await db.query(
            "INSERT INTO interview_participants (interview_id, user_id, name, email, role, join_status, joined_at) VALUES (?, ?, ?, ?, ?, 'JOINED', CURRENT_TIMESTAMP)",
            [interviewId, userId, name, `${role.toLowerCase()}-${userId}@tb.com`, role]
          );
        } catch (_) {}
      }

      // 1. Notify legacy clients using `peer_joined`
      socket.to(`interview_${interviewId}`).emit("peer_joined", {
        socketId: socket.id,
        userId,
        name,
        role
      });

      // 2. Notify modern clients using `interview:user-joined`
      socket.to(`interview_${interviewId}`).emit("interview:user-joined", {
        socketId: socket.id,
        userId,
        name,
        role,
        interviewId
      });

      // Fetch active sockets count in room
      const activeClients = io.sockets.adapter.rooms.get(`interview_${interviewId}`);
      const peers: any[] = [];
      if (activeClients) {
        for (const clientId of activeClients) {
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

        // 3. Emit ready signal when exactly 2 peers are present inside the meeting room
        if (activeClients.size >= 2) {
          console.log(`[WebRTC Room Ready] Emitting interview:ready to room: interview_${interviewId}`);
          io.to(`interview_${interviewId}`).emit("interview:ready", {
            interviewId,
            message: "All participants present. Handshake initiated."
          });
        }
      }

      // Return participants lists to help both legacy and modern engines connect smoothly
      socket.emit("room_peers", peers);
    };

    // Supporting traditional and modern join room events
    socket.on("join_video_room", async (data: { interviewId: number; name: string; role: string; userId: number }) => {
      await handleJoinWebRTCRoom(data.interviewId, data.name);
    });

    socket.on("interview:join-room", async (data: { interviewId: number; name: string }) => {
      await handleJoinWebRTCRoom(data.interviewId, data.name);
    });

    // Relaying WebRTC data packets strictly to the designated target in the same authorized room
    socket.on("relay_signal", (data: { targetSocketId: string; signal: any }) => {
      io.to(data.targetSocketId).emit("signal_received", {
        senderSocketId: socket.id,
        signal: data.signal
      });
    });

    // Modern isolated WebRTC signaling relayers
    socket.on("rtc:offer", (data: { interviewId: number; offer: any; targetSocketId?: string }) => {
      const targetId = data.targetSocketId;
      if (targetId) {
        io.to(targetId).emit("rtc:offer", {
          senderSocketId: socket.id,
          offer: data.offer,
          interviewId: data.interviewId
        });
      } else {
        socket.to(`interview_${data.interviewId}`).emit("rtc:offer", {
          senderSocketId: socket.id,
          offer: data.offer,
          interviewId: data.interviewId
        });
      }
    });

    socket.on("rtc:answer", (data: { interviewId: number; answer: any; targetSocketId?: string }) => {
      const targetId = data.targetSocketId;
      if (targetId) {
        io.to(targetId).emit("rtc:answer", {
          senderSocketId: socket.id,
          answer: data.answer,
          interviewId: data.interviewId
        });
      } else {
        socket.to(`interview_${data.interviewId}`).emit("rtc:answer", {
          senderSocketId: socket.id,
          answer: data.answer,
          interviewId: data.interviewId
        });
      }
    });

    socket.on("rtc:ice-candidate", (data: { interviewId: number; candidate: any; targetSocketId?: string }) => {
      const targetId = data.targetSocketId;
      if (targetId) {
        io.to(targetId).emit("rtc:ice-candidate", {
          senderSocketId: socket.id,
          candidate: data.candidate,
          interviewId: data.interviewId
        });
      } else {
        socket.to(`interview_${data.interviewId}`).emit("rtc:ice-candidate", {
          senderSocketId: socket.id,
          candidate: data.candidate,
          interviewId: data.interviewId
        });
      }
    });

    socket.on("interview:connection-state", (data: { interviewId: number; state: string }) => {
      socket.to(`interview_${data.interviewId}`).emit("interview:connection-state", {
        senderSocketId: socket.id,
        state: data.state,
        interviewId: data.interviewId
      });
    });

    socket.on("interview:end", (data: { interviewId: number }) => {
      const userFromToken = socket.data?.user;
      if (userFromToken && userFromToken.role === "COMPANY") {
        console.log(`[WebRTC Room End] Recruiter triggered interview:end for interview: ${data.interviewId}`);
        io.to(`interview_${data.interviewId}`).emit("interview:end", {
          interviewId: data.interviewId,
          message: "The interviewer concluded the meeting session."
        });
      }
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
        // 1. Notify legacy clients Using `peer_left`
        socket.to(`interview_${interviewId}`).emit("peer_left", {
          socketId: socket.id,
          userId: (socket as any).userId,
          name: (socket as any).userName
        });

        // 2. Notify modern clients Using `interview:user-left`
        socket.to(`interview_${interviewId}`).emit("interview:user-left", {
          socketId: socket.id,
          userId: (socket as any).userId,
          name: (socket as any).userName,
          interviewId
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
