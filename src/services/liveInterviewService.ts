import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import api from "./api.ts";

export class LiveInterviewService {
  private ai: GoogleGenAI | null = null;
  private sessionPromise: Promise<any> | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private audioWorkletNode: AudioWorkletNode | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private videoInterval: any = null;
  
  // Audio playback state
  private playbackContext: AudioContext | null = null;
  private nextPlayTime: number = 0;
  private isPlaying: boolean = false;
  public isMuted: boolean = false;
  
  public isResumedSession: boolean = false;
  public previousTranscript: string = "";
  
  public onStateChange: (state: "idle" | "listening" | "processing" | "speaking") => void = () => {};
  public onMessage: (sender: "user" | "ai", text: string) => void = () => {};
  public onError: (error: string) => void = () => {};

  constructor() {
    // Left empty. Gemini API client is dynamically initialized when start() is called.
  }

  async start(resumeText: string, externalStream?: MediaStream) {
    try {
      this.onStateChange("processing");

      // Fetch the key dynamically from the backend
      const keyResponse = await api.get("/ai/live-key");
      const apiKey = keyResponse.data.key;
      if (!apiKey) {
        throw new Error("Unable to start interview: Gemini Live API key is missing or not configured.");
      }
      this.ai = new GoogleGenAI({ apiKey });
      
      const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
      if (!AudioContextClass) {
        throw new Error("AudioContext not supported in this browser");
      }
      
      // Use local variables to avoid race conditions during async setup
      const audioCtx = new AudioContextClass({ sampleRate: 16000 });
      const playbackCtx = new AudioContextClass({ sampleRate: 24000 });

      // Browsers require a resume() call inside a user gesture
      if (audioCtx.state === 'suspended') await audioCtx.resume();
      if (playbackCtx.state === 'suspended') await playbackCtx.resume();
      
      this.audioContext = audioCtx;
      this.playbackContext = playbackCtx;
      this.nextPlayTime = this.playbackContext.currentTime;

      // Track if we own the stream or if it's external
      const isExternal = !!externalStream;
      if (externalStream) {
        this.mediaStream = externalStream;
      } else {
        this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          } 
        });
      }

      if (!this.audioContext) throw new Error("AudioContext was nulled during initialization");
      
      this.source = this.audioContext.createMediaStreamSource(this.mediaStream);
      
      await this.audioContext.audioWorklet.addModule('/audio-processor.js');
      this.audioWorkletNode = new AudioWorkletNode(this.audioContext, 'audio-processor');

      this.audioWorkletNode.port.onmessage = (e) => {
        if (this.sessionPromise) {
          this.sessionPromise.then(session => {
            const pcm16Buffer = e.data;
            
            let binary = '';
            const bytes = new Uint8Array(pcm16Buffer);
            for (let i = 0; i < bytes.byteLength; i++) {
              binary += String.fromCharCode(bytes[i]);
            }
            const base64Data = btoa(binary);

            session.sendRealtimeInput({
              audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
            });
          });
        }
      };

      this.source.connect(this.audioWorkletNode);
      this.audioWorkletNode.connect(this.audioContext.destination);

      // Video Frame Capture
      if (this.mediaStream && this.mediaStream.getVideoTracks().length > 0) {
        // Try to find an existing video element or use a hidden one
        let video = document.getElementById("ai-interview-capture-video") as HTMLVideoElement;
        if (!video) {
          video = document.createElement("video");
          video.id = "ai-interview-capture-video";
          video.style.display = "none";
          video.setAttribute('playsinline', 'true');
          document.body.appendChild(video);
        }
        
        if (video.srcObject !== this.mediaStream) {
          video.srcObject = this.mediaStream;
          video.muted = true;
          video.play().catch(console.error);
        }

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        this.videoInterval = setInterval(() => {
          if (!this.sessionPromise) return;
          this.sessionPromise.then(session => {
            try {
              if (video.videoWidth > 0 && video.videoHeight > 0) {
                canvas.width = 320; 
                canvas.height = (video.videoHeight / video.videoWidth) * 320;
                ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                const base64Frame = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];
                session.sendRealtimeInput({
                  video: {
                    mimeType: "image/jpeg",
                    data: base64Frame
                  }
                });
              }
            } catch (err) {
              console.warn("Frame capture failed:", err);
            }
          });
        }, 3000); // Every 3 seconds
      }

      let profileData: any = { role: "Software Engineer", level: "Fresher", techstack: [], focus: "Mixed", difficulty: "Medium", communication: "Voice" };
      try {
        const parsed = JSON.parse(resumeText);
        if (parsed.role) profileData = parsed;
      } catch (e) {
        profileData.role = resumeText.substring(0, 50); // Fallback for old resume strings
      }

      const systemInstruction = `You are Aoede, a world-class senior technical interviewer.
      You are conducting a dynamic and adaptive mock interview.

      CANDIDATE PROFILE:
      Target Role: ${profileData.role}
      Target Company: ${profileData.company ? profileData.company : "General"}
      Experience Level: ${profileData.level}
      Confident Technologies: ${(profileData.techstack || []).join(", ")}
      Interview Focus: ${profileData.focus}
      Difficulty Level: ${profileData.difficulty}

      INTERVIEW FLOW RULES:
      1. **Introduction**: As soon as the session starts, greet the candidate warmly. Say "Welcome to your mock interview for the ${profileData.role} position${profileData.company ? ` at ` + profileData.company : ''}. To get started, please introduce yourself."
      2. **Resume & Projects**: Based on their introduction, ask 1-2 questions about their tech stack.
      3. **Dynamic Rounds**: Start with fundamentals suited for ${profileData.difficulty} level. If they answer correctly, progressively increase difficulty. If they struggle, provide a quick hint or ask a simpler variation.
      4. **Adaptive Follow-ups**: Do not ask random questions. Probe deeper into their previous responses.
      5. **Scenario-Based**: Ask them to solve a real-world problem using their tech stack.

      COMMUNICATION RULES:
      - Communication Mode: ${profileData.communication}. If "Text", keep it highly concise.
      - BE CONVERSATIONAL. Do NOT sound robotic. Keep responses short and crisp (max 2-3 sentences).
      - Ask ONE thing at a time. Wait for their response.
      - DO NOT say "Great answer" every time. Evaluate shortly, validate, and move to the next logical question.
      - PROACTIVITY: If they are silent for over 7 seconds or stuck, offer a small hint.

      EVALUATION & ENDING:
      - You must evaluate accurately based on the transcript.
      - Ask exactly 5 professional questions total.
      - Once the 5 questions are answered, you MUST end the interview by CALLING the 'finalizeInterview' tool with the complete evaluation.
      - Do NOT just say goodbye; you MUST call the tool to end the session.`;

      if (!this.ai) {
        throw new Error("GoogleGenAI client is not initialized.");
      }

      this.sessionPromise = this.ai.live.connect({
        model: "gemini-3.1-flash-live-preview",
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          tools: [{
            functionDeclarations: [
              {
                name: "finalizeInterview",
                description: "End the interview session and provide the final evaluation report.",
                parameters: {
                  type: "object" as any,
                  properties: {
                    scores: {
                      type: "object" as any,
                      properties: {
                        communication: { type: "number" as any },
                        confidence: { type: "number" as any },
                        explanation: { type: "number" as any },
                        presentation: { type: "number" as any },
                        knowledge: { type: "number" as any },
                        overall: { type: "number" as any }
                      },
                      required: ["communication", "confidence", "explanation", "presentation", "knowledge", "overall"]
                    },
                    detailed_feedback: { type: "string" as any },
                    strengths: { type: "array" as any, items: { type: "string" as any } },
                    weaknesses: { type: "array" as any, items: { type: "string" as any } },
                    improvement_tips: { type: "array" as any, items: { type: "string" as any } }
                  },
                  required: ["scores", "detailed_feedback", "strengths", "weaknesses", "improvement_tips"]
                }
              }
            ]
          }]
        },
        callbacks: {
          onopen: () => {
            console.log("SUCCESS: Live API Connected");
            this.onStateChange("listening");
          },
          onmessage: async (message: LiveServerMessage) => {
            console.log("DEBUG: Received Message:", message);

            if (message.setupComplete && this.sessionPromise) {
              console.log("DEBUG: Setup Complete. Sending initial trigger turn.");
              if (this.isResumedSession && this.previousTranscript) {
                this.sendText(`We are resuming an active mock interview that was briefly interrupted. 
Here is our conversation history so far:
---
${this.previousTranscript}
---
Please greet the candidate warmly acknowledging the quick connection recovery, recap where we were, and ask the next natural question.`);
              } else {
                this.sendText("Start the interview now. Say hello and ask me to introduce myself.");
              }
            }
            
            // Handle Model Turn
            const modelTurn = message.serverContent?.modelTurn;
            if (modelTurn) {
              const parts = modelTurn.parts || [];
              for (const part of parts) {
                if (part.inlineData?.data) {
                  this.onStateChange("speaking");
                  this.playAudioChunk(part.inlineData.data);
                }
                if (part.text) {
                  this.onMessage("ai", part.text);
                }
              }
            }

            // Handle Server Content Transcription (input audio)
            const userSpeech = (message.serverContent as any)?.inputAudioTranscription?.text;
            if (userSpeech) {
              this.onMessage("user", userSpeech);
            }

            if (message.serverContent?.interrupted) {
              console.log("AI Interrupted via server signal");
              this.stopPlayback();
              this.onStateChange("listening");
            }

            // Handle Tool Calls
            const toolCall = (message as any).toolCall;
            if (toolCall) {
              const functionCalls = toolCall.functionCalls;
              if (functionCalls && functionCalls.length > 0) {
                for (const call of functionCalls) {
                  if (call.name === "finalizeInterview") {
                    const args = call.args as any;
                    (this as any)._finalReport = args;
                    this.onMessage("ai", "[INTERVIEW_COMPLETED]");
                    this.sessionPromise?.then(session => {
                      session.sendToolResponse({
                        functionResponses: [{
                          name: call.name,
                          id: call.id,
                          response: { status: "Interview finalized. Evaluated." }
                        }]
                      });
                    });
                  }
                }
              }
            }
          },
          onclose: (event) => {
            console.log("Live API Closed:", event);
            this.onStateChange("idle");
          },
          onerror: (err) => {
            console.error("Live API Error Callback:", err);
            this.onError("Connection lost.");
            this.stop();
          }
        }
      });

      // Removed manual session assignment to avoid race conditions with sessionPromise
    } catch (error) {
      console.error("Failed to start Live Session:", error);
      this.onError("Failed to access microphone or connect to AI.");
      this.stop();
    }
  }

  private activeSources: AudioBufferSourceNode[] = [];
  
  private async playAudioChunk(base64Data: string) {
    if (!this.playbackContext || this.isMuted) return;
    
    try {
      console.log(`DEBUG: playAudioChunk context state: ${this.playbackContext.state}`);
      if (this.playbackContext.state === 'suspended') {
        await this.playbackContext.resume();
        console.log(`DEBUG: playAudioChunk context resumed to: ${this.playbackContext.state}`);
      }

      const rawBinaryString = atob(base64Data);
      const rawByteLength = rawBinaryString.length;
      console.log(`DEBUG: playAudioChunk base64 byte length: ${rawByteLength}`);
      const rawBytes = new Uint8Array(rawByteLength);
      for (let i = 0; i < rawByteLength; i++) {
        rawBytes[i] = rawBinaryString.charCodeAt(i);
      }
      
      const pcmSampleCount = Math.floor(rawByteLength / 2);
      if (pcmSampleCount === 0) return;

      const pcmInt16Data = new Int16Array(pcmSampleCount);
      const pcmDataView = new DataView(rawBytes.buffer);
      for (let i = 0; i < pcmSampleCount; i++) {
        pcmInt16Data[i] = pcmDataView.getInt16(i * 2, true);
      }

      const pcmAudioBuffer = this.playbackContext.createBuffer(1, pcmSampleCount, 24000);
      const pcmChannelData = pcmAudioBuffer.getChannelData(0);
      
      for (let i = 0; i < pcmSampleCount; i++) {
        pcmChannelData[i] = pcmInt16Data[i] / 32768.0;
      }
      
      const pcmBufferSource = this.playbackContext.createBufferSource();
      pcmBufferSource.buffer = pcmAudioBuffer;
      pcmBufferSource.connect(this.playbackContext.destination);
      
      console.log(`DEBUG: Playing audio chunk, size: ${pcmSampleCount} samples`);
      
      const pcmCurrentTime = this.playbackContext.currentTime;
      if (this.nextPlayTime < pcmCurrentTime) {
        this.nextPlayTime = pcmCurrentTime;
      }
      
      console.log(`DEBUG: Scheduling audio at ${this.nextPlayTime} (current: ${pcmCurrentTime}, duration: ${pcmAudioBuffer.duration})`);
      
      pcmBufferSource.start(this.nextPlayTime);
      this.activeSources.push(pcmBufferSource);
      this.nextPlayTime += pcmAudioBuffer.duration;
      this.isPlaying = true;
      
      pcmBufferSource.onended = () => {
        this.activeSources = this.activeSources.filter(s => s !== pcmBufferSource);
        if (this.activeSources.length === 0) {
          this.isPlaying = false;
          this.onStateChange("listening");
        }
      };
    } catch (e) {
      console.error("Error playing chunk", e);
    }
  }

  private stopPlayback() {
    this.activeSources.forEach(source => {
      try { source.stop(); } catch (e) {}
    });
    this.activeSources = [];
    this.nextPlayTime = this.playbackContext?.currentTime || 0;
    this.isPlaying = false;
  }

  stop() {
    if (this.videoInterval) {
      clearInterval(this.videoInterval);
      this.videoInterval = null;
    }
    if (this.audioWorkletNode) {
      this.audioWorkletNode.disconnect();
      this.audioWorkletNode = null;
    }
    if (this.source) {
      this.source.disconnect();
      this.source = null;
    }
    if (this.mediaStream) {
      // ONLY stop tracks if we created the stream. If it was passed externally,
      // it's the caller's responsibility to stop it (e.g. InterviewPage).
      // This prevents the "black camera" issue if cleanup accidentally closes a shared stream.
      // However, we should still disconnect from our context.
      this.mediaStream = null;
    }
    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.stopPlayback();
    
    const hiddenVideo = document.getElementById("ai-interview-capture-video");
    if (hiddenVideo) {
      if ((hiddenVideo as HTMLVideoElement).srcObject) {
         (hiddenVideo as HTMLVideoElement).srcObject = null;
      }
      hiddenVideo.remove();
    }
    
    if (this.sessionPromise) {
      this.sessionPromise.then(session => session.close()).catch(() => {});
      this.sessionPromise = null;
    }
    
    this.onStateChange("idle");
  }

  sendText(text: string) {
    if (this.sessionPromise) {
      this.sessionPromise.then(session => {
        console.log("DEBUG: Sending text input:", text);
        session.sendRealtimeInput({ text });
      });
    }
  }

  getFinalReport() {
    return (this as any)._finalReport;
  }
}
