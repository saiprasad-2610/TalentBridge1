import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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

export function AppliedJobsPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<StudentInterview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"INTERVIEWS" | "JOBS">("INTERVIEWS");

  // Simulated applications
  const [appliedJobs] = useState([
    { id: 1, title: "Full Stack Software Engineer", company: "MetaCorp Solutions", date: "June 12, 2026", status: "Screening Scheduled" },
    { id: 2, title: "Data Analyst Trainee", company: "Apex Finance Analytics", date: "June 08, 2026", status: "Under Review" },
    { id: 3, title: "Junior UI/UX Designer", company: "Zeta Interactive Studios", date: "May 29, 2026", status: "Resume Shortlisted" }
  ]);

  const loadStudentInterviews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/interviews/student");
      if (data.success) {
        setInterviews(data.data || []);
      }
    } catch (err) {
      console.warn("Could not load student invitations:", err);
      // Fallback fallback mock if needed, but here we can keep empty to represent fresh database
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStudentInterviews();
  }, []);

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "LIVE":
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse flex items-center gap-1"><Video size={12} /> Live / Join Room</span>;
      case "COMPLETED":
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Evaluation Drafted</span>;
      case "REPORT_READY":
        return <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse"><Sparkles size={11} className="fill-indigo-650" /> Report Ready</span>;
      case "CANCELLED":
        return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Cancelled</span>;
      case "SCHEDULED":
      case "RESCHEDULED":
      default:
        return <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Shortlisted</span>;
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-100 flex items-center gap-2">
          Applications & Screenings Hub
        </h1>
        <p className="text-slate-400 mt-1">
          Monitor your active applications and access secure proctored video screening rooms.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-[#0f172a] rounded-xl p-1 max-w-md border border-slate-800">
        <button
          onClick={() => setActiveTab("INTERVIEWS")}
          className={`flex-1 py-3.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === "INTERVIEWS" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Video size={14} /> Screenings & Interviews ({interviews.length})
        </button>
        <button
          onClick={() => setActiveTab("JOBS")}
          className={`flex-1 py-3.5 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === "JOBS" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
        >
          <Briefcase size={14} /> Applied Positions ({appliedJobs.length})
        </button>
      </div>

      {activeTab === "INTERVIEWS" ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-150 text-sm uppercase tracking-widest">Active Screenings</h3>
            <button
              onClick={loadStudentInterviews}
              className="text-slate-400 hover:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Sync Timeline
            </button>
          </div>

          {loading ? (
            <div className="h-44 rounded-2xl bg-slate-900/30 flex items-center justify-center gap-3 border border-slate-800 border-dashed">
              <Loader2 className="animate-spin text-indigo-500" size={24} />
              <span className="text-slate-500 text-xs font-bold tracking-wider font-mono uppercase">Interrogating channels...</span>
            </div>
          ) : interviews.length === 0 ? (
            <div className="h-64 rounded-3xl bg-[#0b0f19] border border-slate-800/45 p-8 flex flex-col items-center justify-center text-center gap-4">
              <Calendar className="text-slate-500" size={36} />
              <div>
                <h4 className="font-black text-slate-200">No screenings scheduled yet</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm">When companies shortlist your profile, you will receive invitation links and notifications to enter the proctored room here.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {interviews.map((meet) => (
                <div
                  key={meet.id}
                  className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-6 hover:border-slate-700 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      {getStatusLabel(meet.status)}
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
                        REF: #{meet.id}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-lg text-slate-100 leading-snug">{meet.title}</h4>
                      <p className="text-xs text-slate-400 font-bold mt-1 uppercase tracking-wider">{meet.company_name} &bull; {meet.job_title}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs text-slate-400 bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-black text-slate-500">Date & Time</span>
                        <span className="font-bold text-slate-250">{new Date(meet.scheduled_start).toLocaleString()}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[9px] uppercase font-black text-slate-500">Duration Allocation</span>
                        <span className="font-bold text-slate-250">{meet.duration_minutes} Mins</span>
                      </div>
                    </div>

                    {meet.instructions && (
                      <div className="p-3 bg-slate-900/20 border border-slate-800/50 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400">Company instructions:</p>
                        <p className="text-xs text-slate-400 mt-1 leading-normal italic">"{meet.instructions}"</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800/50 flex gap-3">
                    {meet.status === "LIVE" || meet.status === "SCHEDULED" || meet.status === "RESCHEDULED" ? (
                      <button
                        onClick={() => navigate(`/interview/room/${meet.id}`)}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4.5 rounded-2xl text-xs uppercase tracking-[0.15em] hover:shadow-indigo-600/10 hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Video size={13} /> Enter Proctored Live Room
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate(`/interview/room/${meet.id}`)}
                        className="w-full bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-200 font-black py-3.5 rounded-2xl text-xs uppercase tracking-wider transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Sparkles size={13} className="text-indigo-400 fill-indigo-450" /> Review Gemini MOM Appraisal Report
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
          <h3 className="font-extrabold text-slate-150 text-sm uppercase tracking-widest">Active Applications</h3>
          <div className="space-y-4">
            {appliedJobs.map((job) => (
              <div
                key={job.id}
                className="bg-[#0b0f19] border border-slate-800 rounded-2.5xl p-5 hover:border-slate-700 transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 text-slate-400 rounded-2xl">
                    <Briefcase size={22} />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-100">{job.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">{job.company} &bull; Applied on {job.date}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-[10px] bg-slate-900 text-indigo-400 border border-slate-800 font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-lg">
                    {job.status}
                  </span>
                  <ChevronRight className="text-slate-500" size={16} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
export default AppliedJobsPage;
