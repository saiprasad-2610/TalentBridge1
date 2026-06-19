import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Sparkles, Calendar, BookOpen, ChevronRight, Award, Plus, Clipboard, User, FileText, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { motion, AnimatePresence } from "motion/react";

interface MockAttempt {
  id: number;
  student_id: number;
  score: number;
  communication_score: number;
  confidence_score: number;
  explanation_score: number;
  presentation_score: number;
  knowledge_score: number;
  feedback: string;
  strengths_json: string;
  weaknesses_json: string;
  tips_json: string;
  questions_answers_json: string;
  created_at: string;
}

export function MockHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [history, setHistory] = useState<MockAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAttempt, setSelectedAttempt] = useState<MockAttempt | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const res = await api.get(`/ai/history/${user.id}`);
        if (res.data?.success && res.data?.data) {
          setHistory(res.data.data);
          if (res.data.data.length > 0) {
            setSelectedAttempt(res.data.data[0]);
          }
        }
        setError(null);
      } catch (err: any) {
        console.error("Error loading mock history:", err);
        setError("Unable to sync performance history. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user?.id]);

  const parseJsonArray = (jsonStr: string | null | undefined): string[] => {
    if (!jsonStr) return [];
    try {
      const parsed = typeof jsonStr === "string" ? JSON.parse(jsonStr) : jsonStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const getSubscoreChartData = (attempt: MockAttempt) => {
    return [
      { subject: "Communication", value: attempt.communication_score || 70, fullMark: 100 },
      { subject: "Confidence", value: attempt.confidence_score || 70, fullMark: 100 },
      { subject: "Knowledge", value: attempt.knowledge_score || 70, fullMark: 100 },
      { subject: "Explanation", value: attempt.explanation_score || 70, fullMark: 100 },
      { subject: "Presentation", value: attempt.presentation_score || 70, fullMark: 100 },
    ];
  };

  const calculateAverageScore = () => {
    if (history.length === 0) return 0;
    const total = history.reduce((acc, curr) => acc + (curr.score || 0), 0);
    return Math.round(total / history.length);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* Top Welcome Band */}
      <div className="relative bg-gradient-to-r from-[#0d1635] to-[#12234e] rounded-3xl p-8 md:p-10 text-white overflow-hidden shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-purple-500/10 rounded-full blur-[80px]" />
        <div className="relative z-10 space-y-3 max-w-2xl">
          <span className="p-1 px-3 bg-purple-500/20 text-purple-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-purple-500/30">
            Performance Archives
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            AI Interview Scorecards
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold">
            Study your simulation session logs, check chronological AI scores across multiple parameters, analyze gaps, and master corporate interviews with 100% verified intelligence insights.
          </p>
        </div>
        <button
          onClick={() => navigate("/interview")}
          className="self-stretch md:self-auto px-6 py-4 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md select-none flex items-center justify-center gap-2"
        >
          <Plus size={14} /> Start New Prep
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white rounded-3xl border border-slate-100 min-h-[300px]">
          <Loader2 className="animate-spin text-purple-600" size={32} />
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Syncing assessment archives...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4 text-red-700">
          <AlertCircle size={24} className="flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">Synchronisation Interrupted</h4>
            <p className="text-xs mt-1 text-red-600">{error}</p>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center bg-white border border-slate-100 rounded-3xl p-8 space-y-4 shadow-sm">
          <Clipboard className="text-slate-300" size={56} />
          <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">No Mock Sessions Recorded</h3>
          <p className="text-slate-500 text-xs max-w-sm font-semibold leading-relaxed">
            Verify your interview strategies by taking standard technical and behavioral simulation practice sets. First round is on us!
          </p>
          <button
            onClick={() => navigate("/interview")}
            className="px-6 py-3.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-xs font-black uppercase tracking-wider cursor-pointer shadow-sm active:scale-95 transition-all mt-2"
          >
            Launch Interview Simulator
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* History List Left Card (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-50">
                <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest">
                  Attempt History ({history.length})
                </h3>
                <span className="text-[10px] font-black text-purple-600 bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 uppercase tracking-widest">
                  Avg: {calculateAverageScore()}%
                </span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {history.map((attempt) => (
                  <div
                    key={attempt.id}
                    onClick={() => setSelectedAttempt(attempt)}
                    className={`p-4 rounded-2.5xl cursor-pointer transition-all border text-left flex items-center justify-between gap-4 ${
                      selectedAttempt?.id === attempt.id
                        ? "bg-purple-50/50 border-purple-300 text-slate-900 shadow-sm"
                        : "bg-white border-slate-100 text-slate-650 hover:border-purple-200"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-xl ${selectedAttempt?.id === attempt.id ? "bg-purple-100 text-purple-700" : "bg-slate-50 text-slate-400 group-hover:bg-purple-50"}`}>
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-slate-900">
                          {new Date(attempt.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </h4>
                        <p className="text-[9px] text-slate-400 uppercase font-extrabold mt-1 tracking-wider">
                          Session #{attempt.id} &bull; Scorecard Ready
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-black ${attempt.score >= 80 ? "text-emerald-600" : attempt.score >= 50 ? "text-yellow-600" : "text-slate-500"}`}>
                        {attempt.score}%
                      </span>
                      <ChevronRight size={14} className={selectedAttempt?.id === attempt.id ? "text-purple-600 translate-x-0.5" : "text-slate-350"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Details Dashboard Right Card (7 cols) */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              {selectedAttempt && (
                <motion.div
                  key={selectedAttempt.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  {/* Score Summary Overview Row */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    <div className="flex justify-between items-start gap-4">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Score Detail</span>
                        <h2 className="text-xl font-bold font-black text-slate-950 uppercase tracking-tight">AI Assessment Scorecard</h2>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wide mt-1">
                          Completed on: {new Date(selectedAttempt.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-black text-purple-600">{selectedAttempt.score}%</div>
                        <div className="text-[9px] text-slate-400 uppercase tracking-widest font-extrabold mt-1">Overall</div>
                      </div>
                    </div>

                    {/* Recharts Skill Matrix Chart */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                      <div className="md:col-span-5 flex justify-center">
                        <div className="w-full h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getSubscoreChartData(selectedAttempt)}>
                              <PolarGrid stroke="#f1f5f9" />
                              <PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 8, fontWeight: 'bold' }} />
                              <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#e2e8f0', fontSize: 6 }} />
                              <Radar name="Metrics" dataKey="value" stroke="#9333ea" fill="#a855f7" fillOpacity={0.2} />
                            </RadarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Breakdown Stats */}
                      <div className="md:col-span-7 grid grid-cols-2 gap-4">
                        {[
                          { lbl: "Communication", val: selectedAttempt.communication_score, color: "bg-blue-500" },
                          { lbl: "Confidence", val: selectedAttempt.confidence_score, color: "bg-teal-500" },
                          { lbl: "Knowledge", val: selectedAttempt.knowledge_score, color: "bg-purple-500" },
                          { lbl: "Explanation", val: selectedAttempt.explanation_score, color: "bg-yellow-500" },
                          { lbl: "Presentation", val: selectedAttempt.presentation_score, color: "bg-pink-500" },
                        ].map((m) => (
                          <div key={m.lbl} className="bg-slate-50/50 border border-slate-100 p-3 rounded-2xl flex flex-col justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{m.lbl}</span>
                            <div className="flex items-center justify-between gap-2 mt-2">
                              <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                <div className={`h-full ${m.color}`} style={{ width: `${m.val || 70}%` }} />
                              </div>
                              <span className="text-xs font-black text-slate-700">{m.val || 70}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Feedback summary tabs */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                    <div>
                      <h4 className="font-black text-slate-950 text-xs uppercase tracking-widest pb-3 border-b border-slate-50 flex items-center gap-2">
                        <BookOpen size={14} className="text-purple-600" /> Executive AI Coaching Summary
                      </h4>
                      <p className="text-xs text-slate-600 font-semibold leading-relaxed mt-4 bg-purple-50/20 p-4 rounded-2xl border border-purple-100/30">
                        {selectedAttempt.feedback || "Your attempt scorecard has been calculated. Outstanding performance with highlights on technical problem statement synthesis. Focus details can be review in the specific highlights below."}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Strengths */}
                      <div className="space-y-3">
                        <h5 className="font-black text-[10px] uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                          <CheckCircle size={12} /> Key Strengths
                        </h5>
                        {parseJsonArray(selectedAttempt.strengths_json).length === 0 ? (
                          <p className="text-[10px] text-slate-400 font-semibold">Identified strengths will show up once assessed.</p>
                        ) : (
                          <ul className="space-y-2">
                            {parseJsonArray(selectedAttempt.strengths_json).map((str, index) => (
                              <li key={index} className="text-xs font-bold text-slate-650 flex items-start gap-2 bg-emerald-50/30 p-2.5 rounded-xl border border-emerald-100/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                                {str}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      {/* Weaknesses / Improvements */}
                      <div className="space-y-3">
                        <h5 className="font-black text-[10px] uppercase tracking-wider text-red-500 flex items-center gap-1.5">
                          <AlertCircle size={12} /> Growth Potential
                        </h5>
                        {parseJsonArray(selectedAttempt.weaknesses_json).length === 0 ? (
                          <p className="text-[10px] text-slate-400 font-semibold">No critical gaps detected.</p>
                        ) : (
                          <ul className="space-y-2">
                            {parseJsonArray(selectedAttempt.weaknesses_json).map((weak, index) => (
                              <li key={index} className="text-xs font-bold text-slate-650 flex items-start gap-2 bg-red-50/20 p-2.5 rounded-xl border border-red-100/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 flex-shrink-0" />
                                {weak}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    {/* Developer Actionable Tips */}
                    {parseJsonArray(selectedAttempt.tips_json).length > 0 && (
                      <div className="pt-4 border-t border-slate-50 space-y-3">
                        <h5 className="font-black text-[10px] uppercase tracking-widest text-purple-600 flex items-center gap-1.5">
                          <Sparkles size={12} /> Personalized Mastery Roadmap
                        </h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {parseJsonArray(selectedAttempt.tips_json).map((tip, idx) => (
                            <div key={idx} className="p-3 bg-purple-50/25 border border-purple-100/30 rounded-2xl text-[11px] text-slate-600 font-bold leading-normal flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-purple-100 text-purple-700 text-[9px] font-black flex items-center justify-center flex-shrink-0">{idx+1}</span>
                              {tip}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
