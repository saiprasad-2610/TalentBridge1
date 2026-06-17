export class LiveInterviewService {
  public onStateChange: (state: "listening" | "idle" | "speaking" | "processing") => void = () => {};
  public onMessage: (sender: string, text: string) => void = () => {};
  public onError: (err: any) => void = () => {};
  public isMuted: boolean = false;
  public isResumedSession: boolean = false;
  public previousTranscript: string = "";

  private timer: any = null;

  async start(details: string, stream: MediaStream | null) {
    console.log("[LiveInterviewService] Starting interview session loop details:", details);
    this.onStateChange("speaking");
    
    // Start welcome message
    setTimeout(() => {
      this.onMessage("ai", "Hello! Welcome to your automated AI mock interview screening. Let's start with a brief introduction. Please introduce yourself and highlight your engineering skills.");
      this.onStateChange("listening");
    }, 1500);
  }

  stop() {
    console.log("[LiveInterviewService] Stopping voice connection.");
    if (this.timer) clearInterval(this.timer);
    this.onStateChange("idle");
  }

  sendText(text: string) {
    console.log("[LiveInterviewService] Candidate sentence logged:", text);
    this.onStateChange("processing");

    // Cycle replies to test dialogue progression
    setTimeout(() => {
      this.onStateChange("speaking");
      const responses = [
        "That sounds wonderful. Can you elaborate further on how you would configure robust database security and parameterization in NodeJS?",
        "Excellent points! How would you handle WebRTC video synchronization behind Nginx containers and firewall ports?",
        "Thank you! Could you describe your experience implementing anti-cheating proctored lockdowns in responsive React apps?",
        "Understood. Let's wrap up by outlining a standard MOM report generation prompt using Gemini API models."
      ];
      const selectedText = responses[Math.floor(Math.random() * responses.length)];
      this.onMessage("ai", selectedText);
      this.onStateChange("listening");
    }, 1800);
  }

  getFinalReport(): any {
    return {
      overallScore: 85,
      communication: 90,
      technicalDepth: 80,
      confidence: 85,
      feedback: "Candidate performed admirably under simulated multi-tab browser isolation rules."
    };
  }
}
export default LiveInterviewService;
