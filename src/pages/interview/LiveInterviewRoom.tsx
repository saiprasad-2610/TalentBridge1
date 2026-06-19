import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  MessageSquare, 
  Send, 
  Users, 
  CheckCircle,
  AlertTriangle,
  Smile,
  Loader2
} from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import toast from "react-hot-toast";

interface InterviewDetails {
  id: number;
  applicationId: number;
  interviewType: string;
  scheduledAt: string;
  status: string;
  jobTitle: string;
  studentName: string;
  companyName: string;
  notes: string;
}

export function LiveInterviewRoom() {
  const { interviewId } = useParams<{ interviewId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();

  const [interview, setInterview] = useState<InterviewDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorHeader, setErrorHeader] = useState<string | null>(null);

  // Stream States
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMicEnabled, setIsMicEnabled] = useState(true);
  const [isCamEnabled, setIsCamEnabled] = useState(true);
  
  // Connection / Remote state
  const [connectionStatus, setConnectionStatus] = useState<"WAITING" | "CONNECTING" | "CONNECTED" | "LEFT">("WAITING");
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<Array<{ sender: string; text: string; time: string }>>([]);
  const [typedMessage, setTypedMessage] = useState("");

  // Refs for tracking connections & DOM elements
  const socketRef = useRef<Socket | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Load Room Info over REST
  useEffect(() => {
    const fetchRoomDetails = async () => {
      try {
        const response = await api.get(`/interviews/${interviewId}/room`);
        if (response.data?.success) {
          setInterview(response.data.interview);
          setLoading(false);
          
          // Request camera and microphone access
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            localStreamRef.current = stream;
            setLocalStream(stream);
            if (localVideoRef.current) {
              localVideoRef.current.srcObject = stream;
            }
          } catch (mediaErr) {
            console.error("Camera/Microphone Permission Denied:", mediaErr);
            toast.error("Could not obtain Camera or Microphone. Please permit permissions.");
          }
        } else {
          setErrorHeader(response.data?.message || "Could not load meeting room details.");
          setLoading(false);
        }
      } catch (err: any) {
        console.error("Error accessing video room:", err);
        setErrorHeader(err.response?.data?.message || "Unauthorized access or invalid room.");
        setLoading(false);
      }
    };

    fetchRoomDetails();

    return () => {
      // Clean up any remaining tracks
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (pcRef.current) {
        pcRef.current.close();
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [interviewId]);

  // Handle Socket & Peer Connection setup
  useEffect(() => {
    if (!interview || !token) return;

    // Connect socket
    const socket = io({
      auth: { token }
    });
    socketRef.current = socket;

    // Join room
    socket.emit("interview:join-room", { token, interviewId });

    socket.on("interview:joined", () => {
      console.log("Joined socket signaling room successfully");
    });

    socket.on("interview:error", (data: any) => {
      toast.error(data.message || "Failed to establish signaling session.");
    });

    // When other user joins
    socket.on("interview:user-joined", (peer: any) => {
      setConnectionStatus("CONNECTING");
      toast.success(`${peer.role === 'STUDENT' ? 'Student' : 'Interviewer'} joined the call`);
    });

    // Ready signal emitted when both peers are present
    socket.on("interview:ready", async () => {
      console.log("Both participants are ready. Setting up RTCPeerConnection.");
      setConnectionStatus("CONNECTING");
      initializePeerConnection();
    });

    // Signaling signal handlers
    socket.on("rtc:offer", async (offer) => {
      console.log("Received RTC Offer");
      if (!pcRef.current) {
        initializePeerConnection(false); // Student creates answering connection
      }
      try {
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(offer));
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socket.emit("rtc:answer", answer);
        }
      } catch (err) {
        console.error("Error responding to RTC Offer:", err);
      }
    });

    socket.on("rtc:answer", async (answer) => {
      console.log("Received RTC Answer");
      if (pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error("Error setting remote answer:", err);
        }
      }
    });

    socket.on("rtc:ice-candidate", async (candidate) => {
      if (pcRef.current) {
        try {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error("Error setting ICE candidate:", err);
        }
      }
    });

    socket.on("interview:user-left", (peer: any) => {
      setConnectionStatus("LEFT");
      setRemoteStream(null);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
      toast.error(`${peer.role === 'STUDENT' ? 'Student' : 'Interviewer'} has left the call`);
    });

    socket.on("interview:ended", () => {
      toast.success("This interview session has been ended by the host.");
      setTimeout(() => {
        exitRoom();
      }, 1500);
    });

    // Messaging events channel
    socket.on("chat:message", (msg: { sender: string; text: string; time: string }) => {
      setChatMessages(prev => [...prev, msg]);
      if (!isChatOpen) {
        toast("New chat message received", { icon: "💬" });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [interview]);

  // Setup Peer Connection
  const initializePeerConnection = async (isInitiator = user?.role !== 'STUDENT') => {
    if (pcRef.current) return;

    console.log(`Setting up RTCPeerConnection. Initiator: ${isInitiator}`);
    
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
      ]
    });

    pcRef.current = pc;

    // Watch ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socketRef.current) {
        socketRef.current.emit("rtc:ice-candidate", event.candidate);
      }
    };

    // Connection state checks
    pc.onconnectionstatechange = () => {
      console.log("WebRTC Connection State changed:", pc.connectionState);
      if (pc.connectionState === "connected") {
        setConnectionStatus("CONNECTED");
      } else if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
        setConnectionStatus("CONNECTING"); // Try candidate reconnects or show waiting
      }
    };

    // Attach local streams
    const stream = localStreamRef.current;
    if (stream) {
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });
    }

    // Attach remote streams
    pc.ontrack = (event) => {
      console.log("Received remote audio/video tracks");
      if (event.streams && event.streams[0]) {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      }
    };

    // Trigger offer if initiator
    if (isInitiator) {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        if (socketRef.current) {
          socketRef.current.emit("rtc:offer", offer);
        }
      } catch (err) {
        console.error("Failed to create offer:", err);
      }
    }
  };

  // Toggle local streams
  const toggleMic = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const audioTrack = stream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMicEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    const stream = localStreamRef.current;
    if (stream) {
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCamEnabled(videoTrack.enabled);
      }
    }
  };

  // Exit actions
  const exitRoom = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (user?.role === 'STUDENT') {
      navigate("/applied-jobs");
    } else {
      navigate("/company/interviews");
    }
  };

  const leaveCallHandler = () => {
    if (socketRef.current) {
      socketRef.current.emit("interview:end-call");
    }
    exitRoom();
  };

  const endCallByCompany = async () => {
    if (!window.confirm("Are you sure you want to end and conclude this interview session for everyone?")) return;
    try {
      // 1. Call API to mark completed
      await api.post(`/interviews/${interviewId}/end`);
      
      // 2. Emit end session via socket
      if (socketRef.current) {
        socketRef.current.emit("interview:end-call");
      }
      toast.success("Meeting concluded successfully!");
      setTimeout(() => {
        exitRoom();
      }, 1000);
    } catch (e) {
      console.error("Error ending interview session:", e);
      toast.error("An error occurred while terminating this session.");
    }
  };

  // Send Chat message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current) return;

    const messagePayload = {
      sender: user?.role === 'STUDENT' ? 'Student' : 'Interviewer',
      text: typedMessage,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    socketRef.current.emit("chat:message", messagePayload);
    setChatMessages(prev => [...prev, messagePayload]);
    setTypedMessage("");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#090D1C] flex flex-col items-center justify-center text-white p-6">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-4" />
        <h3 className="text-xl font-black uppercase tracking-widest text-[#93C5FD]">Securing Connection</h3>
        <p className="text-sm text-slate-400 mt-2">Loading live calling encryption room...</p>
      </div>
    );
  }

  if (errorHeader) {
    return (
      <div className="min-h-screen bg-[#090D1C] flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-16 h-16 bg-red-500/15 text-red-400 rounded-3xl flex items-center justify-center mb-6 border border-red-500/25">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-2xl font-black uppercase tracking-wider text-rose-400">Join Forbidden</h3>
        <p className="text-sm text-slate-400 mt-2 max-w-md leading-relaxed">{errorHeader}</p>
        <button 
          onClick={() => navigate(user?.role === 'STUDENT' ? '/applied-jobs' : '/company/interviews')}
          className="mt-8 px-8 py-3 bg-[#1E293B] hover:bg-slate-700 font-extrabold uppercase tracking-widest text-xs text-white rounded-xl shadow-lg transition-all"
        >
          Return to Hub
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070913] text-white flex flex-col overflow-hidden relative font-sans">
      {/* Immersive Glowing Accents */}
      <div className="absolute top-1/10 left-1/4 w-[40rem] h-[40rem] bg-indigo-500/5 rounded-full blur-[150px] pointer-events-none select-none"></div>
      <div className="absolute bottom-1/10 right-1/4 w-[35rem] h-[35rem] bg-indigo-600/5 rounded-full blur-[140px] pointer-events-none select-none"></div>

      {/* Top Header Panel */}
      <header className="px-6 py-4 bg-slate-950/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-indigo-600 flex items-center justify-center font-black text-white text-lg shadow-[0_4px_20px_rgba(99,102,241,0.25)]">
            TB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-extrabold text-[#38BDF8] tracking-widest">Live Video Interview</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <h1 className="text-base font-black uppercase tracking-tight text-white mt-0.5">
              {interview?.jobTitle} • {interview?.companyName}
            </h1>
          </div>
        </div>

        {/* Meeting States */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-1.5 rounded-full border text-[10px] font-extrabold uppercase tracking-widest flex items-center gap-2 select-none ${
            connectionStatus === "CONNECTED" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
            connectionStatus === "CONNECTING" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
            "bg-slate-800/50 text-slate-400 border-slate-700/50"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              connectionStatus === "CONNECTED" ? "bg-emerald-400" :
              connectionStatus === "CONNECTING" ? "bg-amber-400 animate-pulse" :
              "bg-slate-500"
            }`}></span>
            {connectionStatus === "CONNECTED" ? "Protected Connection" :
             connectionStatus === "CONNECTING" ? "Configuring Signaling..." :
             "Awaiting Participant"}
          </div>

          <button 
            onClick={() => setIsChatOpen(!isChatOpen)}
            className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 text-slate-300 flex items-center justify-center hover:bg-slate-800 transition-all select-none"
            title="Toggle Inside-App Chat Window"
          >
            <MessageSquare size={16} />
          </button>
        </div>
      </header>

      {/* Primary Video Panels Workspace */}
      <div className="flex-1 flex overflow-hidden p-6 gap-6 relative z-10">
        <div className="flex-1 flex flex-col min-w-0 h-full relative bg-slate-950/30 rounded-[32px] border border-white/5 overflow-hidden">
          
          {/* Main Stage (Shows Remote Cam if existing, else local or waiting) */}
          <div className="flex-1 w-full h-full relative flex items-center justify-center bg-[#0d0f1c]/30">
            {remoteStream ? (
              <video 
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover rounded-[32px]"
              />
            ) : (
              // Waiting Placeholder View
              <div className="text-center p-6">
                <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/10 border border-indigo-500/15 flex items-center justify-center mx-auto mb-6">
                  <Smile className="w-10 h-10 text-indigo-400 animate-bounce" />
                </div>
                <h4 className="text-lg font-black uppercase tracking-widest text-[#93C5FD]">
                  {user?.role === 'STUDENT' ? "Waiting for Interviewer" : "Awaiting Candidate"}
                </h4>
                <p className="text-xs text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                  Join using the same room credentials. Let's make sure your camera is clean and your audio is clear before they hop in!
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/5 text-indigo-400 text-[10px] font-black uppercase tracking-wider rounded-full border border-indigo-500/10 mt-6 animate-pulse">
                  Ready to link
                </div>
              </div>
            )}

            {/* Float Local Cam Video Box */}
            <div className="absolute right-6 bottom-6 w-44 h-56 md:w-56 md:h-72 bg-[#090D1C] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-20">
              {localStream && isCamEnabled ? (
                <video 
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 p-4 text-center">
                  <VideoOff className="w-6 h-6 text-slate-500 mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Camera Tamed</p>
                </div>
              )}
              <div className="absolute bottom-3 left-3 bg-[#070913]/80 backdrop-blur px-2.5 py-1 rounded-lg border border-white/5">
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-indigo-300 truncate max-w-[120px]">
                  You ({user?.role === 'STUDENT' ? 'Student' : 'Interviewer'})
                </p>
              </div>
            </div>

            {/* Display names overlay on stage */}
            {remoteStream && (
              <div className="absolute left-6 bottom-6 bg-[#070913]/80 backdrop-blur px-5 py-2 rounded-2xl border border-white/5 z-20">
                <p className="text-xs font-black uppercase tracking-wider text-slate-300">
                  Active Feed: {user?.role === 'STUDENT' ? interview?.companyName : interview?.studentName}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Drawer Sidepanel */}
        {isChatOpen && (
          <div className="w-80 md:w-96 bg-slate-950/40 border border-white/5 rounded-[32px] backdrop-blur-md overflow-hidden flex flex-col z-20">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={16} className="text-indigo-400" />
                <h3 className="font-extrabold uppercase tracking-widest text-xs text-white">Live Room chat</h3>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
            </div>

            {/* Scrollable Chat Area */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.length === 0 ? (
                <div className="h-full flex flex-col justify-center items-center text-center p-4">
                  <MessageSquare className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">No Messages Yet</p>
                  <p className="text-[9px] text-slate-400 max-w-[180px] mt-1 leading-normal">
                    Shoot a supportive test message, share coding links, or note notes here during the interview.
                  </p>
                </div>
              ) : (
                chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex flex-col ${msg.sender === (user?.role === 'STUDENT' ? 'Student' : 'Interviewer') ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">{msg.sender}</span>
                      <span className="text-[8px] text-slate-500">{msg.time}</span>
                    </div>
                    <div className={`p-3 max-w-[85%] rounded-2xl text-xs leading-relaxed ${
                      msg.sender === (user?.role === 'STUDENT' ? 'Student' : 'Interviewer') 
                        ? 'bg-indigo-600 text-white rounded-tr-none' 
                        : 'bg-slate-800 text-slate-200 rounded-tl-none'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Typing input form */}
            <form onSubmit={handleSendMessage} className="p-4 border-t border-white/5 flex gap-2">
              <input 
                type="text"
                placeholder="Type your message..."
                value={typedMessage}
                onChange={e => setTypedMessage(e.target.value)}
                className="flex-1 bg-[#0E1325] border border-white/5 px-4 py-3 text-xs text-white rounded-xl focus:outline-none focus:border-indigo-500"
              />
              <button 
                type="submit"
                className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center hover:bg-indigo-500 transition-all text-white"
              >
                <Send size={14} />
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Control Actions Bottom Panel */}
      <footer className="p-6 bg-slate-950/60 backdrop-blur-md border-t border-white/5 flex flex-col md:flex-row items-center justify-between z-10 gap-4 shrink-0">
        
        {/* Info label */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-slate-900 border border-white/5 rounded-lg flex items-center justify-center text-indigo-400">
            <Users size={14} />
          </div>
          <div>
            <p className="text-[8px] font-black uppercase tracking-widest text-[#38BDF8]">Assigned Interview</p>
            <p className="text-xs font-bold text-slate-300">{interview?.studentName}</p>
          </div>
        </div>

        {/* Media Toggle & Call Buttons */}
        <div className="flex items-center gap-4">
          <button 
            onClick={toggleMic}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
              isMicEnabled ? "bg-slate-900 border-white/5 text-slate-200 hover:bg-slate-800" : "bg-rose-500/15 border-rose-500/20 text-rose-400 hover:bg-rose-500/25"
            }`}
            title={isMicEnabled ? "Mute Microphone" : "Unmute Microphone"}
          >
            {isMicEnabled ? <Mic size={18} /> : <MicOff size={18} />}
          </button>

          <button 
            onClick={toggleCam}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all ${
              isCamEnabled ? "bg-slate-900 border-white/5 text-slate-200 hover:bg-slate-800" : "bg-rose-500/15 border-rose-500/20 text-rose-400 hover:bg-rose-500/25"
            }`}
            title={isCamEnabled ? "Camera On" : "Camera Off"}
          >
            {isCamEnabled ? <Video size={18} /> : <VideoOff size={18} />}
          </button>

          <div className="w-px h-8 bg-white/5 mx-2"></div>

          {/* Leave/Disconnect Trigger */}
          <button 
            onClick={leaveCallHandler}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-100 font-extrabold uppercase tracking-widest text-[10px] rounded-xl border border-white/5 shadow-lg transition-all flex items-center gap-2"
            title="Leave Call gracefully"
          >
            Leave Call <PhoneOff size={14} className="text-rose-400" />
          </button>

          {/* End Call for All (Company Host Action) */}
          {(user?.role === 'COMPANY' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
            <button 
              onClick={endCallByCompany}
              className="px-8 py-3 bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 font-black uppercase tracking-widest text-[10px] text-white rounded-xl shadow-[0_4px_20px_rgba(244,63,94,0.25)] transition-all flex items-center gap-2"
              title="End call for all participants"
            >
              Conclude Session <CheckCircle size={14} />
            </button>
          )}
        </div>

        {/* Powered block placeholder */}
        <div className="hidden md:block select-none pointer-events-none">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none text-right">TalentBridge Secured Rooms</p>
          <span className="text-[8px] text-slate-600 font-black uppercase tracking-widest text-right block mt-1">E2E WEBRTC Encrypted</span>
        </div>
      </footer>
    </div>
  );
}
export default LiveInterviewRoom;
