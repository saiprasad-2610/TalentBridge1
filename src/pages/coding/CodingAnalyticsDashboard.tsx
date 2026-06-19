import React, { useState, useEffect } from "react";
import { Loader2, AlertCircle, Sparkles, Terminal, Code2, Link, RefreshCw, Trash2, CheckCircle2, ChevronRight, Zap, Target, BookOpen } from "lucide-react";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { motion, AnimatePresence } from "motion/react";

interface CodingProfile {
  id: number;
  platform: string;
  profile_url: string;
  username: string;
  is_verified: number;
  last_synced_at: string;
}

interface CodingStat {
  id: number;
  profile_id: number;
  problems_solved: number;
  contest_rating: number;
  streak: number;
  difficulty_breakdown_json: string;
  topics_json: string;
}

interface CodingAnalysis {
  id: number;
  coding_score: number;
  strengths_json: string;
  weaknesses_json: string;
  ai_feedback: string;
  recommendations_json: string;
}

export function CodingAnalyticsDashboard() {
  const { user } = useAuth();
  const [profiles, setProfiles] = useState<CodingProfile[]>([]);
  const [stats, setStats] = useState<CodingStat[]>([]);
  const [analysis, setAnalysis] = useState<CodingAnalysis | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Connection form state
  const [platform, setPlatform] = useState("leetcode");
  const [profileUrl, setProfileUrl] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const fetchData = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/coding/analytics/${user.id}`);
      if (res.data?.success) {
        setProfiles(res.data.profiles || []);
        setStats(res.data.stats || []);
        setAnalysis(res.data.analysis || null);
      }
      setError(null);
    } catch (err: any) {
      console.error("Error loading coding analytics:", err);
      setError("Failed to load your coding profiles. Please configure connection details below.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileUrl.trim()) return;
    try {
      setConnecting(true);
      setSuccessMsg("");
      setError(null);
      const res = await api.post("/coding/connect", {
        userId: user?.id,
        platform,
        profileUrl
      });
      if (res.data?.success) {
        setSuccessMsg("Coding profile successfully linked and synchronized!");
        setProfileUrl("");
        await fetchData();
      }
    } catch (err: any) {
      console.error("Connect error:", err);
      setError(err.response?.data?.message || "Failed to catalog your public platform profile. Ensure the URL is valid.");
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async (profileId: number) => {
    try {
      setSyncing(true);
      setError(null);
      const res = await api.post(`/coding/sync/${profileId}`);
      if (res.data?.success) {
        setSuccessMsg("Metrics synced successfully!");
        await fetchData();
      }
    } catch (err: any) {
      setError("Manual sync latency. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async (profileId: number) => {
    if (!window.confirm("Are you sure you want to disconnect this coding profile?")) return;
    try {
      setSyncing(true);
      const res = await api.delete(`/coding/profile/${profileId}`);
      if (res.data?.success) {
        setSuccessMsg("Profile disconnected successfully.");
        await fetchData();
      }
    } catch (err: any) {
      setError("Error removing profile.");
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      const res = await api.post("/coding/analyze", { userId: user?.id });
      if (res.data?.success) {
        setSuccessMsg("AI Skill Analysis generated!");
        await fetchData();
      }
    } catch (err: any) {
      console.error("AI Analysis error:", err);
      setError("Hiring evaluation limits reached. Please retry in some seconds.");
    } finally {
      setAnalyzing(false);
    }
  };

  const parseDifficultyData = (stat: CodingStat) => {
    try {
      const breakdown = typeof stat.difficulty_breakdown_json === 'string'
        ? JSON.parse(stat.difficulty_breakdown_json)
        : stat.difficulty_breakdown_json;
      
      if (!breakdown) return [];
      
      return [
        { name: "Easy", value: breakdown.easy || 0, color: "#10b981" },
        { name: "Medium", value: breakdown.medium || 0, color: "#f59e0b" },
        { name: "Hard", value: breakdown.hard || 0, color: "#ef4444" }
      ].filter(x => x.value > 0);
    } catch {
      return [];
    }
  };

  const parseJsonArray = (jsonStr: string | null | undefined): string[] => {
    if (!jsonStr) return [];
    try {
      const parsed = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* Top Banner */}
      <div className="relative bg-gradient-to-r from-[#0d1635] to-[#111e40] rounded-3xl p-8 md:p-10 text-white overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="p-1 px-3 bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-emerald-500/30">
            Developer Analytics
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Coding Platform Syncer
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold">
            Bind your public coding accounts to demonstrate structural prowess. Your LeetCode stats, solved ratios, topic competencies, and streak history are synchronized to calculate your premium AI Placement Indexes.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-2.5xl p-4 flex items-center gap-3 text-emerald-700 text-xs font-bold">
          <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 rounded-2.5xl p-4 flex items-center gap-3 text-red-700 text-xs font-bold">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white rounded-3xl border border-slate-100 min-h-[300px]">
          <Loader2 className="animate-spin text-emerald-600" size={32} />
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Loading Platform Registries...</p>
        </div>
      ) : profiles.length === 0 ? (
        /* Empty State / Connect Form */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col justify-between">
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl w-fit">
                <Code2 size={24} />
              </div>
              <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight">Connect LeetCode Account</h3>
              <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                Unlock automated skill badge endorsements by linking your active public profiles. We track problems completed difficulty-wise, consistency matrices, and top topic tags to showcase your technical strength to corporate recruiters.
              </p>
              <div className="pt-2">
                <p className="text-[11px] text-slate-400 font-bold">
                  ⚠️ Note: Ensure your profile information matches and public visibility is enabled in your platforms account settings.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
            <form onSubmit={handleConnect} className="space-y-5">
              <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wide">Enter Platform Details</h4>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Choose Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-bold text-slate-700 outline-none"
                >
                  <option value="leetcode">LeetCode</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Profile URL</label>
                <div className="relative">
                  <span className="absolute left-4 top-3.5 text-slate-400">
                    <Link size={14} />
                  </span>
                  <input
                    type="url"
                    placeholder="https://leetcode.com/username"
                    required
                    value={profileUrl}
                    onChange={(e) => setProfileUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold text-slate-700 outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={connecting}
                className="w-full py-4.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {connecting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} /> Synchronizing...
                  </>
                ) : (
                  <>Connect & Sync Account</>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* Profiles Connected Dashboard */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Visuals (8 cols) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Connected profiles list card */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="font-black text-slate-950 text-xs uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-50">
                <Target size={14} className="text-emerald-500" /> Bound Profiles & Synchronizers
              </h3>

              {profiles.map((p) => {
                const stat = stats.find(s => s.profile_id === p.id);
                return (
                  <div key={p.id} className="bg-slate-50/50 border border-slate-100 rounded-2.5xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl font-black text-sm uppercase">
                        {p.platform.substring(0, 2)}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-950 text-sm">{p.username}</h4>
                        <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-0.5">
                          Platform: <span className="text-emerald-600">{p.platform}</span> &bull; Synced: {p.last_synced_at ? new Date(p.last_synced_at).toLocaleString() : "Never"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto self-stretch sm:self-auto justify-end">
                      <button
                        onClick={() => handleSync(p.id)}
                        disabled={syncing}
                        className="flex-1 sm:flex-none py-2 px-4 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-emerald-600 hover:border-emerald-100 bg-white shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <RefreshCw size={12} className={syncing ? "animate-spin" : ""} /> Sync Now
                      </button>
                      <button
                        onClick={() => handleDisconnect(p.id)}
                        disabled={syncing}
                        className="py-2.5 px-3 rounded-xl border border-red-50 text-red-500 hover:bg-red-50 bg-white shadow-sm flex items-center justify-center cursor-pointer"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Performance charts card */}
            {stats.length > 0 && (
              <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
                <h3 className="font-black text-slate-950 text-xs uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-[#f1f5f9]">
                  <Terminal size={14} className="text-emerald-500" /> Platform Metrics Summary
                </h3>

                {stats.map((stat) => {
                  const data = parseDifficultyData(stat);
                  return (
                    <div key={stat.id} className="space-y-8">
                      {/* Grid numbers */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                        <div className="border border-slate-50 p-4 rounded-2xl text-center bg-slate-50/20">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Solved</div>
                          <div className="text-2xl font-black text-slate-850 mt-1">{stat.problems_solved}</div>
                        </div>
                        <div className="border border-slate-50 p-4 rounded-2xl text-center bg-slate-50/20">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contest Rating</div>
                          <div className="text-2xl font-black text-emerald-600 mt-1">{stat.contest_rating || 1500}</div>
                        </div>
                        <div className="border border-slate-50 p-4 rounded-2xl text-center bg-slate-50/20">
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Solved Streak</div>
                          <div className="text-2xl font-black text-amber-500 mt-1">{stat.streak} days</div>
                        </div>
                      </div>

                      {/* Pie charts and difficulty values */}
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center pt-4">
                        <div className="md:col-span-4 h-48 flex justify-center">
                          {data.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={data}
                                  innerRadius={50}
                                  outerRadius={70}
                                  paddingAngle={4}
                                  dataKey="value"
                                >
                                  {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} solved`, "Difficulty"]} />
                              </PieChart>
                            </ResponsiveContainer>
                          ) : (
                            <div className="flex items-center justify-center text-xs text-slate-400">Loading charts...</div>
                          )}
                        </div>

                        <div className="md:col-span-8 space-y-4">
                          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Difficulty Breakdown</h4>
                          <div className="space-y-3">
                            {data.map((d) => (
                              <div key={d.name} className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 w-20">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                                  <span className="text-xs font-bold text-slate-700">{d.name}</span>
                                </div>
                                <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                  <div className="h-full rounded-full" style={{ backgroundColor: d.color, width: `${(d.value / Math.max(stat.problems_solved, 1)) * 100}%` }} />
                                </div>
                                <span className="text-xs font-black text-slate-800">{d.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Skill Evaluation Sidebar (4 cols) */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6 text-left">
              <h4 className="font-black text-slate-950 text-xs uppercase tracking-widest pb-3 border-b border-slate-50 flex items-center gap-1.5">
                <Sparkles size={14} className="text-indigo-500" /> AI Hiring Assessment
              </h4>

              {analysis ? (
                <div className="space-y-6">
                  {/* Score */}
                  <div className="flex justify-between items-center bg-indigo-50/50 p-4 border border-indigo-100/30 rounded-2.5xl">
                    <div>
                      <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Coding Index</div>
                      <div className="text-2xl font-black text-indigo-950 mt-1">{analysis.coding_score || 72}/100</div>
                    </div>
                    <div className="p-2 bg-indigo-600 text-white rounded-xl">
                      <Zap size={16} />
                    </div>
                  </div>

                  {/* AI Comments */}
                  <div className="space-y-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><BookOpen size={10} /> Recruiter Insight</span>
                    <p className="text-[11px] text-slate-650 font-semibold leading-relaxed">
                      {analysis.ai_feedback}
                    </p>
                  </div>

                  {/* Strengths / Recommendations */}
                  <div className="space-y-3 pt-2">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Competency Endorsements</span>
                    <div className="space-y-2">
                      {parseJsonArray(analysis.strengths_json).slice(0, 3).map((str, i) => (
                        <div key={i} className="flex items-start gap-2 bg-slate-50/55 p-2 rounded-xl text-[10px] text-slate-600 font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
                          <span>{str}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleGenerateAnalysis}
                    disabled={analyzing}
                    className="w-full py-3 px-4 rounded-xl border border-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 hover:border-indigo-100 bg-white shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <RefreshCw size={12} className={analyzing ? "animate-spin" : ""} /> Recalculate Index
                  </button>
                </div>
              ) : (
                <div className="text-center py-6 space-y-4">
                  <p className="text-slate-400 text-xs font-semibold leading-relaxed">
                    Once synced, generate an automated recruiting evaluation using Gemini AI models. This highlights active career strengths on corporate tables.
                  </p>
                  <button
                    onClick={handleGenerateAnalysis}
                    disabled={analyzing}
                    className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest shadow-sm cursor-pointer transition-all flex items-center justify-center gap-2"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="animate-spin" size={14} /> Assessing...
                      </>
                    ) : (
                      <>Generate AI Evaluation</>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
