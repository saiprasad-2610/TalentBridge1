import express from "express";
import { authenticate } from "../middleware/auth.ts";
import db from "../db";
import { GoogleGenAI } from "@google/genai";

const router = express.Router();
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Get question set for a specific test
router.get("/questions/:type", authenticate, async (req: any, res) => {
  try {
    const { type } = req.params; // pq, iq, eq, sq
    
    // Check if valid type
    if (!['pq', 'iq', 'eq', 'sq'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid test type' });
    }

    const table = `${type}_questions`;
    
    // Check if table is empty, and seed if needed
    const [countResult]: any = await db.query(`SELECT COUNT(*) as cnt FROM ${table}`);
    const cnt = countResult[0]?.cnt || 0;
    
    if (cnt === 0) {
      console.log(`Seeding default questions for ${type}`);
      if (type === 'pq') {
        const defaultPQ = [
          { question: "I am someone who handles pressure and tight deadlines calmly.", options_json: JSON.stringify([{ text: "Strongly Disagree", value: 1 }, { text: "Disagree", value: 3 }, { text: "Neutral", value: 5 }, { text: "Agree", value: 8 }, { text: "Strongly Agree", value: 10 }]), category: "Resilience", weight: 1 },
          { question: "I prefer working in highly structured environments.", options_json: JSON.stringify([{ text: "Strongly Disagree", value: 10 }, { text: "Disagree", value: 8 }, { text: "Neutral", value: 5 }, { text: "Agree", value: 3 }, { text: "Strongly Agree", value: 1 }]), category: "Adaptability", weight: 1 },
          { question: "I am someone who pays deep attention to product details.", options_json: JSON.stringify([{ text: "Strongly Disagree", value: 1 }, { text: "Disagree", value: 3 }, { text: "Neutral", value: 5 }, { text: "Agree", value: 8 }, { text: "Strongly Agree", value: 10 }]), category: "Attention to Detail", weight: 1 },
          { question: "I enjoy leading a team and taking responsibility for results.", options_json: JSON.stringify([{ text: "Strongly Disagree", value: 1 }, { text: "Disagree", value: 3 }, { text: "Neutral", value: 5 }, { text: "Agree", value: 8 }, { text: "Strongly Agree", value: 10 }]), category: "Leadership", weight: 1 },
          { question: "I find it easy to adapt to sudden changes in strategy.", options_json: JSON.stringify([{ text: "Strongly Disagree", value: 1 }, { text: "Disagree", value: 3 }, { text: "Neutral", value: 5 }, { text: "Agree", value: 8 }, { text: "Strongly Agree", value: 10 }]), category: "Agility", weight: 1 }
        ];
        for (const q of defaultPQ) {
          await db.query(`INSERT INTO pq_questions (question, options_json, category, weight) VALUES (?, ?, ?, ?)`, [q.question, q.options_json, q.category, q.weight]);
        }
      } else if (type === 'iq') {
        const defaultIQ = [
          { question: "Find the next number in the sequence: 3, 6, 12, 24, ...", options_json: JSON.stringify([{ text: "36", value: 0 }, { text: "48", value: 10 }, { text: "60", value: 0 }, { text: "40", value: 0 }]), answer: "48", difficulty: "Medium" },
          { question: "If all bloops are razzies and all razzies are lazzies, are all bloops lazzies?", options_json: JSON.stringify([{ text: "Yes, definitely", value: 10 }, { text: "No, never", value: 0 }, { text: "Sometimes", value: 0 }, { text: "Cannot be determined", value: 0 }]), answer: "Yes, definitely", difficulty: "Easy" },
          { question: "Which of the following is the odd one out?", options_json: JSON.stringify([{ text: "Apple", value: 0 }, { text: "Orange", value: 0 }, { text: "Banana", value: 0 }, { text: "Carrot", value: 10 }]), answer: "Carrot", difficulty: "Easy" },
          { question: "A bat and ball cost $1.10 in total. The bat costs $1.00 more than the ball. How much does the ball cost?", options_json: JSON.stringify([{ text: "$0.10", value: 0 }, { text: "$0.05", value: 10 }, { text: "$0.15", value: 0 }, { text: "$0.01", value: 0 }]), answer: "$0.05", difficulty: "Hard" },
          { question: "If five machines make five widgets in five minutes, how long does it take 100 machines to make 100 widgets?", options_json: JSON.stringify([{ text: "100 minutes", value: 0 }, { text: "20 minutes", value: 0 }, { text: "5 minutes", value: 10 }, { text: "50 minutes", value: 0 }]), answer: "5 minutes", difficulty: "Medium" }
        ];
        for (const q of defaultIQ) {
          await db.query(`INSERT INTO iq_questions (question, options_json, answer, difficulty) VALUES (?, ?, ?, ?)`, [q.question, q.options_json, q.answer, q.difficulty]);
        }
      } else if (type === 'eq') {
        const defaultEQ = [
          { question: "A teammate is visibly upset about a code review feedback. What do you do?", options_json: JSON.stringify([{ text: "Acknowledge their work and talk to them to understand their concern", value: 10 }, { text: "Ignore them", value: 2 }, { text: "Tell everyone they are emotional", value: 0 }]), emotional_trait: "Empathy" },
          { question: "You receive constructive but harsh feedback from your supervisor. How do you respond?", options_json: JSON.stringify([{ text: "Take a breath, reflect, and request a clarification meeting", value: 10 }, { text: "Get defensive and walk out", value: 2 }, { text: "Send an upset email", value: 0 }]), emotional_trait: "Self-Regulation" },
          { question: "When resolving a conflict, I pay attention to...", options_json: JSON.stringify([{ text: "Both verbal statements and underlying feelings/emotions", value: 10 }, { text: "Only the literal words spoken", value: 5 }, { text: "My own goals and winning the argument", value: 1 }]), emotional_trait: "Relationship Management" }
        ];
        for (const q of defaultEQ) {
          await db.query(`INSERT INTO eq_questions (question, options_json, emotional_trait) VALUES (?, ?, ?)`, [q.question, q.options_json, q.emotional_trait]);
        }
      } else if (type === 'sq') {
        const defaultSQ = [
          { question: "You are placed in a newly formed team with people from different backgrounds. How do you act?", options_json: JSON.stringify([{ text: "Ask questions to understand their work styles and listen actively", value: 10 }, { text: "Stick only to my own familiar group", value: 2 }, { text: "Impose my own communication rules", value: 0 }]), social_trait: "Inclusivity" },
          { question: "A team discussion is getting heated. Your role is...", options_json: JSON.stringify([{ text: "Act as a calm mediator and focus back on common goals", value: 10 }, { text: "Take a hard side to end it", value: 3 }, { text: "Stay completely silent", value: 5 }]), social_trait: "Conflict Resolution" },
          { question: "A peer is struggling to speak during a project brainstorming meeting. You...", options_json: JSON.stringify([{ text: "Create an open space for them and ask kindly for their thoughts", value: 10 }, { text: "Carry on without interrupting the flow", value: 3 }, { text: "Point out publicly that they are too quiet", value: 1 }]), social_trait: "Collaboration" }
        ];
        for (const q of defaultSQ) {
          await db.query(`INSERT INTO sq_questions (question, options_json, social_trait) VALUES (?, ?, ?)`, [q.question, q.options_json, q.social_trait]);
        }
      }
    }
    
    const isSQLite = !process.env.DB_HOST;
    const orderBy = isSQLite ? "RANDOM()" : "RAND()";
    const [questions]: any = await db.query(`SELECT * FROM ${table} ORDER BY ${orderBy} LIMIT 25`);
    
    // Depending on DB, options_json might be string or object
    const formattedQuestions = questions.map((q: any) => ({
      ...q,
      options_json: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json,
      answer: type === 'iq' ? undefined : undefined // hide exact answer for IQ
    }));

    res.json({ success: true, questions: formattedQuestions });

  } catch (error) {
    console.error("Fetch Questions Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Submit a specific test
router.post("/submit/:type", authenticate, async (req: any, res) => {
  try {
    const { type } = req.params;
    const { answers, timeTaken } = req.body;
    const userId = req.user.userId;

    if (!['pq', 'iq', 'eq', 'sq'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid test type' });
    }

    let score = 0;
    let details: any = {};

    if (type === 'iq') {
      const [allQuestions]: any = await db.query("SELECT id, answer FROM iq_questions");
      let correct = 0;
      answers.forEach((ans: any) => {
        const q = allQuestions.find((q: any) => q.id === ans.questionId);
        if (q && q.answer === ans.selectedOption) {
          correct++;
        }
      });
      score = Math.round((correct / Math.max(answers.length, 1)) * 100);
      details = { correct, total: answers.length, timeTaken };
    } else {
      // For PQ, EQ, SQ, score is calculated based on options mapping or logic
      // In this basic version, we assume options_json has { text: "", value: 1-10 }
      let totalValue = 0;
      let maxPossibleValue = 0;
      const [allQuestions]: any = await db.query(`SELECT id, options_json FROM ${type}_questions`);
      
      answers.forEach((ans: any) => {
        const q = allQuestions.find((q: any) => q.id === ans.questionId);
        if (q) {
          const options = typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json;
          const selectedIntOpt = options.find((o: any) => o.text === ans.selectedOption);
          const maxVal = Math.max(...options.map((o:any) => o.value || 0));
          
          if (selectedIntOpt && selectedIntOpt.value) totalValue += selectedIntOpt.value;
          maxPossibleValue += (maxVal > 0 ? maxVal : 10);
        }
      });
      score = Math.round((totalValue / Math.max(maxPossibleValue, 1)) * 100);
      details = { totalValue, maxPossibleValue, timeTaken };
    }

    // Upsert into student_assessment_results
    const [existing]: any = await db.query("SELECT id FROM student_assessment_results WHERE user_id = ?", [userId]);
    
    if (existing.length > 0) {
      await db.query(`
        UPDATE student_assessment_results
        SET ${type}_score = ?, ${type}_details_json = ?, completed_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `, [score, JSON.stringify(details), userId]);
    } else {
      await db.query(`
        INSERT INTO student_assessment_results (user_id, ${type}_score, ${type}_details_json, completed_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `, [userId, score, JSON.stringify(details)]);
    }

    res.json({ success: true, score, message: `Successfully completed ${type.toUpperCase()} test` });

  } catch (error) {
    console.error("Submit Test Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Get user status for tests
router.get("/status", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const [results]: any = await db.query("SELECT * FROM student_assessment_results WHERE user_id = ?", [userId]);
    
    if (results.length > 0) {
      const { pq_score, iq_score, eq_score, sq_score, ai_behavioral_summary } = results[0];
      res.json({
        success: true,
        data: {
          pq: { completed: pq_score !== null, score: pq_score },
          iq: { completed: iq_score !== null, score: iq_score },
          eq: { completed: eq_score !== null, score: eq_score },
          sq: { completed: sq_score !== null, score: sq_score },
          ai_behavioral_summary
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          pq: { completed: false, score: null },
          iq: { completed: false, score: null },
          eq: { completed: false, score: null },
          sq: { completed: false, score: null },
          ai_behavioral_summary: null
        }
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin get all questions
router.get("/admin/questions/:type", authenticate, async (req: any, res) => {
  try {
    const { type } = req.params;
    if (!['pq', 'iq', 'eq', 'sq'].includes(type) || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const table = `${type}_questions`;
    const [questions]: any = await db.query(`SELECT * FROM ${table} ORDER BY created_at DESC`);
    
    // Depending on DB, options_json might be string or object
    const formattedQuestions = questions.map((q: any) => ({
      ...q,
      options_json: typeof q.options_json === 'string' ? JSON.parse(q.options_json) : q.options_json
    }));

    res.json({ success: true, questions: formattedQuestions });

  } catch (error) {
    console.error("Admin fetch Questions Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin edit question
router.put("/admin/questions/:type/:id", authenticate, async (req: any, res) => {
  try {
    const { type, id } = req.params;
    if (!['pq', 'iq', 'eq', 'sq'].includes(type) || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { question, options, category, answer, weight, difficulty, trait } = req.body;
    let query = "";
    let params: any[] = [];

    if (type === 'pq') {
      query = "UPDATE pq_questions SET question = ?, options_json = ?, category = ?, weight = ? WHERE id = ?";
      params = [question, JSON.stringify(options), category, weight || 1, id];
    } else if (type === 'iq') {
      query = "UPDATE iq_questions SET question = ?, options_json = ?, answer = ?, difficulty = ? WHERE id = ?";
      params = [question, JSON.stringify(options), answer, difficulty || 'MEDIUM', id];
    } else if (type === 'eq') {
      query = "UPDATE eq_questions SET question = ?, options_json = ?, emotional_trait = ? WHERE id = ?";
      params = [question, JSON.stringify(options), trait || 'Empathy', id];
    } else if (type === 'sq') {
      query = "UPDATE sq_questions SET question = ?, options_json = ?, social_trait = ? WHERE id = ?";
      params = [question, JSON.stringify(options), trait || 'Collaboration', id];
    }

    await db.query(query, params);
    res.json({ success: true, message: "Question updated successfully" });
  } catch(error) {
    console.error("Admin edit question error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});
router.post("/admin/questions/:type", authenticate, async (req: any, res) => {
  try {
    const { type } = req.params;
    if (!['pq', 'iq', 'eq', 'sq'].includes(type) || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { question, options, category, answer, weight, difficulty, trait } = req.body;
    let query = "";
    let params: any[] = [];

    if (type === 'pq') {
      query = "INSERT INTO pq_questions (question, options_json, category, weight) VALUES (?, ?, ?, ?)";
      params = [question, JSON.stringify(options), category, weight || 1];
    } else if (type === 'iq') {
      query = "INSERT INTO iq_questions (question, options_json, answer, difficulty) VALUES (?, ?, ?, ?)";
      params = [question, JSON.stringify(options), answer, difficulty || 'MEDIUM'];
    } else if (type === 'eq') {
      query = "INSERT INTO eq_questions (question, options_json, emotional_trait) VALUES (?, ?, ?)";
      params = [question, JSON.stringify(options), trait || 'Empathy'];
    } else if (type === 'sq') {
      query = "INSERT INTO sq_questions (question, options_json, social_trait) VALUES (?, ?, ?)";
      params = [question, JSON.stringify(options), trait || 'Collaboration'];
    }

    await db.query(query, params);
    res.json({ success: true, message: "Question added successfully" });
  } catch(error) {
    console.error("Admin add question error", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.post("/admin/questions/:type/bulk", authenticate, async (req: any, res) => {
  try {
    const { type } = req.params;
    if (!['pq', 'iq', 'eq', 'sq'].includes(type) || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const { questions } = req.body;
    if (!Array.isArray(questions)) {
      return res.status(400).json({ success: false, message: 'Invalid payload: questions must be an array' });
    }

    for (const item of questions) {
      const { question, options, category, answer, weight, difficulty, trait } = item;
      let query = "";
      let params: any[] = [];

      if (type === 'pq') {
        query = "INSERT INTO pq_questions (question, options_json, category, weight) VALUES (?, ?, ?, ?)";
        params = [question, JSON.stringify(options), category || 'General', weight || 1];
      } else if (type === 'iq') {
        query = "INSERT INTO iq_questions (question, options_json, answer, difficulty) VALUES (?, ?, ?, ?)";
        params = [question, JSON.stringify(options), answer || '', difficulty || 'MEDIUM'];
      } else if (type === 'eq') {
        query = "INSERT INTO eq_questions (question, options_json, emotional_trait) VALUES (?, ?, ?)";
        params = [question, JSON.stringify(options), trait || 'Empathy'];
      } else if (type === 'sq') {
        query = "INSERT INTO sq_questions (question, options_json, social_trait) VALUES (?, ?, ?)";
        params = [question, JSON.stringify(options), trait || 'Collaboration'];
      }

      await db.query(query, params);
    }

    res.json({ success: true, message: `Successfully imported ${questions.length} questions` });
  } catch(error) {
    console.error("Admin bulk add questions error", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Generate AI summary
router.post("/generate-summary", authenticate, async (req: any, res) => {
  try {
    const userId = req.user.userId;
    const [results]: any = await db.query("SELECT * FROM student_assessment_results WHERE user_id = ?", [userId]);
    
    if (results.length === 0 || results[0].pq_score === null || results[0].iq_score === null || results[0].eq_score === null || results[0].sq_score === null) {
      return res.status(400).json({ success: false, message: "All tests must be completed first" });
    }

    const { pq_score, iq_score, eq_score, sq_score } = results[0];
    
    // Generate AI Summary
    const prompt = `
      You are an expert HR psychologist. Write a brief professional behavioral summary for a candidate with the following scores (out of 100):
      Personality Quotient (PQ): ${pq_score}
      Intelligence Quotient (IQ): ${iq_score}
      Emotional Quotient (EQ): ${eq_score}
      Social Quotient (SQ): ${sq_score}
      
      Provide a highly professional 3-sentence summary covering their cognitive ability, teamwork, leadership potential, and emotional resilience.
    `;

    const chatWithHistory = ai.chats.create({
      model: "gemini-3.5-flash",
      config: { temperature: 0.7 }
    });

    const response = await chatWithHistory.sendMessage({ message: prompt });
    let aiText = response.text || '';
    
    await db.query("UPDATE student_assessment_results SET ai_behavioral_summary = ? WHERE user_id = ?", [aiText, userId]);
    
    res.json({ success: true, summary: aiText });

  } catch(error) {
    console.error("AI Summary Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// Admin delete question
router.delete("/admin/questions/:type/:id", authenticate, async (req: any, res) => {
  try {
    const { type, id } = req.params;
    if (!['pq', 'iq', 'eq', 'sq'].includes(type) || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    const table = `${type}_questions`;
    await db.query(`DELETE FROM ${table} WHERE id = ?`, [id]);
    res.json({ success: true, message: "Question deleted successfully" });
  } catch(error) {
    console.error("Admin delete question error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

export default router;
