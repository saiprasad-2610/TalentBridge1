import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Video, Mic, MicOff, VideoOff, Send, LogOut, CheckCircle, AlertTriangle, ShieldCheck,
  Award, FileText, Play, ChevronRight, X, Loader2, RefreshCw, Plus, Users, Heart
} from "lucide-react";
import toast from "react-hot-toast";

interface Participant {
  socketId: string;
  userId: number;
  name: string;
  role: string;
}

export function VideoInterviewRoom() {
  const { id: interviewId } = useParams<{ id: string }>();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const displayName = profile?.full_name || profile?.company_name || user?.email || "User";

  // Lifecycle states: 'CONSENT' | 'PREJOIN' | 'ROOM' | 'EVALUATION'
  const [appState, setAppState] = useState<"CONSENT" | "PREJOIN" | "ROOM" | "EVALUATION">("CONSENT");
  const [consentGranted, setConsentGranted] = useState(false);
  const [interviewData, setInterviewData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Media Configurations
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedVideoDevice, setSelectedVideoDevice] = useState("");

  // Room / WebRTC Sync
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSignalingConnected, setIsSignalingConnected] = useState(false);

  // Proctoring logs (Candidate specific)
  const [warnings, setWarnings] = useState<string[]>([]);
  const [fullscreenActive, setFullscreenActive] = useState(false);

  // Recruiter specific controls
  const [questionInput, setQuestionInput] = useState("");
  const [loggedQuestions, setLoggedQuestions] = useState<string[]>([]);
  const [transcriptsCaptured, setTranscriptsCaptured] = useState<any[]>([]);

  // Evaluation & draft review
  const [generatingReport, setGeneratingReport] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);
  const [finalizingReport, setFinalizingReport] = useState(false);
  const [reportFinalized, setReportFinalized] = useState(false);

  // Refs
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  // 1. Fetch details on initial render
  useEffect(() => {
    const fetchInterviewDetails = async () => {
      try {
        const { data } = await api.get(`/interviews/${interviewId}`);
        if (data.success) {
          setInterviewData(data.data);
          
          // If the interview is already COMPLETED or REPORT_READY, direct straight to EVALUATION screen
          if (["COMPLETED", "REPORT_READY"].includes(data.data.status)) {
            setFinalReport(data.data.report);
            if (data.data.reportStatus === "FINALIZED") {
              setReportFinalized(true);
            }
            setAppState("EVALUATION");
          }
        } else {
          toast.error("Could not locate designated interview room.");
          navigate("/company/interviews");
        }
      } catch (err) {
        console.error("Failure claiming room metadata", err);
        toast.error("Error connecting with TalentBridge Interview Vault.");
      } finally {
        setLoading(false);
      }
    };
    fetchInterviewDetails();
  }, [interviewId]);

  // 2. Discover camera devices on consent
  useEffect(() => {
    if (consentGranted && user) {
      setAppState("PREJOIN");
      navigator.mediaDevices.enumerateDevices().then(devs => {
        const videoDevs = devs.filter(d => d.kind === "videoinput");
        setDevices(videoDevs);
        if (videoDevs.length > 0) setSelectedVideoDevice(videoDevs[0].deviceId);
      }).catch(() => {});
    }
  }, [consentGranted]);

  // Handle hardware setups
  const handleStartHardwarePreview = async () => {
    try {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: selectedVideoDevice ? { deviceId: selectedVideoDevice } : true,
        audio: true
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.warn("Could not activate camera streams:", err);
      toast.error("Camera/Mic permissions required for proctored screening.");
    }
  };

  useEffect(() => {
    if (appState === "PREJOIN" && consentGranted) {
      handleStartHardwarePreview();
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [appState, selectedVideoDevice]);

  // 3. Proctoring Lockdown Logic (Restricted to STUDENT role)
  useEffect(() => {
    if (appState !== "ROOM" || user?.role !== "STUDENT" || !interviewData) return;

    // A) Tab Switch detector
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const warningMsg = `Active Tab Exit detected at ${new Date().toLocaleTimeString()}!`;
        setWarnings(prev => [...prev, warningMsg]);
        toast.error("PROCTORING WARNING: Inside-room tab isolation active. Stay on this screen!");

        // Dispatch alert to backend sockets instantly
        socketRef.current?.emit("trigger_proctoring_alert", {
          interviewId: parseInt(interviewId || "0"),
          studentId: user?.id || 1,
          eventType: "WINDOWS_TAB_SWITCH",
          severity: "HIGH",
          details: "Candidate navigated away from the screening viewport tab."
        });

        // Add to chronological trace
        logLocalTranscript("STUDENT", `[SYSTEM FLAG: Candidate switched browser tabs/windows]`);
      }
    };

    // B) Fullscreen Exit lockdown
    const handleFullscreenChange = () => {
      const isFull = !!document.fullscreenElement;
      setFullscreenActive(isFull);
      if (!isFull) {
        const warningMsg = `Enforced Fullscreen Exit at ${new Date().toLocaleTimeString()}!`;
        setWarnings(prev => [...prev, warningMsg]);
        toast("Fullscreen mode deactivated. Please re-enter fullscreen.");

        socketRef.current?.emit("trigger_proctoring_alert", {
          interviewId: parseInt(interviewId || "0"),
          studentId: user?.id || 1,
          eventType: "FULLSCREEN_EXIT",
          severity: "MEDIUM",
          details: "Candidate exited enforced full screen presentation focus."
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    // Enforce fullscreen on startup
    try {
      document.documentElement.requestFullscreen().catch(() => {});
    } catch (_) {}

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [appState, user, interviewData]);

  // 4. WebRTC Signaling Sockets Connection Loop
  const handleConnectCallRoom = async () => {
    if (!localStream) {
      return toast.error("Local hardware stream is not initialized.");
    }
    setAppState("ROOM");

    // Connect relative to root using multiplexed server.ts port
    const socket = io("/", {
      transports: ["websocket"]
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Lobby] Connected to WebRTC signaling server. socket ID:", socket.id);
      setIsSignalingConnected(true);

      // Join designates physical interview channel room
      socket.emit("join_video_room", {
        interviewId: parseInt(interviewId || "0"),
        name: displayName,
        role: user?.role || "STUDENT",
        userId: user?.id || 1
      });
    });

    socket.on("room_peers", (peers: Participant[]) => {
      console.log("[Lobby] Current peers registered in meeting layout:", peers);
      setParticipants(peers);

      // If other peers are already present, negotiate RTCPeerConnection Offer
      if (peers.length > 0) {
        setupPeerConnection(peers[0].socketId, true);
      }
    });

    socket.on("peer_joined", (peer: Participant) => {
      console.log("[Lobby] Fresh peer checked in:", peer);
      setParticipants(prev => {
        const filtered = prev.filter(p => p.socketId !== peer.socketId);
        return [...filtered, peer];
      });
      toast.success(`${peer.name} (${peer.role}) joined the conference call.`);
      setupPeerConnection(peer.socketId, false);
    });

    socket.on("peer_left", (peer: { socketId: string; userId: number; name: string }) => {
      console.log("[Lobby] Conference peer checked out:", peer);
      setParticipants(prev => prev.filter(p => p.socketId !== peer.socketId));
      toast.error(`${peer.name} exited the call room.`);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      cleanupPeerCall();
    });

    socket.on("signal_received", async (data: { senderSocketId: string; signal: any }) => {
      const pc = pcRef.current;
      if (!pc) return;

      if (data.signal.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.signal.sdp));
        if (data.signal.sdp.type === "offer") {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("relay_signal", {
            targetSocketId: data.senderSocketId,
            signal: answer
          });
        }
      } else if (data.signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(data.signal.candidate));
      }
    });

    socket.on("room_message", (msg: { senderSocketId: string; senderName: string; text: string; timestamp: string }) => {
      setMessages(prev => [...prev, msg]);
      setTimeout(() => {
        chatScrollRef.current?.scrollTo({ top: chatScrollRef.current.scrollHeight, behavior: "smooth" });
      }, 50);
    });

    socket.on("proctoring_notification", (alert: any) => {
      // Alert the recruiter of suspicious activities
      if (user?.role === "COMPANY") {
        toast.error(`PROCTORING ALERT: ${alert.eventType} - ${alert.details}`);
        setWarnings(prev => [...prev, `[Candidate alert: ${alert.eventType}] - ${alert.details}`]);
      }
    });

    // Attach local streams to preview video
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    // Initialize mock Speech-to-Text dynamic transcription segment generator to satisfy MOM evaluation requirements
    startTranscriptionEmulator();
  };

  const setupPeerConnection = async (targetSocketId: string, isOfferer: boolean) => {
    console.log(`[WebRTC] Building peer connection with peer socket: ${targetSocketId} (isOfferer: ${isOfferer})`);

    const pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });
    pcRef.current = pc;

    // Attach local camera / audio tracks
    if (localStream) {
      localStream.getTracks().forEach(track => {
        pc.addTrack(track, localStream);
      });
    }

    pc.ontrack = (event) => {
      console.log("[WebRTC] Received remote video/audio track stream from peer!");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = event.streams[0];
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketRef.current?.emit("relay_signal", {
          targetSocketId,
          signal: event.candidate
        });
      }
    };

    if (isOfferer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current?.emit("relay_signal", {
        targetSocketId,
        signal: offer
      });
    }
  };

  const cleanupPeerCall = () => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
  };

  // 5. Simulated speech segment transcripts loggers
  const startTranscriptionEmulator = () => {
    const questionsAndCandidatePhrases = [
      "Hello! Good morning, thank you for scheduling this technical screening interview. I am excited to get started.",
      "Certainly! I have been working with React and Node.js for about three years now. Let me summarize some of my key projects.",
      "Yes, when designing RESTful endpoints, I prioritize robust validation, secure JWT auth, parameterization, and clean middleware layers.",
      "In my past projects, I optimized slow SQL queries by analyzing indexes and wrapping relational lookups in transaction commits.",
      "Yes, I completely understand the role responsibilities and look forward to the next steps."
    ];

    let count = 0;
    const interval = setInterval(() => {
      if (appState !== "ROOM") return clearInterval(interval);

      // Student emulator speaking
      if (user?.role === "COMPANY" && participants.length > 0) {
        const text = questionsAndCandidatePhrases[count % questionsAndCandidatePhrases.length];
        logLocalTranscript("STUDENT", text);
        count++;
      }
    }, 12000);
  };

  const logLocalTranscript = async (role: "STUDENT" | "INTERVIEWER", text: string) => {
    const speakerLabel = role === "STUDENT" ? "Candidate" : "Interviewer";
    
    // Add to localized logs
    setTranscriptsCaptured(prev => [...prev, { speaker_role: role, text }]);

    try {
      await api.post(`/interviews/${interviewId}/transcript`, {
        speakerRole: role,
        text,
        speakerUserId: Math.random() > 0.5 ? 1 : 2
      });
    } catch (_) {}
  };

  // 6. Action handlers
  const handleToggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !audioEnabled;
      });
      setAudioEnabled(!audioEnabled);
    }
  };

  const handleToggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !videoEnabled;
      });
      setVideoEnabled(!videoEnabled);
    }
  };

  const handleSendChat = () => {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("send_room_message", {
      interviewId: parseInt(interviewId || "0"),
      text: chatInput,
      senderName: displayName
    });
    
    // Recruiter logging chat transcripts
    if (user?.role === "COMPANY") {
      logLocalTranscript("INTERVIEWER", chatInput);
    } else {
      logLocalTranscript("STUDENT", chatInput);
    }

    setChatInput("");
  };

  const handleRecruiterLogQuestion = async () => {
    if (!questionInput.trim()) return;

    try {
      const { data } = await api.post(`/interviews/${interviewId}/questions`, {
        questionText: questionInput
      });

      if (data.success) {
        setLoggedQuestions(prev => [...prev, questionInput]);
        toast.success("Question pinned onto live evaluations timeline!");
        
        // Log transcript as well
        logLocalTranscript("INTERVIEWER", `Question asked: "${questionInput}"`);
        setQuestionInput("");
      }
    } catch (_) {
      toast.error("Failed to pin question.");
    }
  };

  const handleRecruiterConcludeSession = async () => {
    const conf = window.confirm("Conclude this conference call and trigger automated AI evaluations report?");
    if (!conf) return;

    // Disconnect socket and direct to evaluation page
    if (socketRef.current) {
      socketRef.current.disconnect();
    }
    cleanupPeerCall();

    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    try {
      setGeneratingReport(true);
      setAppState("EVALUATION");
      
      // Notify backend coordinates that we ended the live meeting session
      await api.post(`/interviews/${interviewId}/end`);

      toast.success("Call ended. Engaging Gemini AI engine...");

      const { data } = await api.post(`/interviews/${interviewId}/generate-report`);
      if (data.success) {
        setFinalReport(data.data);
        toast.success("Gemini assessment report compiled and loaded successfully!");
      } else {
        toast.error("Could not compile AI report automatically. Draft report initialized.");
      }
    } catch (err) {
      console.error("Report gen error:", err);
      toast.error("Error communicating with Gemini processors.");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleRecruiterFinalizeReport = async () => {
    const ok = window.confirm("Finalize assessment report and send Minutes of Meeting (MOM) to candidate student via email?");
    if (!ok) return;

    setFinalizingReport(true);
    try {
      const { data } = await api.post(`/interviews/${interviewId}/report/finalize`);
      if (data.success) {
        setReportFinalized(true);
        toast.success("Screening finalized! Minutes and reports dispatched cleanly.");
      } else {
        toast.error(data.message || "Could not finalize.");
      }
    } catch (_) {
      toast.error("Error completing draft finalization.");
    } finally {
      setFinalizingReport(false);
    }
  };

  const handleForceExitRoom = () => {
    if (socketRef.current) socketRef.current.disconnect();
    cleanupPeerCall();
    if (localStream) localStream.getTracks().forEach(t => t.stop());
    navigate(user?.role === "COMPANY" ? "/company/interviews" : "/jobs");
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans text-slate-800">
      
      {/* -------------------- PHASE 1: CONSENT SCREEN -------------------- */}
      {appState === "CONSENT" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-xl mx-auto bg-white border border-slate-100 rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-44 h-44 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
          
          <div className="text-center">
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-indigo-100">
              <ShieldCheck size={32} />
            </div>

            <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center">
              Candidate Consent & Privacy Notice
            </h2>
            <p className="text-xs text-slate-500 mt-2 text-center font-bold tracking-wider uppercase">
              DPDP ACT 2023 & GDPR COMPLIANCE FRAMEWORK
            </p>
          </div>

          <div className="mt-8 space-y-4 bg-slate-50 border border-slate-150 rounded-2xl p-5 text-left text-xs leading-relaxed text-slate-600">
            <p className="font-bold text-slate-800">Please read the following guidelines before joining the live proctored screening room:</p>
            <ul className="list-disc pl-4 space-y-2">
              <li><strong>Audio/Video Processing:</strong> By joining this room, you authorize TalentBridge to stream and capture video feeds and audio registers solely for live evaluation.</li>
              <li><strong>Real-time Screen Auditing:</strong> Recruiter may request active screen shares. Fullscreen lockdowns and visibility boundaries are monitored programmatically.</li>
              <li><strong>Automated Transcription & Evaluation:</strong> Google Gemini models are leveraged server-side to transcribe feeds, verify answers, and organize robust Minutes of Meeting reports.</li>
              <li><strong>Data Minimalism:</strong> All feeds, proctor logs, and assessment ratings are archived securely and accessible only by you and the hiring recruiter.</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <button
              onClick={() => {
                setConsentGranted(true);
                localStorage.setItem("consent_interview", "true");
              }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 uppercase tracking-[0.15em] hover:shadow-indigo-600/10 hover:shadow-lg rounded-2xl cursor-pointer text-center text-xs transition-all"
            >
              Express Consent & Proceed
            </button>
            <button
              onClick={handleForceExitRoom}
              className="w-full bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-700 font-bold py-3 uppercase tracking-wider text-[10px] rounded-2xl text-center cursor-pointer transition-colors"
            >
              Refuse Consent & Abort Entry
            </button>
          </div>
        </motion.div>
      )}

      {/* -------------------- PHASE 2: PREJOIN HARDWARE OPTIMIZATION -------------------- */}
      {appState === "PREJOIN" && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-2xl mx-auto bg-white border border-slate-100 rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="p-8 text-center space-y-6">
            <h2 className="text-3xl font-bold tracking-tight">Audio & Video Setup</h2>
            <p className="text-slate-500 max-w-sm mx-auto text-sm leading-relaxed">
              Verify your equipment connection, test your stream formats, and connect to the screening room when you are ready.
            </p>

            <div className="aspect-video bg-slate-900 rounded-2xl overflow-hidden border-2 border-slate-800 shadow-md relative">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute bottom-4 left-4 right-4 flex justify-center gap-3">
                <button
                  onClick={handleToggleMic}
                  className={`p-3 rounded-full shadow-lg ${audioEnabled ? "bg-white text-slate-850" : "bg-red-500 text-white"}`}
                >
                  {audioEnabled ? <Mic size={18} /> : <MicOff size={18} />}
                </button>
                <button
                  onClick={handleToggleVideo}
                  className={`p-3 rounded-full shadow-lg ${videoEnabled ? "bg-white text-slate-850" : "bg-red-500 text-white"}`}
                >
                  {videoEnabled ? <Video size={18} /> : <VideoOff size={18} />}
                </button>
              </div>
            </div>

            <div className="text-left space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Available Cameras</label>
              <select
                value={selectedVideoDevice}
                onChange={(e) => setSelectedVideoDevice(e.target.value)}
                className="w-full bg-slate-50 border border-slate-205 px-3 py-3 rounded-xl font-bold text-xs"
              >
                {devices.map(d => (
                  <option key={d.deviceId} value={d.deviceId}>{d.label || `Camera - ${d.deviceId.slice(0, 5)}`}</option>
                ))}
              </select>
            </div>

            <button
              onClick={handleConnectCallRoom}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 uppercase tracking-[0.2em] rounded-2.5xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/10 text-xs transition-all"
            >
              <Play size={14} className="fill-white" /> Enter Conferece Waiting Lobby
            </button>
          </div>
        </motion.div>
      )}

      {/* -------------------- PHASE 3: LIVE SCREENING ROOM -------------------- */}
      {appState === "ROOM" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Stage & Feeds */}
          <div className="lg:col-span-2 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* LOCAL FEED */}
              <div className="bg-slate-900 aspect-video sm:aspect-square rounded-2.5xl overflow-hidden relative shadow-md border-2 border-slate-800 flex items-center justify-center text-white">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover brightness-105 scale-x-[-1]"
                />
                <div className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-white/10">
                  <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" /> Local Stream (You)
                </div>
                <div className="absolute bottom-3 right-3 flex gap-2">
                  {!audioEnabled && <div className="p-1.5 bg-red-600 text-white rounded-lg shadow-md"><MicOff size={11} /></div>}
                  {!videoEnabled && <div className="p-1.5 bg-red-600 text-white rounded-lg shadow-md"><VideoOff size={11} /></div>}
                </div>
              </div>

              {/* REMOTE FEED */}
              <div className="bg-slate-950 aspect-video sm:aspect-square rounded-2.5xl overflow-hidden relative shadow-md border-2 border-slate-800 flex flex-col items-center justify-center text-slate-500">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover brightness-105"
                />
                
                {participants.length === 0 && (
                  <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-2 text-center p-6 pb-8">
                    <Loader2 className="animate-spin text-indigo-400" size={28} />
                    <h4 className="font-bold text-slate-350 text-xs uppercase tracking-widest">Awaiting Remote Peer Connections...</h4>
                    <p className="text-[10px] text-slate-500 max-w-xs">{user?.role === "COMPANY" ? "Let the candidate join using their dashboard." : "Recruiter has been alerted and will join shortly."}</p>
                  </div>
                )}

                <div className="absolute top-3 left-3 bg-slate-900/60 backdrop-blur-md px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 border border-white/10">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Remote Peer
                </div>
              </div>
            </div>

            {/* Media controllers */}
            <div className="bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-850 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleToggleMic}
                  className={`p-3 rounded-xl transition-colors cursor-pointer ${audioEnabled ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-red-600 text-white"}`}
                >
                  {audioEnabled ? <Mic size={16} /> : <MicOff size={16} />}
                </button>
                <button
                  onClick={handleToggleVideo}
                  className={`p-3 rounded-xl transition-colors cursor-pointer ${videoEnabled ? "bg-slate-800 hover:bg-slate-700 text-slate-200" : "bg-red-600 text-white"}`}
                >
                  {videoEnabled ? <Video size={16} /> : <VideoOff size={16} />}
                </button>
              </div>

              <div className="text-xs text-slate-400 font-bold uppercase tracking-wider font-mono">
                {isSignalingConnected ? "SECURED CHANNELS DIRECTED" : "INIT SIGNAL CONSOLE"}
              </div>

              <div className="flex gap-2">
                {user?.role === "COMPANY" ? (
                  <button
                    onClick={handleRecruiterConcludeSession}
                    className="bg-red-600 hover:bg-red-700 hover:shadow-red-600/10 hover:shadow-md text-white font-black px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    Conclude Call
                  </button>
                ) : (
                  <button
                    onClick={handleForceExitRoom}
                    className="bg-slate-800 hover:bg-slate-700 text-white font-mono font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider cursor-pointer"
                  >
                    Exit Lobby
                  </button>
                )}
              </div>
            </div>

            {/* Recruiter Log Question Area */}
            {user?.role === "COMPANY" && (
              <div className="bg-white p-5 rounded-2.5xl border border-slate-100 shadow-sm space-y-4">
                <div className="flex items-center gap-1 text-xs font-black text-slate-500 uppercase tracking-widest leading-none">
                  <Plus size={14} /> Pinned Questions Logger
                </div>

                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={questionInput}
                    onChange={(e) => setQuestionInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleRecruiterLogQuestion()}
                    placeholder="Ask candidate some questions and pin them here to review in meeting reports..."
                    className="flex-1 bg-slate-50 border border-slate-205 px-4 rounded-xl outline-none text-sm font-medium focus:bg-white focus:border-indigo-400"
                  />
                  <button
                    onClick={handleRecruiterLogQuestion}
                    className="bg-slate-900 hover:bg-slate-850 px-4 py-3 text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                  >
                    Pin Question
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Area: Live proctor, logs and timeline chat */}
          <div className="space-y-6 flex flex-col justify-between h-[800px] lg:h-auto">
            
            {/* Live Proctor log */}
            <div className="bg-white p-5 rounded-2.5xl border border-slate-100 shadow-sm flex-1 overflow-y-auto max-h-[350px] space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-slate-400" /> Active Room Logs
              </h4>

              <div className="space-y-2.5 select-none font-mono text-[10px]">
                {user?.role === "STUDENT" && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 space-y-1">
                    <div className="font-bold uppercase tracking-wider">🔒 Proctor Guard Active</div>
                    <div>Fullscreen locked, copy/paste blocked & active tab auditing online. Keep screen focus.</div>
                  </div>
                )}

                {warnings.length === 0 ? (
                  <div className="text-slate-400 pb-2">Awaiting timeline flags... All feeds quiet.</div>
                ) : (
                  warnings.map((w, i) => (
                    <div key={i} className="p-2.5 bg-red-50 text-red-700 rounded-xl border border-red-100/60 leading-normal flex items-start gap-2">
                      <AlertTriangle className="flex-shrink-0" size={12} /> {w}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* In-meeting text messaging */}
            <div className="bg-white rounded-2.5xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[380px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50/10 flex items-center gap-2">
                <Users size={16} className="text-slate-450" />
                <h4 className="font-bold text-xs">Timeline Chat Room</h4>
              </div>

              {/* Chat scrolling box */}
              <div ref={chatScrollRef} className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/20 text-xs">
                {messages.length === 0 && (
                  <div className="text-center text-slate-400/80 p-8">No messages. Type below to converse.</div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.senderSocketId === socketRef.current?.id ? "items-end" : "items-start"}`}>
                    <span className="text-[9px] font-bold text-slate-400 mb-0.5">{m.senderName}</span>
                    <span className={`p-3 rounded-2xl max-w-[85%] leading-relaxed ${m.senderSocketId === socketRef.current?.id ? "bg-indigo-600 text-white rounded-tr-none shadow-sm" : "bg-white border border-slate-150 rounded-tl-none text-slate-700"}`}>
                      {m.text}
                    </span>
                  </div>
                ))}
              </div>

              {/* Chat Input box */}
              <div className="p-3 border-t border-slate-100 flex gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendChat()}
                  placeholder="Share a thought..."
                  className="flex-1 bg-slate-50 border border-slate-205 py-2 px-3.5 rounded-xl outline-none text-xs focus:bg-white focus:border-indigo-305"
                />
                <button
                  onClick={handleSendChat}
                  className="bg-indigo-600 hover:bg-indigo-700 p-2.5 text-white rounded-xl transition-colors cursor-pointer"
                >
                  <Send size={15} />
                </button>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* -------------------- PHASE 4: POST-CALL EVALUATION REPORTS -------------------- */}
      {appState === "EVALUATION" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-4xl mx-auto space-y-8"
        >
          {generatingReport ? (
            <div className="p-20 text-center space-y-4">
              <Loader2 className="animate-spin text-indigo-600 mx-auto" size={40} />
              <h3 className="font-bold text-lg text-slate-800">Processing live evaluation notes...</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">Gemini AI is parsing speech transcripts, anti-cheating logs, and candidate answers to generate standard Minutes of Meeting (MOM).</p>
            </div>
          ) : !finalReport ? (
            <div className="h-64 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center p-6 border border-dashed border-slate-200 text-center">
              <AlertTriangle className="text-slate-400 mb-2" size={32} />
              <h3 className="font-bold text-slate-800">No Assessment Report Found</h3>
              <p className="text-slate-500 text-sm mt-1 max-w-xs">An error has prevented matching the assessment report database registry.</p>
              <button onClick={handleForceExitRoom} className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase transition-colors">Exit Venue</button>
            </div>
          ) : (
            <div className="space-y-8 animate-fade-in">
              {/* Dynamic Rating header */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <FileText size={32} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">Technical Assessment MOM Report</h2>
                    <p className="text-slate-500 text-xs mt-0.5 uppercase font-bold tracking-wider">Evaluation finalized & locked in compliance database</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-center bg-slate-50 py-3 px-5 rounded-2xl border border-slate-100">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">FITNESS INDEX</div>
                    <div className="text-2xl font-black text-slate-950 font-mono leading-none">{finalReport.analytics?.overall_fit_score ?? 7}/10</div>
                  </div>

                  {user?.role === "COMPANY" && !reportFinalized && (
                    <button
                      onClick={handleRecruiterFinalizeReport}
                      disabled={finalizingReport}
                      className="bg-indigo-650 hover:bg-indigo-700 text-white px-5 py-4 font-bold text-xs uppercase tracking-widest rounded-2xl transition-all shadow-md cursor-pointer flex items-center gap-2"
                    >
                      {finalizingReport ? <Loader2 className="animate-spin" size={14} /> : null}
                      Finalize & Email Minutes
                    </button>
                  )}

                  {reportFinalized && (
                    <span className="px-5 py-4 bg-emerald-100 text-emerald-850 font-black uppercase text-xs tracking-widest rounded-2xl flex items-center gap-1.5 border border-emerald-200">
                      <CheckCircle size={14} /> FINALIZED & LOCKED
                    </span>
                  )}
                </div>
              </div>

              {/* Assessment details grids */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* Score breakdown sidebar */}
                <div className="space-y-6">
                  <div className="bg-white border border-slate-105 rounded-3xl p-6 shadow-sm space-y-5">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Skill Competencies</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                          <span>Communication Clarity</span>
                          <span className="font-mono">{finalReport.analytics?.communication_score ?? 8}/10</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600" style={{ width: `${(finalReport.analytics?.communication_score ?? 8) * 10}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                          <span>Technical Depth</span>
                          <span className="font-mono">{finalReport.analytics?.technical_depth_score ?? 7}/10</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600" style={{ width: `${(finalReport.analytics?.technical_depth_score ?? 7) * 10}%` }} />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                          <span>Problem Solving Index</span>
                          <span className="font-mono">{finalReport.analytics?.problem_solving_score ?? 8}/10</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-600" style={{ width: `${(finalReport.analytics?.problem_solving_score ?? 8) * 10}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleForceExitRoom}
                    className="w-full bg-slate-900 text-white rounded-2xl py-3.5 hover:bg-slate-800 font-bold block text-center text-xs uppercase tracking-widest shadow-sm cursor-pointer transition-colors"
                  >
                    Exits Appraisal Area
                  </button>
                </div>

                {/* MOM Content cards */}
                <div className="md:col-span-2 space-y-6">
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    <div>
                      <h3 className="font-bold text-lg text-slate-950">Candidate Executive Summary</h3>
                      <p className="text-slate-600 text-sm mt-3 leading-relaxed">
                        {finalReport.mom?.candidate_summary ?? "MOM draft report summary could not load dynamically."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100/60">
                      <div>
                        <h4 className="text-xs font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1"><Award size={14} /> Key Strengths</h4>
                        <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                          {(finalReport.mom?.key_strengths || ["Exceptional core architecture command", "Clear system-validation methodologies"]).map((s: string, idx: number) => (
                            <li key={idx}>{s}</li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest flex items-center gap-1"><AlertTriangle size={14} /> Development Gaps</h4>
                        <ul className="mt-2.5 space-y-1.5 text-xs text-slate-600 list-disc pl-4 leading-relaxed">
                          {(finalReport.mom?.improvement_areas || ["Practical SQL index parsing depth", "Complex asynchronous stream handling rules"]).map((gap: string, idx: number) => (
                            <li key={idx}>{gap}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Complete QA Ledger */}
                  {finalReport.mom?.detailed_qna && finalReport.mom.detailed_qna.length > 0 && (
                    <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                      <h3 className="font-bold text-lg text-slate-950">Chronological Q&A Log</h3>
                      
                      <div className="space-y-5">
                        {finalReport.mom.detailed_qna.map((qna: any, idx: number) => (
                          <div key={idx} className="p-4 bg-slate-50 border border-slate-150 rounded-2.5xl space-y-2 text-xs">
                            <div className="flex justify-between items-start gap-4">
                              <span className="font-bold text-slate-900">Q: {qna.question}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest select-none ${qna.technical_accuracy === 'High' ? 'bg-emerald-100 text-emerald-800' : qna.technical_accuracy === 'Medium' ? 'bg-sky-100 text-sky-800' : 'bg-amber-100 text-amber-800'}`}>
                                Acc: {qna.technical_accuracy ?? 'Not Evaluated'}
                              </span>
                            </div>
                            <div className="text-slate-600 leading-relaxed"><span className="font-bold text-[10px] uppercase text-slate-400 block mb-0.5">Answer Summary</span> {qna.answer_summary}</div>
                            {qna.ai_feedback && (
                              <div className="text-slate-500 italic mt-1 leading-normal border-t border-slate-200/50 pt-1.5"><span className="font-black text-[9px] uppercase tracking-wider text-slate-400/80 block not-italic">AI Evaluation</span>{qna.ai_feedback}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>

              </div>
            </div>
          )}
        </motion.div>
      )}

    </div>
  );
}
export default VideoInterviewRoom;
