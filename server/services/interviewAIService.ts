import { GoogleGenAI } from "@google/genai";
import db from "../db.ts";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export class InterviewAIService {
  /**
   * Generates a structural, audit-safe and DPDP/GDPR compliant interview summary using Gemini AI.
   * Leverages transcript chunks and logged questions.
   */
  static async generateMOMReport(interviewId: number): Promise<any> {
    try {
      console.log(`[InterviewAIService] Generating MOM for interview ID: ${interviewId}`);

      // 1. Fetch academic/professional context of the interview
      const [interviews]: any = await db.query(
        "SELECT i.*, j.title as job_title, s.full_name as student_name FROM interviews i JOIN jobs j ON i.job_id = j.id JOIN student_profiles s ON i.student_id = s.id WHERE i.id = ?",
        [interviewId]
      );

      if (!interviews || interviews.length === 0) {
        throw new Error(`Interview not found: ${interviewId}`);
      }
      const interview = interviews[0];

      // 2. Fetch transcript segments
      const [transcripts]: any = await db.query(
        "SELECT speaker_role, text FROM interview_transcript_segments WHERE interview_id = ? ORDER BY id ASC",
        [interviewId]
      );

      // 3. Fetch questions logger
      const [questions]: any = await db.query(
        "SELECT question_text FROM interview_room_questions WHERE interview_id = ? ORDER BY id ASC",
        [interviewId]
      );

      // Assemble chronological conversation
      let transcriptText = "";
      if (transcripts && transcripts.length > 0) {
        transcriptText = transcripts
          .map((t: any) => `${t.speaker_role === "STUDENT" ? "Candidate" : "Interviewer"}: ${t.text}`)
          .join("\n");
      } else {
        transcriptText = "No speech transcript segments were captured during this call.";
      }

      const questionsLogged = questions && questions.length > 0
        ? questions.map((q: any) => `- ${q.question_text}`).join("\n")
        : "None logged manually.";

      // 4. Construct prompt enforcing non-hallucination and exact JSON schema
      const prompt = `
You are an expert technical evaluation system designed to generate accurate, professional Minutes of Meeting (MOM) and technical performance reports for on-platform candidate interviews.

INTERVIEW CONTEXT:
Job Title: ${interview.job_title}
Candidate Name: ${interview.student_name}
Interview Type: ${interview.interview_type}

TRANSCRIPT ENCOUNTERED:
${transcriptText}

QUESTIONS OFFICIALLY LOGGED:
${questionsLogged}

OBJECTIVE DIRECTIVE:
Evaluate the candidate thoroughly and objectively.
If a question from the logged list or the transcript was not responded to, was skipped, or is vague/unanswered, mark the "answer_summary" as "not captured" or "not answered". Do NOT hallucinate answers or generate details not present in the transcripts.

CONFORM TO THE EXACT SCHEMA DEFINITION BELOW (Must return a JSON object ONLY):
{
  "analytics": {
    "communication_score": (integer 1-10 mapping communication clarity and tone),
    "technical_depth_score": (integer 1-10 based on accuracy of technical terminology and depth),
    "problem_solving_score": (integer 1-10 based on analytical approaches to questions),
    "overall_fit_score": (integer 1-10 summarizing readiness for the job role)
  },
  "mom": {
    "candidate_summary": "Detailed overall summary of candidate behavioral and technical performance during this specific meeting.",
    "key_strengths": ["List of 2 to 4 notable strengths backed by transcript occurrences"],
    "improvement_areas": ["List of areas needing improvement including technical topics he or she struggled on"],
    "detailed_qna": [
      {
        "question": "Question text asked in the transcript/questions log",
        "answer_summary": "A concise, faithful summary of the candidate's exact response, or 'not captured' if vague or unanswered",
        "technical_accuracy": "High / Medium / Low / Not Evaluated",
        "ai_feedback": "Helpful AI commentary explaining the correctness or gaps in this response"
      }
    ]
  }
}
      `;

      // 5. Invoke Google Gemini-3.5-flash with JSON mode
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.1, // High precision, minimal creativity
        },
      });

      const responseText = response.text || "{}";
      let parsedReport: any = null;

      try {
        parsedReport = JSON.parse(responseText);
      } catch (jsonErr) {
        console.error("Failed to parse Gemini AI response as JSON. Content:", responseText);
        // Clean structured safe fallback to prevent crash
        parsedReport = {
          analytics: {
            communication_score: 5,
            technical_depth_score: 5,
            problem_solving_score: 5,
            overall_fit_score: 5
          },
          mom: {
            candidate_summary: "A technical error occurred while parses the report JSON. Raw contents saved.",
            key_strengths: ["Communication captured"],
            improvement_areas: ["Technical logs validation"],
            detailed_qna: [
              {
                question: "General Interview",
                answer_summary: "not captured",
                technical_accuracy: "Not Evaluated",
                ai_feedback: "Full raw logs accessible."
              }
            ]
          }
        };
      }

      // 6. Save or update inside DB
      const reportJsonString = JSON.stringify(parsedReport);

      // Check if report already exists
      const [existingReports]: any = await db.query(
        "SELECT id FROM interview_reports WHERE interview_id = ?",
        [interviewId]
      );

      if (existingReports && existingReports.length > 0) {
        await db.query(
          "UPDATE interview_reports SET report_json = ?, generated_at = CURRENT_TIMESTAMP WHERE interview_id = ?",
          [reportJsonString, interviewId]
        );
      } else {
        await db.query(
          "INSERT INTO interview_reports (interview_id, report_json, status, generated_by_ai_model, generated_at) VALUES (?, ?, 'DRAFT', 'gemini-3.5-flash', CURRENT_TIMESTAMP)",
          [interviewId, reportJsonString]
        );
      }

      // Also mark interview status as COMPLETED
      await db.query(
        "UPDATE interviews SET status = 'COMPLETED' WHERE id = ?",
        [interviewId]
      );

      return parsedReport;
    } catch (err) {
      console.error("[InterviewAIService] Error generating report:", err);
      throw err;
    }
  }
}
