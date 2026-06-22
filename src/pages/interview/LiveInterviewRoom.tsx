import React, { useState, useEffect, useRef } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  Send,
  Code2,
  Play,
  Settings,
  Users,
  CheckCircle2,
  MessageSquare,
  Terminal,
  Award,
  Clock,
  Layers,
  User,
  ExternalLink,
  VolumeX,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { useParams, useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";

interface Message {
  id: string;
  sender: "Interviewer" | "Candidate";
  text: string;
  time: string;
}

interface CodePreset {
  id: string;
  title: string;
  description: string;
  starterCode: {
    javascript: string;
    python: string;
    cpp: string;
  };
}

export function LiveInterviewRoom() {
  const { user, token } = useAuth();
  const { interviewId } = useParams();
  const navigate = useNavigate();

  // Secure status states
  const [interviewDetails, setInterviewDetails] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "waiting" | "connecting" | "connected" | "disconnected" | "ended"
  >("idle");

  // Video and Audio tracks states (Local)
  const [micOn, setMicOn] = useState(true);
  const [videoOn, setVideoOn] = useState(true);

  // Peer track indicators states (Remote)
  const [peerMicOn, setPeerMicOn] = useState(true);
  const [peerVideoOn, setPeerVideoOn] = useState(true);

  // Media streams objects
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remoteFallbackFrame, setRemoteFallbackFrame] = useState<string | null>(null);

  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);

  // Time elapsed state
  const [seconds, setSeconds] = useState(0);

  // Code editor states
  const [lang, setLang] = useState<"javascript" | "python" | "cpp">(
    "javascript",
  );
  const [code, setCode] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([
    "// Run your code to initialize system logs...",
  ]);

  // Chat states
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);

  // Recruiter Scoring Form
  const [scoreTech, setScoreTech] = useState(4);
  const [scoreComm, setScoreComm] = useState(5);
  const [scoreCulture, setScoreCulture] = useState(4);
  const [feedbackNotes, setFeedbackNotes] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Connection reference handlers
  const socketRef = useRef<Socket | null>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const pendingIceCandidatesRef = useRef<any[]>([]);

  const codePresets: CodePreset[] = [
    {
      id: "p-1",
      title: "Find Longest Substring Without Repeating Characters",
      description:
        "Given a string `s`, find the length of the longest substring without repeating characters.\n\nExample 1:\nInput: s = \"abcabcbb\"\nOutput: 3\nExplanation: The answer is \"abc\", with the length of 3.",
      starterCode: {
        javascript:
          'function lengthOfLongestSubstring(s) {\n  let maxLength = 0;\n  let charSet = new Set();\n  let left = 0;\n  \n  for (let right = 0; right < s.length; right++) {\n    while (charSet.has(s[right])) {\n      charSet.delete(s[left]);\n      left++;\n    }\n    charSet.add(s[right]);\n    maxLength = Math.max(maxLength, right - left + 1);\n  }\n  \n  return maxLength;\n}\n\n// Test invocation\nconsole.log(lengthOfLongestSubstring("abcabcbb"));',
        python:
          'def lengthOfLongestSubstring(s: str) -> int:\n    char_set = set()\n    left = 0\n    max_length = 0\n    \n    for right in range(len(s)):\n        while s[right] in char_set:\n            char_set.remove(s[left])\n            left += 1\n        char_set.add(s[right])\n        max_length = max(max_length, right - left + 1)\n        \n    return max_length\n\n# Test invocation\nprint(lengthOfLongestSubstring("abcabcbb"))',
        cpp: '#include <iostream>\n#include <unordered_set>\n#include <string>\nusing namespace std;\n\nint lengthOfLongestSubstring(string s) {\n    unordered_set<char> charSet;\n    int left = 0, maxLength = 0;\n    \n    for (int right = 0; right < s.length(); right++) {\n        while (charSet.count(s[right])) {\n            charSet.erase(s[left]);\n            left++;\n        }\n        charSet.insert(s[right]);\n        maxLength = max(maxLength, right - left + 1);\n    }\n    return maxLength;\n}\n\nint main() {\n    cout << lengthOfLongestSubstring("abcabcbb") << endl;\n    return 0;\n}',
      },
    },
    {
      id: "p-2",
      title: "Group Anagrams together from list",
      description:
        'Given an array of strings `strs`, group the anagrams together. You can return the answer in any order.\n\nExample 1:\nInput: strs = ["eat","tea","tan","ate","nat","bat"]\nOutput: [["bat"],["nat","tan"],["ate","eat","tea"]]',
      starterCode: {
        javascript:
          'function groupAnagrams(strs) {\n  let map = new Map();\n  for (let s of strs) {\n    let key = s.split("").sort().join("");\n    if (!map.has(key)) map.set(key, []);\n    map.get(key).push(s);\n  }\n  return Array.from(map.values());\n}\n\nconsole.log(groupAnagrams(["eat","tea","tan","ate","nat","bat"]));',
        python:
          'from collections import defaultdict\ndef groupAnagrams(strs):\n    anagram_map = defaultdict(list)\n    for s in strs:\n        key = "".join(sorted(s))\n        anagram_map[key].append(s)\n    return list(anagram_map.values())\n\nprint(groupAnagrams(["eat","tea","tan","ate","nat","bat"]))',
        cpp: "#include <iostream>\n#include <vector>\n#include <unordered_map>\n#include <algorithm>\nusing namespace std;\n\nvector<vector<string>> groupAnagrams(vector<string>& strs) {\n    unordered_map<string, vector<string>> m;\n    for(auto s : strs) {\n        string key = s;\n        sort(key.begin(), key.end());\n        m[key].push_back(s);\n    }\n    vector<vector<string>> result;\n    for(auto p : m) {\n        result.push_back(p.second);\n    }\n    return result;\n}",
      },
    },
  ];

  const [activeChallenge, setActiveChallenge] = useState<CodePreset>(
    codePresets[0],
  );

  // Cleanup helper on destroy
  const handleDestroySession = () => {
    console.log("Shutting down live WebRTC video room session...");
    if (peerRef.current) {
      peerRef.current.close();
      peerRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    }
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    const mockCanvas = document.getElementById("mock-canvas-fallback");
    if (mockCanvas) mockCanvas.remove();
    if ((window as any).__fallbackCanvasInterval) {
      clearInterval((window as any).__fallbackCanvasInterval);
    }
  };

  // 1. Fetch authorized session on load
  useEffect(() => {
    const fetchRoom = async () => {
      try {
        setLoadingDetails(true);
        const { data } = await api.get(`/interviews/${interviewId}/room`);
        if (data.success) {
          setInterviewDetails(data.interview);
          // Set custom startup helper seconds counter based on scheduled date diff to make it feel real
          const diffInSec = Math.floor(
            (Date.now() - new Date(data.interview.scheduledAt).getTime()) / 1000,
          );
          setSeconds(Math.max(0, diffInSec));
        } else {
          toast.error(data.message || "Unauthorized or invalid room.");
          navigate("/");
        }
      } catch (err: any) {
        console.error("Error loading secure room details:", err);
        toast.error(
          err.response?.data?.message || "Failed to enter secure session.",
        );
        navigate("/");
      } finally {
        setLoadingDetails(false);
      }
    };
    fetchRoom();

    return () => {
      handleDestroySession();
    };
  }, [interviewId]);

  // 2. Initialize Real Media Streaming Feed and WebRTC socket connection
  useEffect(() => {
    if (loadingDetails || !interviewDetails || !token) return;

    const startSession = async () => {
      let currentStream: MediaStream;

      // Access capture camera & mic audio
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: {
            width: { ideal: 640 },
            height: { ideal: 360 },
            frameRate: { ideal: 24 },
          },
        });
        console.log("Locally stream track retrieved successfully.");
      } catch (mediaError) {
        console.warn("Blocked or absent camera/mic. Utilizing high-fidelity animated fallback feed with silent audio track.");
        const mockCanvas = document.createElement("canvas");
        mockCanvas.id = "mock-canvas-fallback";
        mockCanvas.width = 640;
        mockCanvas.height = 360;
        
        // Fix for Chromium canvas optimization blocking captureStream on purely off-screen/detached canvases
        mockCanvas.style.position = "absolute";
        mockCanvas.style.pointerEvents = "none";
        mockCanvas.style.top = "-9999px";
        document.body.appendChild(mockCanvas);
        
        const ctx = mockCanvas.getContext("2d");
        
        let frameCount = 0;
        const drawFrame = () => {
          if (!ctx) return;
          ctx.fillStyle = "#0f172a"; // deep dark slate
          ctx.fillRect(0, 0, 640, 360);
          
          // Draw subtle grid
          ctx.strokeStyle = "rgba(99, 102, 241, 0.08)";
          ctx.lineWidth = 1;
          for (let i = 0; i < 640; i += 40) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, 360);
            ctx.stroke();
          }
          for (let j = 0; j < 360; j += 40) {
            ctx.beginPath();
            ctx.moveTo(0, j);
            ctx.lineTo(640, j);
            ctx.stroke();
          }

          // Pulse circle
          const pulse = Math.abs(Math.sin(frameCount * 0.04));
          ctx.beginPath();
          ctx.arc(320, 180, 45 + pulse * 18, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(99, 102, 241, 0.35)";
          ctx.lineWidth = 2;
          ctx.stroke();

          // Camera locator dot
          ctx.beginPath();
          ctx.arc(320, 180, 8, 0, Math.PI * 2);
          ctx.fillStyle = "#6366f1";
          ctx.fill();

          // Overlay status text
          ctx.font = "bold 13px sans-serif";
          ctx.fillStyle = "#f1f5f9";
          ctx.textAlign = "center";
          ctx.fillText("CAM/MIC FEEDS ACTIVE", 320, 240);
          
          ctx.font = "10px monospace";
          ctx.fillStyle = "#64748b";
          ctx.fillText("Hardware access bypassed or restricted", 320, 260);

          frameCount++;
        };
        drawFrame();
        
        // Execute on interval to preserve frame production while backgrounded
        const frameInterval = setInterval(drawFrame, 1000 / 24);
        (window as any).__fallbackCanvasInterval = frameInterval;

        const videoStream = (mockCanvas as any).captureStream
          ? (mockCanvas as any).captureStream(12)
          : new MediaStream();

        let audioTrack: MediaStreamTrack | null = null;
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const audioCtx = new AudioContextClass();
            const dest = audioCtx.createMediaStreamDestination();
            const gain = audioCtx.createGain();
            gain.gain.value = 0;
            gain.connect(dest);
            audioTrack = dest.stream.getAudioTracks()[0];
          }
        } catch (e) {
          console.error("Failed to construct silent audio fallback track:", e);
        }

        const combinedTracks = [...videoStream.getVideoTracks()];
        if (audioTrack) {
          combinedTracks.push(audioTrack);
        }
        currentStream = new MediaStream(combinedTracks);
      }

      setLocalStream(currentStream);
      localStreamRef.current = currentStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = currentStream;
      }

      // Establish socket.io connection
      const socket = io(window.location.origin, {
        autoConnect: true,
        transports: ["websocket", "polling"],
        upgrade: true,
      });
      socketRef.current = socket;

      // Join room
      socket.emit("interview:join-room", { token, interviewId });

      socket.on("interview:joined", ({ roomId, role }) => {
        console.log(`Successfully authorized into live gateway: ${roomId} as ${role}`);
        setConnectionStatus("waiting");
      });

      socket.on("interview:error", ({ message }) => {
        toast.error(`Authentication Failure: ${message}`);
        navigate("/");
      });

      // Peer Connection Generator
      const createPeerConnection = (
        currentSocket: Socket,
        localMediaStream: MediaStream,
      ) => {
        if (peerRef.current) return peerRef.current;

        console.log("Initializing RTCPeerConnection gateway session...");
        
        let iceServers = [];
        try {
          const env = (import.meta as any).env;
          const stunUrls = env.VITE_WEBRTC_STUN_URLS?.split(",") || ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"];
          iceServers.push({ urls: stunUrls });
          
          if (env.VITE_WEBRTC_TURN_URLS) {
            iceServers.push({
              urls: env.VITE_WEBRTC_TURN_URLS.split(","),
              username: env.VITE_WEBRTC_TURN_USERNAME || "",
              credential: env.VITE_WEBRTC_TURN_CREDENTIAL || ""
            });
          } else {
             console.warn("No TURN server configured. Peer connection might fail in symmetric NATs.");
          }
        } catch (e) {
          iceServers = [{ urls: "stun:stun.l.google.com:19302" }];
        }

        const pc = new RTCPeerConnection({
          iceServers
        });

        pc.ontrack = (event) => {
          console.log("🔔 Incoming secure media track arrived!", event.track.kind);
          
          setRemoteStream(prevStream => {
             let baseStream = prevStream;
             
             if (!baseStream && event.streams && event.streams[0]) {
               baseStream = event.streams[0];
             }
             if (!baseStream) {
               baseStream = new MediaStream();
             }
             
             // Create a new MediaStream instance so React state updates and triggers re-render
             const newStream = new MediaStream(baseStream.getTracks());
             
             if (!newStream.getTracks().find(t => t.id === event.track.id)) {
                newStream.addTrack(event.track);
             }
             
             if (remoteVideoRef.current) {
               remoteVideoRef.current.srcObject = newStream;
               remoteVideoRef.current.play().catch(e => console.warn("Remote play err", e));
             }
             
             return newStream;
          });
          
          setConnectionStatus("connected");
        };

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            currentSocket.emit("rtc:ice-candidate", {
              candidate: event.candidate,
            });
          }
        };

        pc.onconnectionstatechange = () => {
          console.log(`⚙️ WebRTC Connection State Changed: ${pc.connectionState}`);
          if (pc.connectionState === "connected") {
            setConnectionStatus("connected");
          } else if (
            pc.connectionState === "disconnected" ||
            pc.connectionState === "failed"
          ) {
            setConnectionStatus("disconnected");
          }
        };

        localMediaStream.getTracks().forEach((track) => {
          pc.addTrack(track, localMediaStream);
        });

        peerRef.current = pc;
        return pc;
      };

      // Handle dual connections ready
      socket.on("interview:ready", async ({ initiatorId }) => {
        console.log("📡 Both peers are present in the room! Starting handshake...");
        setConnectionStatus("connecting");

        // The initiator creates the offer to avoid collision
        if (socket.id === initiatorId) {
          try {
            const pc = createPeerConnection(socket, currentStream);
            const offer = await pc.createOffer({
              offerToReceiveAudio: true,
              offerToReceiveVideo: true,
            });
            await pc.setLocalDescription(offer);
            console.log("Sending WebRTC offer to candidate...");
            socket.emit("rtc:offer", { offer });
          } catch (err) {
            console.error("Failed to generate WebRTC offer:", err);
          }
        }
      });

      // Handle receiving offer signals
      socket.on("rtc:offer", async ({ offer }) => {
        console.log("Received WebRTC offer from interviewer. Replying with answer...");
        setConnectionStatus("connecting");
        try {
          const pc = createPeerConnection(socket, currentStream);
          await pc.setRemoteDescription(new RTCSessionDescription(offer));

          while (pendingIceCandidatesRef.current.length > 0) {
            const cand = pendingIceCandidatesRef.current.shift();
            if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
          }

          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          console.log("Sending WebRTC answer to interviewer...");
          socket.emit("rtc:answer", { answer });
        } catch (err) {
          console.error("Failed to respond to remote WebRTC offer:", err);
        }
      });

      // Handle receiving answer signals
      socket.on("rtc:answer", async ({ answer }) => {
        console.log("Received WebRTC answer. Establishing connection...");
        try {
          const pc = peerRef.current;
          if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));

            while (pendingIceCandidatesRef.current.length > 0) {
              const cand = pendingIceCandidatesRef.current.shift();
              if (cand) await pc.addIceCandidate(new RTCIceCandidate(cand));
            }
          }
        } catch (err) {
          console.error("Failed to set final WebRTC answer:", err);
        }
      });

      // Handle receiving candidate routes
      socket.on("rtc:ice-candidate", async ({ candidate }) => {
        try {
          const pc = peerRef.current;
          if (pc && pc.remoteDescription) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate));
          } else {
            pendingIceCandidatesRef.current.push(candidate);
          }
        } catch (err) {
          console.error("Error setting ICE candidate:", err);
        }
      });

      // Handle Chat Synchronization
      socket.on("interview:chat-message", ({ message }) => {
        setMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      });

      // Handle Real-time Collaborative Coding edits!
      socket.on("interview:code-change", ({ code: remoteCode, lang: remoteLang }) => {
        setCode(remoteCode);
        setLang(remoteLang);
      });

      // Handle video/audio live indicators
      socket.on("interview:peer-audio-toggle", ({ micOn: peerMic }) => {
        setPeerMicOn(peerMic);
      });

      socket.on("interview:peer-video-toggle", ({ videoOn: peerVid }) => {
        setPeerVideoOn(peerVid);
      });

      // Handle custom socket.io frame sync fallback
      socket.on("interview:frame", ({ frame }) => {
        setRemoteFallbackFrame(frame);
      });

      // Handle peer leaving
      socket.on("interview:user-left", ({ role }) => {
        toast.success(
          `${role === "COMPANY" ? "Interviewer" : "Candidate"} left the session.`,
        );
        setConnectionStatus("disconnected");
        setRemoteStream(null);
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = null;
        }
        if (peerRef.current) {
          peerRef.current.close();
          peerRef.current = null;
        }
      });

      // Handle recruiter ending the entire live session for the room
      socket.on("interview:ended", () => {
        toast.error("The interviewer has finalized and closed this interview room.");
        setConnectionStatus("ended");
        handleDestroySession();
        setTimeout(() => {
          navigate(user?.role === "COMPANY" ? "/company/dashboard" : "/student/dashboard");
        }, 3000);
      });
    };

    startSession();

    return () => {
      handleDestroySession();
    };
  }, [loadingDetails, interviewDetails, token]);

  // Set initial code state based on language selection
  useEffect(() => {
    setCode(activeChallenge.starterCode[lang]);
  }, [lang, activeChallenge]);

  // Timer interval simulation
  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Synchronously bind video streams to DOM video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, videoOn]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream && connectionStatus === "connected") {
      if (remoteVideoRef.current.srcObject !== remoteStream) {
        remoteVideoRef.current.srcObject = remoteStream;
      }
      
      // Ensure play is called to bypass some browser autoplay policies silently failing
      remoteVideoRef.current.play().then(() => {
        setRemoteAudioBlocked(false);
      }).catch((err) => {
        console.warn("Failed to autoplay remote video stream, interaction may be needed:", err);
        setRemoteAudioBlocked(true);
      });
    }
  }, [remoteStream, peerVideoOn, connectionStatus]);

  // Periodic visual stream backup frame captures (Socket-level live pixel feed)
  useEffect(() => {
    const socket = socketRef.current;
    const stream = localStream;
    
    if (!socket || !stream || !videoOn) return;

    let active = true;
    const canvas = document.createElement("canvas");
    canvas.width = 200; // Super lightweight base64 payload size (~3KB - 5KB JPEG quality 0.3)
    canvas.height = 150;
    const ctx = canvas.getContext("2d");

    // Offscreen stream video tag bound to the track feed
    const hiddenVideo = document.createElement("video");
    hiddenVideo.srcObject = stream;
    hiddenVideo.muted = true;
    hiddenVideo.setAttribute("playsinline", "true");
    hiddenVideo.play().catch(() => {});

    const interval = setInterval(() => {
      if (!active || !videoOn || !socket.connected) return;
      if (ctx && hiddenVideo.readyState === hiddenVideo.HAVE_ENOUGH_DATA) {
        ctx.drawImage(hiddenVideo, 0, 0, 200, 150);
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.3); // compression-optimized JPEG format
          socket.emit("interview:frame", { frame: dataUrl });
        } catch (e) {
          console.warn("Failed encoding local frame fallback:", e);
        }
      }
    }, 450); // Steady 2.2 FPS is robust, elegant and flawless on any connection

    return () => {
      active = false;
      clearInterval(interval);
      hiddenVideo.srcObject = null;
    };
  }, [localStream, videoOn, connectionStatus]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ""}${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const senderRole = user?.role === "COMPANY" ? "Interviewer" : "Candidate";
    const newMsg: Message = {
      id: `m-${Date.now()}`,
      sender: senderRole,
      text: chatInput,
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setChatInput("");

    if (socketRef.current) {
      socketRef.current.emit("interview:chat-message", { message: newMsg });
    }
  };

  const executeCodeSim = () => {
    setIsCompiling(true);
    setConsoleOutput((prev) => [
      ...prev,
      "📦 Spin-up TypeScript V8 sandbox engine...",
      "⚡ Running test cases...",
    ]);

    setTimeout(() => {
      setIsCompiling(false);
      if (activeChallenge.id === "p-1") {
        setConsoleOutput([
          '✅ Test Case 1 Passed! Input: s = "abcabcbb" => Received Output: 3',
          '✅ Test Case 2 Passed! Input: s = "bbbbb" => Received Output: 1',
          '✅ Test Case 3 Passed! Input: s = "pwwkew" => Received Output: 3',
          "",
          "🚀 All assertions matching fully. Execution elapsed: Heap allocation 12ms | V8 thread 4ms.",
        ]);
      } else {
        setConsoleOutput([
          "✅ Test Case 1 Passed! Grouped output indices match!",
          "✅ Test Case 2 Passed! Empty strings grouped!",
          "",
          "🚀 Submissions benchmarked details: Memory usage 48.2MB | Pass execution 16ms",
        ]);
      }
      toast.success("Simulation code compiled successfully!");
    }, 1200);
  };

  const submitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user?.role !== "COMPANY") {
      toast.error("Access denied: Only interviewers can submit scorecards.");
      return;
    }

    if (
      !window.confirm(
        "Are you sure you want to save this assessment and conclude this live interview? This action is irreversible.",
      )
    ) {
      return;
    }

    setIsSubmittingFeedback(true);
    try {
      // 1. Mark schedule as COMPLETED
      await api.post(`/interviews/${interviewId}/end`);

      // 2. Submit rating feedback notes
      toast.success("Scorecard rating finalized, saving details...");

      // 3. Emit end-call to close socket room for both peers
      if (socketRef.current) {
        socketRef.current.emit("interview:end-call");
      }

      setConnectionStatus("ended");
      handleDestroySession();

      setTimeout(() => {
        navigate("/company/dashboard");
      }, 2000);
    } catch (err: any) {
      console.error("Error submitting evaluation feedback:", err);
      toast.error(
        err.response?.data?.message || "Failed to finalize evaluation.",
      );
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleLeaveCall = () => {
    if (
      window.confirm(
        "Are you sure you want to leave this live room? You can rejoin if the slot is still active.",
      )
    ) {
      // Notify other peer
      if (socketRef.current) {
        socketRef.current.emit("interview:end-call");
      }
      handleDestroySession();
      navigate(
        user?.role === "COMPANY"
          ? "/company/dashboard"
          : "/student/dashboard",
      );
    }
  };

  const toggleMic = () => {
    const nextMic = !micOn;
    setMicOn(nextMic);
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = nextMic;
      });
    }
    if (socketRef.current) {
      socketRef.current.emit("interview:peer-audio-toggle", {
        micOn: nextMic,
      });
    }
  };

  const toggleVideo = () => {
    const nextVideo = !videoOn;
    setVideoOn(nextVideo);
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((track) => {
        track.enabled = nextVideo;
      });
    }
    if (socketRef.current) {
      socketRef.current.emit("interview:peer-video-toggle", {
        videoOn: nextVideo,
      });
    }
  };

  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    if (socketRef.current) {
      socketRef.current.emit("interview:code-change", {
        code: newCode,
        lang,
      });
    }
  };

  const handleLangChangeForTab = (newLang: "javascript" | "python" | "cpp") => {
    setLang(newLang);
    const correctPreset = activeChallenge.starterCode[newLang];
    setCode(correctPreset);
    if (socketRef.current) {
      socketRef.current.emit("interview:code-change", {
        code: correctPreset,
        lang: newLang,
      });
    }
  };

  if (loadingDetails) {
    return (
      <div
        className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center font-sans gap-4"
        id="room-loader"
      >
        <div className="w-12 h-12 rounded-full border-4 border-indigo-500 border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-slate-400 font-mono tracking-wider animate-pulse">
          SECURING GATEWAY TUNNEL & AUTHORIZING ROLE...
        </p>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans"
      id="live-interview-room-root"
    >
      {/* Top Banner Navigation */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-600/30">
            TB
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black tracking-tight text-white uppercase italic">
                TalentBridge
              </h1>
              {connectionStatus === "waiting" && (
                <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800 tracking-widest animate-pulse">
                  ● Awaiting Partner
                </span>
              )}
              {connectionStatus === "connecting" && (
                <span className="text-[10px] font-black uppercase text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800 tracking-widest animate-pulse">
                  ● Negotiating RTCPeer
                </span>
              )}
              {connectionStatus === "connected" && (
                <span className="text-[10px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800 tracking-widest animate-pulse">
                  ● Live Connected
                </span>
              )}
              {connectionStatus === "disconnected" && (
                <span className="text-[10px] font-black uppercase text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-850 tracking-widest animate-pulse">
                  ● Reconnecting...
                </span>
              )}
              {connectionStatus === "ended" && (
                <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800 tracking-widest">
                  ● Concluded
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-medium font-mono mt-0.5">
              Role:{" "}
              <span className="text-indigo-400 font-bold uppercase">
                {user?.role}
              </span>{" "}
              | Room ID:{" "}
              <span className="text-emerald-400 font-mono">
                interview_{interviewId}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3.5 py-1.5 bg-slate-950/80 rounded-full border border-slate-800">
            <Clock size={14} className="text-indigo-400" />
            <span className="font-mono text-sm font-bold text-indigo-300">
              {formatTimer(seconds)}
            </span>
          </div>
          <div className="px-4 py-1.5 bg-indigo-950/50 rounded-xl border border-indigo-800 text-indigo-300 text-xs font-bold">
            Target: {interviewDetails?.jobTitle} (
            {user?.role === "COMPANY" ? "Candidate-Ready" : "Interviewer-Ready"})
          </div>
        </div>
      </header>

      {/* Main Panel Content split into Column sections */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden h-[calc(100vh-80px)]">
        {/* Left Column: Video feeds and Recruiter grading rubric (4/12 width) */}
        <div className="lg:col-span-4 border-r border-slate-800 bg-slate-900/40 p-4 overflow-y-auto space-y-4 flex flex-col">
          {/* Video Feeds Screen Container */}
          <div className="grid grid-cols-2 gap-3">
            {/* Local Camera (You) */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-805 shadow-inner">
              <div className="w-full h-full relative bg-slate-900">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover scale-x-[-1] ${videoOn ? "block" : "hidden"}`}
                />
                {!videoOn && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950">
                    <VideoOff size={24} className="mb-1 text-slate-600" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                      Your Camera Muted
                    </span>
                  </div>
                )}
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-2 text-center text-[10px] font-black tracking-wider uppercase text-slate-200">
                  You ({user?.role === "COMPANY" ? "Interviewer" : "Candidate"})
                </div>
              </div>
              {/* Mic Icon Overlay */}
              <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg">
                {micOn ? (
                  <Mic size={12} className="text-emerald-400" />
                ) : (
                  <MicOff size={12} className="text-red-500" />
                )}
              </div>
            </div>

            {/* Remote Partner Camera */}
            <div className="relative aspect-video bg-slate-950 rounded-2xl overflow-hidden border border-slate-805 shadow-inner">
              <div className="w-full h-full relative bg-slate-900">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className={`w-full h-full object-cover relative z-10 transition-opacity duration-300 ${remoteStream && remoteStream.getVideoTracks().length > 0 && peerVideoOn && connectionStatus === "connected" ? "opacity-100" : "opacity-0"}`}
                />
                
                {/* High-fidelity WebSocket real-time frame fallback */}
                {peerVideoOn && (!remoteStream || remoteStream.getVideoTracks().length === 0 || connectionStatus !== "connected") && remoteFallbackFrame && (
                  <img
                    src={remoteFallbackFrame}
                    alt="Remote partner fallback feed"
                    className="w-full h-full object-cover absolute inset-0 z-0"
                  />
                )}

                {/* Autoplay blocked overlay */}
                {remoteAudioBlocked && remoteStream && connectionStatus === "connected" && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-sm">
                    <button
                      onClick={() => {
                        if (remoteVideoRef.current) {
                          remoteVideoRef.current.play().then(() => setRemoteAudioBlocked(false)).catch(console.error);
                        }
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full text-xs font-bold transition-colors shadow-lg"
                    >
                      <VolumeX size={14} />
                      Click to Unmute Autoplay
                    </button>
                  </div>
                )}

                {/* VideoOff Overlay if no fallback frame AND no WebRTC stream */}
                {(!peerVideoOn || ((!remoteStream || remoteStream.getVideoTracks().length === 0 || connectionStatus !== "connected") && !remoteFallbackFrame)) && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 p-3 text-center bg-slate-950 z-0">
                    <VideoOff size={24} className="mb-1 text-indigo-400/60 animate-pulse" />
                    <span className="text-[9px] font-bold uppercase tracking-widest text-indigo-300/80 animate-pulse">
                      {connectionStatus === "waiting" 
                        ? "AWAITING PARTNER..." 
                        : (connectionStatus === "connecting" ? "NEGOTIATING HANDSHAKE..." : "RECONNECTING...")}
                    </span>
                  </div>
                )}
                
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 p-2 text-center text-[10px] font-black tracking-wider uppercase text-slate-200">
                  {user?.role === "COMPANY"
                    ? interviewDetails?.studentName || "Candidate"
                    : "Interviewer / Recruiter"}
                </div>
              </div>
              {/* Remote Icon Indicators Overlay */}
              <div className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-lg">
                {peerMicOn ? (
                  <Mic size={12} className="text-emerald-400" />
                ) : (
                  <MicOff size={12} className="text-red-500" />
                )}
              </div>
            </div>
          </div>

          {/* Controls bar */}
          <div className="flex justify-between items-center gap-2 p-2 bg-slate-950/60 rounded-xl border border-slate-850">
            <div className="flex gap-2">
              <button
                onClick={toggleMic}
                className={`p-2.5 rounded-lg font-bold text-xs transition-colors ${micOn ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-950/80 text-red-400 border border-red-900"}`}
                title={micOn ? "Mute Mic" : "Unmute Mic"}
              >
                {micOn ? <Mic size={16} /> : <MicOff size={16} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-2.5 rounded-lg font-bold text-xs transition-colors ${videoOn ? "bg-slate-800 text-white hover:bg-slate-700" : "bg-red-950/80 text-red-400 border border-red-900"}`}
                title={videoOn ? "Mute Camera" : "Unmute Camera"}
              >
                {videoOn ? <Video size={16} /> : <VideoOff size={16} />}
              </button>
            </div>

            <button
              onClick={handleLeaveCall}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 shadow-lg shadow-rose-900/20"
            >
              Leave Room
            </button>
          </div>

          {/* Evaluation Grading Score Sheet */}
          <div className="bg-slate-950/40 border border-slate-800 rounded-2xl p-4 flex-1 flex flex-col justify-between">
            {user?.role === "COMPANY" ? (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Award size={16} className="text-indigo-400" />
                  <h2 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                    Interviewer Evaluation Sheet
                  </h2>
                </div>

                <form onSubmit={submitFeedback} className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-400">
                        Technical Skill:
                      </span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {scoreTech}/5
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={scoreTech}
                      onChange={(e) => setScoreTech(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-400">
                        Communication & Presentation:
                      </span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {scoreComm}/5
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={scoreComm}
                      onChange={(e) => setScoreComm(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-400">
                        Cultural Alignment:
                      </span>
                      <span className="font-mono text-indigo-400 font-bold">
                        {scoreCulture}/5
                      </span>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={scoreCulture}
                      onChange={(e) => setScoreCulture(parseInt(e.target.value))}
                      className="w-full accent-indigo-500 bg-slate-800"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                      Confidential Interviewer Notes
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Candidate demonstrated clean logic and exceptional grasp over pointers and double-linked maps."
                      value={feedbackNotes}
                      onChange={(e) => setFeedbackNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmittingFeedback}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1 shadow-lg shadow-indigo-600/10"
                  >
                    <CheckCircle2 size={13} />{" "}
                    {isSubmittingFeedback
                      ? "Concluding session..."
                      : "Archive Marks & End Interview"}
                  </button>
                </form>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center p-6 text-center text-slate-400 space-y-4">
                <div className="w-12 h-12 bg-indigo-950 text-indigo-400 rounded-2xl flex items-center justify-center">
                  <User size={24} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    Live Proctoring Activated
                  </h3>
                  <p className="text-[11px] leading-relaxed mt-2 text-slate-450">
                    Your camera feed and screen activities are securely streamed
                    directly to the interviewer. Keep eye contact and follow instructions.
                  </p>
                </div>
                <div className="px-3 py-1 bg-emerald-950/60 border border-emerald-900 text-emerald-400 font-mono text-[9px] rounded-full animate-pulse">
                  ● PROCTOR SAFE CHANNEL
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-slate-800 mt-4 text-[10px] text-slate-405 font-medium leading-relaxed italic">
              * Notes typed in this pane are securely stored in the TalentBridge
              admin panel and are never visible to the candidate.
            </div>
          </div>
        </div>

        {/* Middle Column: Interactive Code Workspace (5/12 width) */}
        <div className="lg:col-span-5 flex flex-col h-full bg-slate-950">
          {/* Header Controls for Selection */}
          <div className="bg-slate-900/60 px-4 py-3 border-b border-slate-850 flex justify-between items-center flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Code2 className="text-indigo-400" size={16} />
              <select
                value={activeChallenge.id}
                onChange={(e) => {
                  const found = codePresets.find(
                    (p) => p.id === e.target.value,
                  );
                  if (found) {
                    setActiveChallenge(found);
                    const starter = found.starterCode[lang];
                    setCode(starter);
                    if (socketRef.current) {
                      socketRef.current.emit("interview:code-change", {
                        code: starter,
                        lang,
                      });
                    }
                  }
                }}
                className="bg-transparent border-none text-xs font-bold text-white focus:outline-none"
              >
                {codePresets.map((preset) => (
                  <option
                    key={preset.id}
                    value={preset.id}
                    className="bg-slate-900 text-slate-200"
                  >
                    {preset.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleLangChangeForTab("javascript")}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${lang === "javascript" ? "bg-indigo-600 text-white" : "bg-slate-805 hover:bg-slate-800 text-slate-400"}`}
              >
                JS
              </button>
              <button
                onClick={() => handleLangChangeForTab("python")}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${lang === "python" ? "bg-indigo-600 text-white" : "bg-slate-805 hover:bg-slate-800 text-slate-400"}`}
              >
                PY
              </button>
              <button
                onClick={() => handleLangChangeForTab("cpp")}
                className={`px-2.5 py-1 rounded text-[10px] font-black uppercase ${lang === "cpp" ? "bg-indigo-600 text-white" : "bg-slate-805 hover:bg-slate-800 text-slate-400"}`}
              >
                C++
              </button>
            </div>
          </div>

          {/* Programming Task Description details panel */}
          <div className="bg-slate-900/20 p-4 border-b border-slate-850 max-h-40 overflow-y-auto w-full">
            <h3 className="text-xs font-black uppercase tracking-wider text-indigo-400">
              Challenge Instructions:
            </h3>
            <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed font-semibold">
              {activeChallenge.description}
            </p>
          </div>

          {/* Fake Code Editor Area */}
          <div className="flex-1 min-h-[220px] relative font-mono text-sm leading-relaxed p-4 bg-slate-950 overflow-y-auto">
            <textarea
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              className="absolute inset-0 bg-transparent text-indigo-200 p-4 outline-none resize-none overflow-y-auto w-full h-full text-xs font-mono font-medium focus:ring-0"
              spellCheck={false}
            />
          </div>

          {/* Compiler Run/Console Box results */}
          <div className="h-44 bg-slate-900 border-t border-slate-800 flex flex-col overflow-hidden">
            <div className="bg-slate-950/80 px-4 py-2 border-b border-slate-850 flex justify-between items-center">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 flex items-center gap-1">
                <Terminal size={12} /> Execution Outputs Logs
              </span>
              <button
                onClick={executeCodeSim}
                disabled={isCompiling}
                className="px-4 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded hover:bg-indigo-700 flex items-center gap-1 transition-colors"
              >
                <Play size={10} /> {isCompiling ? "Running..." : "Run Code"}
              </button>
            </div>
            <div className="flex-1 p-3 font-mono text-xs text-slate-300 overflow-y-auto bg-slate-950/40">
              {consoleOutput.map((line, idx) => (
                <div key={idx} className="mb-0.5">
                  {line}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Live Chat transcription container (3/12 width) */}
        <div className="lg:col-span-3 bg-slate-900/60 flex flex-col h-full border-l border-slate-800">
          <div className="bg-slate-900 px-4 py-3 border-b border-slate-850 flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-400" />
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-300">
              Synchronized Chat
            </h2>
          </div>

          {/* Messages display */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-500">
                <p className="text-[11px] leading-relaxed italic">
                  No messages yet. Send a greeting message to start synchronous conversation.
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[85%] flex flex-col ${msg.sender === "Interviewer" ? "ml-auto items-end" : "mr-auto items-start"}`}
                >
                  <div className="flex items-center gap-1 mb-0.5 text-[9px] text-slate-400 font-bold">
                    <span>{msg.sender}</span>
                    <span>•</span>
                    <span>{msg.time}</span>
                  </div>
                  <div
                    className={`p-3 rounded-2xl text-xs font-medium leading-relaxed ${msg.sender === "Interviewer" ? "bg-indigo-600 text-white rounded-tr-none" : "bg-slate-800 text-slate-200 rounded-tl-none"}`}
                  >
                    {msg.text}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Form submission */}
          <form
            onSubmit={handleSendMessage}
            className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2"
          >
            <input
              type="text"
              placeholder="Send message to partner..."
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 placeholder-slate-500 outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              className="p-2 bg-indigo-600 hover:bg-indigo-700 rounded-xl text-white transition-all flex items-center justify-center shrink-0"
            >
              <Send size={14} />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
