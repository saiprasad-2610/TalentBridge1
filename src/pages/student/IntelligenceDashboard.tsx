import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Sparkles, Brain, Compass, Users2, ShieldAlert, CheckCircle, ChevronRight, Play, RefreshCw, BarChart2, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { motion } from "motion/react";

interface QuotientState {
  completed: boolean;
  score: number | null;
}

interface AssessmentStatus {
  pq: QuotientState;
  iq: QuotientState;
  eq: QuotientState;
  sq: QuotientState;
  ai_behavioral_summary: string | null;
}

export default function IntelligenceDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AssessmentStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const res = await api.get("/intelligence/status");
      if (res.data?.success && res.data?.data) {
        setData(res.data.data);
      }
      setError(null);
    } catch (err: any) {
      console.error("Error fetching intelligence mapping:", err);
      setError("Unable to catalog cognitive test metrics. Please refresh/try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [user?.id]);

  const handleGenerateSummary = async () => {
    try {
      setGenerating(true);
      setSuccessMsg("");
      const res = await api.post("/intelligence/generate-summary");
      if (res.data?.success) {
        setSuccessMsg("AI behavioral summary generated successfully!");
        await fetchStatus();
      }
    } catch (err: any) {
      console.error("AI summary error:", err);
      setError(err.response?.data?.message || "Ensure you complete all 4 tests to generate the summary.");
    } finally {
      setGenerating(false);
    }
  };

  const getRadarChartData = (status: AssessmentStatus) => {
    return [
      { subject: "Analytical (IQ)", value: status.iq.score || 0 },
      { subject: "Emotional (EQ)", value: status.eq.score || 0 },
      { subject: "Psychometric (PQ)", value: status.pq.score || 0 },
      { subject: "Social (SQ)", value: status.sq.score || 0 },
    ];
  };

  const tests = [
    {
      id: "iq",
      title: "Analytical Intelligence (IQ)",
      desc: "Measure structural problem solving ability, logic, numeric reasoning, and pattern recognition capabilities.",
      icon: Brain,
      color: "from-blue-500 to-cyan-500",
      accent: "text-blue-500 bg-blue-50",
    },
    {
      id: "eq",
      title: "Emotional Intelligence (EQ)",
      desc: "Assess self-regulation, empathy, emotional awareness, and interpersonal crisis management skills.",
      icon: Compass,
      color: "from-purple-500 to-pink-500",
      accent: "text-purple-500 bg-purple-50",
    },
    {
      id: "sq",
      title: "Social/Situational (SQ)",
      desc: "Measure multi-cultural collaboration, conflict moderation, communication agility, and inclusive leadership behaviors.",
      icon: Users2,
      color: "from-emerald-500 to-teal-500",
      accent: "text-emerald-500 bg-emerald-50",
    },
    {
      id: "pq",
      title: "Psychometric Profile (PQ)",
      desc: "Understand structural career preferences, resilience, and workplace behavioral strengths.",
      icon: ShieldAlert,
      color: "from-amber-500 to-orange-500",
      accent: "text-amber-500 bg-amber-50",
    }
  ];

  const allCompleted = data ? (data.pq.completed && data.iq.completed && data.eq.completed && data.sq.completed) : false;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* Top Welcome Title */}
      <div className="relative bg-gradient-to-r from-[#0d1635] to-[#142352] rounded-3xl p-8 md:p-10 text-white overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="p-1 px-3 bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
            Cognitive Assessment Hub
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Intelligence Profiler
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold">
            Evaluate your core cognitive, psychometric, emotional, and social aptitudes. Verified test credentials are mapped directly onto recruiter dashboards to present a multi-dimensional proof of leadership potential.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2.5xl p-4 flex items-center gap-3 text-emerald-700 text-xs font-bold">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2.5xl p-4 flex items-center gap-3 text-red-700 text-xs font-bold">
          <AlertCircle size={16} className="text-red-700 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white rounded-3xl border border-slate-100 min-h-[300px]">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Syncing Assessment States...</p>
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Tests Category Cards Left (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            <h3 className="font-black text-slate-950 text-xs uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-50">
              <BarChart2 size={14} className="text-blue-500" /> Quotient Assessment Sections
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {tests.map((test) => {
                const metric: QuotientState = (data as any)[test.id];
                return (
                  <div key={test.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-all group">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className={`p-3 rounded-2xl ${test.accent}`}>
                          <test.icon size={20} />
                        </div>
                        {metric.completed ? (
                          <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 uppercase tracking-widest">
                            Score: {metric.score || 0}%
                          </span>
                        ) : (
                          <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full border border-slate-100 uppercase tracking-widest">
                            Not Started
                          </span>
                        )}
                      </div>
                      
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{test.title}</h4>
                        <p className="text-slate-400 text-[11px] leading-relaxed mt-2 font-medium">{test.desc}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(`/student/intelligence/${test.id}`)}
                      className="mt-6 py-3 px-4 rounded-xl border border-slate-100 hover:border-blue-500/30 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 bg-slate-50/50 hover:bg-white shadow-sm flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Play size={10} /> {metric.completed ? "Retake Assessment" : "Start Assessment"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Radar & AI Profile Right Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            {/* Radar representation */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-black text-slate-950 text-xs uppercase tracking-widest pb-3 border-b border-slate-50">
                Cognitive Footprint
              </h4>
              <div className="w-full h-48 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="70%" data={getRadarChartData(data)}>
                    <PolarGrid stroke="#f1f5f9" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#64748b', fontSize: 8, fontWeight: 'bold' }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#cbd5e1', fontSize: 6 }} />
                    <Radar name="Metrics" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* AI report card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-black text-slate-950 text-xs uppercase tracking-widest pb-3 border-b border-slate-50 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" /> Behavioral Personality Insights
              </h4>

              {data.ai_behavioral_summary ? (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-100/10 text-[11px] text-slate-650 font-semibold leading-relaxed">
                    "{data.ai_behavioral_summary}"
                  </div>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generating}
                    className="w-full py-3 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 bg-white flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <RefreshCw size={12} className={generating ? "animate-spin" : ""} /> Refresh AI Summary
                  </button>
                </div>
              ) : (
                <div className="space-y-4 text-left">
                  <p className="text-slate-405 text-xs font-semibold leading-relaxed">
                    Complete all 4 Quotient assessments first to trigger a comprehensive automated behavioral summary powered by expert HR models.
                  </p>
                  <button
                    onClick={handleGenerateSummary}
                    disabled={generating || !allCompleted}
                    className={`w-full py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest transition-all shadow-sm flex items-center justify-center gap-2 ${
                      allCompleted
                        ? "bg-indigo-600 hover:bg-indigo-700 cursor-pointer"
                        : "bg-slate-200 cursor-not-allowed text-slate-400 border border-slate-100 shadow-none"
                    }`}
                  >
                    {generating ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Generating...
                      </>
                    ) : (
                      <>Compile AI Report</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
