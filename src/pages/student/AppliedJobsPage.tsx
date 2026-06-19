import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { motion } from "motion/react";
import {
  Video, Calendar, Clock, CheckCircle, HelpCircle, Briefcase, ChevronRight, MessageSquare,
  ShieldAlert, UserCheck, Loader2, Sparkles, RefreshCw, Star, ArrowUpRight
} from "lucide-react";
import toast from "react-hot-toast";

interface StudentInterview {
  id: number;
  company_id: number;
  job_id: number;
  title: string;
  interview_type: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  instructions: string;
  job_title: string;
  company_name: string;
  duration_minutes: number;
}

interface AppliedJob {
  id: number;
  status: string;
  applied_at: string;
  job_title: string;
  job_id: number;
  deadline: string;
  job_type: string;
  company_name: string;
  current_stage_name: string;
}

export function AppliedJobsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<StudentInterview[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"INTERVIEWS" | "JOBS">("INTERVIEWS");

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [interviewsResp, appsResp] = await Promise.all([
        api.get("/interviews/student").catch(() => null),
        api.get(`/analytics/student/${user.id}/applications`).catch(() => null)
      ]);

      if (interviewsResp && interviewsResp.data?.success) {
        setInterviews(interviewsResp.data.data || []);
      }
      if (appsResp && appsResp.data?.success) {
        setAppliedJobs(appsResp.data.data || []);
      }
    } catch (err) {
      console.warn("Could not load student hub data:", err);
      toast.error("Telemetry loading delay.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "LIVE":
        return <span className="bg-red-50 text-red-600 border border-red-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1"><Video size={12} /> Live / Join Room</span>;
      case "COMPLETED":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Evaluation Drafted</span>;
      case "REPORT_READY":
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse"><Sparkles size={11} className="fill-indigo-200" /> Report Ready</span>;
      case "CANCELLED":
        return <span className="bg-slate-100 text-slate-550 border border-slate-200 px-3 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider">Cancelled</span>;
      case "SCHEDULED":
      case "RESCHEDULED":
      default:
        return <span className="bg-sky-50 text-sky-700 border border-sky-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">Shortlisted</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 font-sans min-h-screen pb-12">
      
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Applications & Screenings Hub</h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">
          Monitor active positions and access secure proctored video screening rooms
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1 max-w-md shadow-sm">
        <button
          onClick={() => setActiveTab("INTERVIEWS")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === "INTERVIEWS" ? "bg-white text-blue-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-650"}`}
        >
          <Video size={14} /> Screenings ({interviews.length})
        </button>
        <button
          onClick={() => setActiveTab("JOBS")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === "JOBS" ? "bg-white text-blue-600 shadow-sm border border-slate-100/50" : "text-slate-400 hover:text-slate-650"}`}
        >
          <Briefcase size={14} /> Placements ({appliedJobs.length})
        </button>
      </div>

      {activeTab === "INTERVIEWS" ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Active Screenings Timeline</h3>
            <button
              onClick={loadData}
              className="text-slate-400 hover:text-slate-650 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} className={loading ? "animate-spin text-blue-650" : ""} /> Sync Timeline
            </button>
          </div>

          {loading ? (
            <div className="h-44 rounded-3xl bg-white border border-slate-100 flex items-center justify-center gap-3">
              <Loader2 className="animate-spin text-blue-600" size={24} />
              <span className="text-slate-400 text-xs font-bold tracking-wider font-mono uppercase">Interrogating channels...</span>
            </div>
          ) : interviews.length === 0 ? (
            <div className="h-64 rounded-[32px] bg-white border border-slate-100 p-8 flex flex-col items-center justify-center text-center gap-4">
              <Calendar className="text-slate-300" size={36} />
              <div>
                <h4 className="font-black text-slate-850 uppercase text-xs tracking-wider">No evaluations scheduled yet</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm uppercase tracking-widest leading-relaxed font-bold">When companies shortlist your profile, you will receive invitation links to enter the proctored room here.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {interviews.map((meet) => (
                <div
                  key={meet.id}
                  className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-lg transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {getStatusLabel(meet.status)}
                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        REF: #{meet.id}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-base text-slate-950 uppercase tracking-tight leading-snug">{meet.title}</h4>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-1.5 uppercase tracking-wider">{meet.company_name} &bull; {meet.job_title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-500 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Date & Time</span>
                        <span className="font-bold text-slate-850">{new Date(meet.scheduled_start).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-black text-slate-400 tracking-widest">Duration Allocation</span>
                        <span className="font-bold text-slate-850">{meet.duration_minutes} Mins</span>
                      </div>
                    </div>

                    {meet.instructions && (
                      <div className="p-3 bg-slate-50 border border-slate-100/60 rounded-xl">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Company instructions:</p>
                        <p className="text-xs text-slate-500 mt-1 leading-normal italic">"{meet.instructions}"</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-50 flex gap-3">
                    {meet.status === "LIVE" || meet.status === "SCHEDULED" || meet.status === "RESCHEDULED" ? (
                      <button
                        onClick={() => navigate(`/interview/room/${meet.id}`)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl text-xs uppercase tracking-[0.15em] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/10"
                      >
                        <Video size={13} /> Enter Proctored Live Room
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/interview/room/${meet.id}`)}
                        className="w-full bg-slate-900 hover:bg-slate-850 text-white font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={13} className="text-yellow-400 fill-yellow-250 animate-pulse" /> Review Gemini MOM Appraisal Report
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* APPLIED JOBS GRID */
        <div className="space-y-6">
          <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Active Placement Opportunities</h3>
          
          {loading ? (
            <div className="h-44 rounded-3xl bg-white border border-slate-100 flex items-center justify-center">
              <Loader2 className="animate-spin text-blue-600" size={24} />
            </div>
          ) : appliedJobs.length === 0 ? (
            <div className="h-64 rounded-[32px] bg-white border border-slate-100 p-8 flex flex-col items-center justify-center text-center gap-4">
              <Briefcase className="text-slate-300" size={36} />
              <div>
                <h4 className="font-black text-slate-850 uppercase text-xs tracking-wider">No applications registered</h4>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest leading-relaxed font-bold">Use the "Browse Jobs" panel to discover vacancies and connect with recruiters.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {appliedJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-white border border-slate-100 rounded-3xl p-5 hover:border-slate-205 transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-950 text-sm">{job.job_title}</h4>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">{job.company_name} &bull; Applied: {new Date(job.applied_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      job.status === "SELECTED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                      job.status === "REJECTED" ? "bg-red-50 text-red-600" :
                      "bg-blue-50 text-blue-700 border border-blue-105"
                    }`}>
                      {job.current_stage_name || job.status || "APPLIED"}
                    </span>
                    <ChevronRight className="text-slate-400" size={16} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
export default AppliedJobsPage;
