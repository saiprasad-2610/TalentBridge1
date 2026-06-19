import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  GitBranch, Search, Filter, ArrowRight, Loader2, Award, 
  CheckCircle, XCircle, AlertCircle, Sparkles, User, BadgeAlert,
  ChevronRight, Calendar, FileText, Mail, ArrowUpRight, MessageSquare, RefreshCw
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

interface Applicant {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  avatar_url: string;
  contact_email: string;
  talent_score: number;
  status: string;
  application_id: number;
  applied_at: string;
  job_title: string;
}

export function PipelineBoard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [jobFilter, setJobFilter] = useState("ALL");
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const loadPipeline = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/employer/${user.id}`);
      if (data.success) {
        setApplicants(data.data.applicants || []);
      } else {
        toast.error("Could not load candidate pipeline.");
      }
    } catch (err) {
      console.error("Pipeline loading error:", err);
      toast.error("Data mapping issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();
  }, [user]);

  const uniqueJobs = Array.from(new Set(applicants.map(a => a.job_title))).filter(Boolean);

  const moveCandidate = async (appId: number, targetStatus: string) => {
    setUpdatingId(appId);
    try {
      const payload = {
        applicationIds: [appId],
        action: targetStatus === "SELECTED" ? "SELECTED" : targetStatus === "REJECTED" ? "REJECTED" : "IN_PROGRESS",
        notes: `Candidate promoted to stage: ${targetStatus}`
      };
      
      const { data } = await api.post("/jobs/bulk-action", payload);
      if (data.success) {
        toast.success(`Candidate status updated to ${targetStatus}!`);
        // Update local state smoothly
        setApplicants(prev => prev.map(a => a.application_id === appId ? { ...a, status: targetStatus } : a));
      } else {
        toast.error(data.message || "Failed to promote candidate.");
      }
    } catch (err) {
      console.error("Move candidate error:", err);
      toast.error("Network communication issues.");
    } finally {
      setUpdatingId(null);
    }
  };

  const columns = [
    { key: "APPLIED", name: "In Review", color: "border-blue-200 bg-blue-50/10 text-blue-800" },
    { key: "TESTING", name: "Skills Assessment", color: "border-amber-200 bg-amber-50/10 text-amber-700" },
    { key: "INTERVIEW", name: "Video Live Round", color: "border-indigo-200 bg-indigo-50/10 text-indigo-800" },
    { key: "SELECTED", name: "Final Placements", color: "border-emerald-200 bg-emerald-50/50 text-emerald-800" },
    { key: "REJECTED", name: "Archive", color: "border-red-100 bg-red-50/10 text-red-650" }
  ];

  const searchFiltered = applicants.filter(a => {
    const fullName = `${a.first_name} ${a.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase());
    const matchesJob = jobFilter === "ALL" || a.job_title === jobFilter;
    return matchesSearch && matchesJob;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Constructing Pipeline Kanban...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Hiring Pipeline</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Staged interactive Kanban representation of recruiter operations</p>
        </div>
        <button
          onClick={loadPipeline}
          className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-750 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} className="text-blue-650" /> Reflow Kanban
        </button>
      </div>

      {/* Query Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4.5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search candidate names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-slate-350"
          />
        </div>

        <select
          value={jobFilter}
          onChange={(e) => setJobFilter(e.target.value)}
          className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-650 outline-none max-w-sm"
        >
          <option value="ALL">All Jobs Positions</option>
          {uniqueJobs.map((name, index) => (
            <option key={index} value={name}>{name}</option>
          ))}
        </select>
      </div>

      {/* Kanban Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 overflow-x-auto pb-4">
        {columns.map((col) => {
          const colCandidates = searchFiltered.filter(a => {
            // Treat active state or common values cleanly
            const st = (a.status || "APPLIED").toUpperCase();
            if (col.key === "INTERVIEW") {
              return st === "INTERVIEW" || st === "IN_PROGRESS";
            }
            return st === col.key;
          });

          return (
            <div key={col.key} className="flex flex-col min-w-[260px] bg-slate-50/50 border border-slate-100/60 p-4 rounded-3xl min-h-[500px]">
              {/* Target column header */}
              <div className={`p-4 rounded-2xl border-l-4 mb-4 flex items-center justify-between ${col.color}`}>
                <span className="font-extrabold text-xs uppercase tracking-wider">{col.name}</span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-white/80 rounded-full shadow-sm">{colCandidates.length}</span>
              </div>

              {/* Candidates mapping inside column */}
              <div className="space-y-3 flex-1 overflow-y-auto">
                {colCandidates.map((cand) => (
                  <motion.div
                    key={cand.application_id}
                    layoutId={cand.application_id.toString()}
                    className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow relative"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 overflow-hidden text-slate-800 flex items-center justify-center font-black uppercase border border-slate-200">
                          {cand.avatar_url ? (
                            <img src={cand.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            cand.first_name?.[0] || "U"
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-950 text-xs">{cand.first_name} {cand.last_name}</h4>
                          <span className="text-[8px] bg-slate-50 border border-slate-100 text-slate-450 px-1.5 py-0.5 rounded-md font-bold mt-1 block w-fit truncate max-w-[150px]">
                            {cand.job_title}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1 border-t border-slate-50">
                        <span className="text-[9px] font-extrabold text-indigo-700 bg-indigo-50/50 px-1.5 py-0.5 rounded flex items-center gap-1 font-mono">
                          <Award size={10} className="fill-indigo-100" />
                          {cand.talent_score || 72} XP
                        </span>
                        
                        <span className="text-[9px] text-slate-400 font-extrabold font-mono">
                          {new Date(cand.applied_at).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Interactive Drag/Promotion control panel */}
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {col.key !== "SELECTED" && (
                          <button
                            disabled={updatingId === cand.application_id}
                            onClick={() => {
                              const nextStatusMap: Record<string, string> = {
                                "APPLIED": "TESTING",
                                "TESTING": "INTERVIEW",
                                "INTERVIEW": "SELECTED"
                              };
                              const nextStatus = nextStatusMap[col.key || "APPLIED"];
                              if (nextStatus) moveCandidate(cand.application_id, nextStatus);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-0.5"
                          >
                            Promote <ChevronRight size={8} />
                          </button>
                        )}
                        
                        {col.key !== "REJECTED" && col.key !== "SELECTED" && (
                          <button
                            disabled={updatingId === cand.application_id}
                            onClick={() => moveCandidate(cand.application_id, "REJECTED")}
                            className="bg-red-50 hover:bg-red-100 disabled:opacity-50 text-red-650 rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-widest cursor-pointer"
                          >
                            Archive
                          </button>
                        )}

                        {col.key === "INTERVIEW" && (
                          <button
                            onClick={() => navigate(`/company/interviews`)}
                            className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 rounded-md px-2 py-1 text-[8px] font-black uppercase tracking-widest cursor-pointer flex items-center gap-0.5"
                          >
                            <Calendar size={8} /> Call Setting
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                
                {colCandidates.length === 0 && (
                  <div className="h-28 flex flex-col items-center justify-center text-center text-[10px] text-slate-350 border border-dashed border-slate-200 rounded-2xl uppercase tracking-wider p-4">
                    Stage empty
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PipelineBoard;
