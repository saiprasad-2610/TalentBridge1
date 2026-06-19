import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { motion, AnimatePresence } from "motion/react";
import {
  Video, Calendar, Clock, CheckCircle, HelpCircle, Briefcase, ChevronRight, MessageSquare,
  ShieldAlert, UserCheck, Loader2, Sparkles, RefreshCw, Star, ArrowUpRight, MapPin, 
  DollarSign, FileText, X, AlertTriangle, AlertCircle, Info, GraduationCap
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
  application_id: number;
  status: string;
  current_status: string;
  applied_at: string;
  status_updated_at: string;
  job_title: string;
  job_id: number;
  deadline: string;
  job_type: string;
  work_mode: string;
  location: string;
  salary: string;
  company_id: number;
  company_name: string;
  company_logo: string | null;
  current_stage_name: string;
  application_stage: string;
  stage_type: string;
  company_notes: string;
  next_action: string;
}

export function AppliedJobsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<StudentInterview[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<AppliedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"JOBS" | "INTERVIEWS">("JOBS"); // Default to JOBS for job application tracking

  // Timeline / Detail Modal state
  const [selectedApp, setSelectedApp] = useState<AppliedJob | null>(null);
  const [timelineData, setTimelineData] = useState<{ stages: any[]; history: any[] } | null>(null);
  const [loadingTimeline, setLoadingTimeline] = useState(false);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    setErrorStatus(null);
    try {
      const [interviewsResp, appsResp] = await Promise.all([
        api.get("/interviews/student").catch((e) => {
          console.warn("Could not load interviews:", e);
          return null;
        }),
        api.get(`/analytics/student/${user.id}/applications`).catch((e) => {
          console.warn("Could not load applications:", e);
          return null;
        })
      ]);

      if (interviewsResp && interviewsResp.data?.success) {
        setInterviews(interviewsResp.data.data || []);
      }
      if (appsResp && appsResp.data?.success) {
        setAppliedJobs(appsResp.data.data || []);
      } else if (appsResp && !appsResp.data?.success) {
        setErrorStatus("Latency limits exceeded. Unable to sync placement pipeline.");
      }
    } catch (err) {
      console.error("Could not load student hub data:", err);
      setErrorStatus("Failed to synchronize application channels. Please verify network access.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user]);

  const handleAppClick = async (app: AppliedJob) => {
    setSelectedApp(app);
    setLoadingTimeline(true);
    setTimelineData(null);
    try {
      const res = await api.get(`/jobs/application/${app.id}/timeline`);
      if (res.data?.success) {
        setTimelineData(res.data.data);
      } else {
        setTimelineData(null);
      }
    } catch (err) {
      console.warn("Timeline details lookup mismatch:", err);
      setTimelineData(null);
    } finally {
      setLoadingTimeline(false);
    }
  };

  // Maps backend status to human-friendly display label (Complying with prompt examples!)
  const mapStatusLabel = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPLIED":
        return "Applied";
      case "SHORTLISTED":
        return "Application Screening";
      case "ASSESSMENT":
        return "Aptitude Test / Assessment";
      case "INTERVIEW":
        return "Interview Scheduled";
      case "OFFER":
        return "Offer";
      case "SELECTED":
        return "Selected";
      case "REJECTED":
        return "Rejected";
      default:
        return status || "Applied";
    }
  };

  const getStatusBadgeStyles = (status: string) => {
    switch (status?.toUpperCase()) {
      case "APPLIED":
        return "bg-slate-50 text-slate-700 border border-slate-200/85";
      case "SHORTLISTED":
        return "bg-sky-50 text-sky-700 border border-sky-100";
      case "ASSESSMENT":
        return "bg-amber-50 text-amber-700 border border-amber-200/70";
      case "INTERVIEW":
        return "bg-purple-50 text-purple-700 border border-purple-100";
      case "OFFER":
        return "bg-indigo-50 text-indigo-700 border border-indigo-150";
      case "SELECTED":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200/70";
      case "REJECTED":
        return "bg-rose-50 text-rose-700 border border-rose-200/70";
      default:
        return "bg-blue-50 text-blue-700 border border-blue-100";
    }
  };

  const getScreeningStatusLabel = (status: string) => {
    switch (status) {
      case "LIVE":
        return (
          <span className="bg-rose-50 text-rose-600 border border-rose-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider animate-pulse flex items-center gap-1">
            <Video size={12} /> Live / Join Room
          </span>
        );
      case "COMPLETED":
        return (
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Evaluation Drafted
          </span>
        );
      case "REPORT_READY":
        return (
          <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 animate-pulse">
            <Sparkles size={11} className="fill-indigo-200" /> Report Ready
          </span>
        );
      case "CANCELLED":
        return (
          <span className="bg-slate-150 text-slate-500 border border-slate-200 default-padding rounded-full text-[10px] font-semibold uppercase tracking-wider">
            Cancelled
          </span>
        );
      case "SCHEDULED":
      case "RESCHEDULED":
      default:
        return (
          <span className="bg-sky-50 text-sky-700 border border-sky-100 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
            Shortlisted
          </span>
        );
    }
  };

  const getLogoUrl = (logo: string | null) => {
    if (!logo) return null;
    if (logo.startsWith("http")) return logo;
    return `${api.defaults.baseURL?.replace("/api", "")}${logo}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 font-sans min-h-screen pb-12">
      {/* Header with detailed sub-heading as requested */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Applications & Screenings Hub</h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1.5 leading-relaxed">
          Monitor active positions and access secure proctored video screening rooms
        </p>
      </div>

      {/* Tabs Layout */}
      <div className="flex bg-slate-50 border border-slate-100 rounded-2xl p-1 max-w-md shadow-sm">
        <button
          onClick={() => setActiveTab("JOBS")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "JOBS"
              ? "bg-white text-blue-600 shadow-sm border border-slate-100/50"
              : "text-slate-400 hover:text-slate-600"
          }`}
          id="tab-btn-jobs"
        >
          <Briefcase size={14} /> Placements ({appliedJobs.length})
        </button>
        <button
          onClick={() => setActiveTab("INTERVIEWS")}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "INTERVIEWS"
              ? "bg-white text-blue-600 shadow-sm border border-slate-100/50"
              : "text-slate-400 hover:text-slate-600"
          }`}
          id="tab-btn-interviews"
        >
          <Video size={14} /> Screenings ({interviews.length})
        </button>
      </div>

      {/* Error State with retry option as requested */}
      {errorStatus && (
        <div className="bg-red-50 border border-red-150 rounded-3xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="text-red-650 flex-shrink-0" size={24} />
            <div>
              <h4 className="font-extrabold text-slate-900 text-sm uppercase tracking-tight">Network Connection Interrupted</h4>
              <p className="text-xs text-red-650 font-medium mt-0.5">{errorStatus}</p>
            </div>
          </div>
          <button
            onClick={loadData}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <RefreshCw size={12} /> Retry Connection
          </button>
        </div>
      )}

      {activeTab === "JOBS" ? (
        /* APPLIED JOBS GROUP */
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Active Placement Opportunities</h3>
            <button
              onClick={loadData}
              className="text-slate-400 hover:text-slate-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw size={11} className={loading ? "animate-spin text-blue-600" : ""} /> Sync Pipeline
            </button>
          </div>

          {loading ? (
            /* Skeleton Loader */
            <div className="space-y-4">
              {[1, 2, 3].map((num) => (
                <div key={num} className="h-20 rounded-3xl bg-slate-50 animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : appliedJobs.length === 0 ? (
            /* Polished Empty State leading to Browse Jobs */
            <div className="h-72 rounded-[32px] bg-white border border-slate-100 p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm">
              <Briefcase className="text-slate-350" size={44} />
              <div>
                <h4 className="font-black text-slate-850 uppercase text-xs tracking-wider">No applications yet</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm uppercase tracking-widest leading-relaxed font-bold">
                  Use the corporate vacant jobs panel inside our Career Hub to submit files and connect with recruiters.
                </p>
              </div>
              <button
                onClick={() => navigate("/jobs")}
                className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all mt-2 cursor-pointer shadow-md shadow-blue-500/10 hover:-translate-y-0.5"
              >
                Browse Active Jobs
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {appliedJobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => handleAppClick(job)}
                  className="bg-white border border-slate-100 rounded-3xl p-5 hover:border-slate-200/80 hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2.5xl group-hover:bg-blue-100 group-hover:text-blue-750 transition-colors flex-shrink-0">
                      {job.company_logo ? (
                        <img
                          src={getLogoUrl(job.company_logo) || ""}
                          alt={job.company_name}
                          className="w-10 h-10 object-contain rounded-xl"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Briefcase size={22} className="w-10 h-10 stroke-1.5 flex items-center justify-center" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 group-hover:text-blue-600 transition-colors text-sm uppercase tracking-tight">
                        {job.job_title}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-1 tracking-wider">
                        {job.company_name} &bull; Applied: {new Date(job.applied_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 self-stretch sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-50">
                    <div className="flex flex-col sm:items-end gap-1.5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${getStatusBadgeStyles(job.status)}`}>
                        {mapStatusLabel(job.status)}
                      </span>
                      {job.current_stage_name && (
                        <span className="text-[9px] font-mono text-slate-450 uppercase font-black tracking-widest bg-slate-50 px-2 py-0.5 rounded-md">
                          Stage: {job.current_stage_name}
                        </span>
                      )}
                    </div>
                    <ChevronRight className="text-slate-350 group-hover:translate-x-1 transition-transform" size={18} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* SCREENINGS TAB */
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
            <div className="space-y-4">
              {[1, 2].map((num) => (
                <div key={num} className="h-28 rounded-3xl bg-slate-50 animate-pulse border border-slate-100" />
              ))}
            </div>
          ) : interviews.length === 0 ? (
            <div className="h-72 rounded-[32px] bg-white border border-slate-100 p-8 flex flex-col items-center justify-center text-center gap-4">
              <Calendar className="text-slate-300" size={36} />
              <div>
                <h4 className="font-black text-slate-850 uppercase text-xs tracking-wider">No evaluations scheduled yet</h4>
                <p className="text-[10px] text-slate-400 mt-1 max-w-sm uppercase tracking-widest leading-relaxed font-bold">
                  When corporate TPOs approve your workspace profiles, you will receive activation links to configure secure proctor streams here.
                </p>
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
                      {getScreeningStatusLabel(meet.status)}
                      <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                        REF: #{meet.id}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-black text-base text-slate-950 uppercase tracking-tight leading-snug">{meet.title}</h4>
                      <p className="text-[10px] text-slate-400 font-extrabold mt-1.5 uppercase tracking-wider">
                        {meet.company_name} &bull; {meet.job_title}
                      </p>
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
      )}

      {/* DETAIL MODAL / DRAWER */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 overflow-y-auto" id="detail-modal-root">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedApp(null)}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="w-full max-w-2xl transform overflow-hidden rounded-[32px] bg-white border border-slate-100 p-6 md:p-8 text-left align-middle shadow-2xl transition-all relative z-50 space-y-6"
              >
                {/* Close Button */}
                <button
                  onClick={() => setSelectedApp(null)}
                  className="absolute right-6 top-6 p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  id="close-modal-btn"
                >
                  <X size={18} />
                </button>

                {/* Company Header Info */}
                <div className="flex items-start gap-4 pr-8">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2.5xl flex-shrink-0">
                    {selectedApp.company_logo ? (
                      <img
                        src={getLogoUrl(selectedApp.company_logo) || ""}
                        alt={selectedApp.company_name}
                        className="w-12 h-12 object-contain rounded-xl"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Briefcase size={26} className="w-12 h-12 stroke-1.5" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <span className={`inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${getStatusBadgeStyles(selectedApp.status)}`}>
                      {mapStatusLabel(selectedApp.status)}
                    </span>
                    <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight leading-tight">
                      {selectedApp.job_title}
                    </h2>
                    <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">{selectedApp.company_name}</p>
                  </div>
                </div>

                {/* Quick vacancy tags */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50/65 p-4 rounded-2xl border border-slate-100 text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Clock size={11} /> Format/Type
                    </span>
                    <span className="font-extrabold text-slate-750 uppercase tracking-wide">
                      {selectedApp.job_type ? selectedApp.job_type.replace("_", " ") : "Full-time"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <GraduationCap size={11} /> Work Model
                    </span>
                    <span className="font-extrabold text-slate-750 uppercase tracking-wide">
                      {selectedApp.work_mode || "Hybrid"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5 col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <MapPin size={11} /> Location
                    </span>
                    <span className="font-extrabold text-slate-750 truncate max-w-sm">
                      {selectedApp.location || "Bengaluru, IN"}
                    </span>
                  </div>
                  {selectedApp.salary && (
                    <div className="flex flex-col gap-0.5 col-span-2 pt-2.5 border-t border-slate-100/60">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                        <DollarSign size={11} /> Compensation Range
                      </span>
                      <span className="font-bold text-slate-800">{selectedApp.salary}</span>
                    </div>
                  )}
                </div>

                {/* Next anticipated Action */}
                <div className="p-4 bg-blue-50/20 border border-blue-105 rounded-2.5xl flex items-start gap-3">
                  <Info size={16} className="text-blue-605 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <h5 className="text-[10px] font-black text-indigo-950 uppercase tracking-wider">Suggested Next Pipeline Action</h5>
                    <p className="text-xs text-slate-650 font-semibold">{selectedApp.next_action}</p>
                  </div>
                </div>

                {/* Company Notes if available */}
                {selectedApp.company_notes && (
                  <div className="p-4 bg-slate-50 border border-slate-100 rounded-2.5xl space-y-1.5">
                    <h5 className="text-[10px] font-black text-slate-450 uppercase tracking-widest">Recruiter Update / Corporate Notes</h5>
                    <p className="text-xs text-slate-600 leading-relaxed italic">"{selectedApp.company_notes}"</p>
                  </div>
                )}

                {/* Interview Stage Notice (Complying with prompt constraint: Do not mix full live controls!) */}
                {selectedApp.status?.toUpperCase() === "INTERVIEW" && (
                  <div className="p-4 bg-violet-50/40 border border-violet-100 rounded-2.5xl flex items-start gap-3">
                    <Video size={16} className="text-violet-600 mt-0.5 flex-shrink-0 animate-pulse" />
                    <div className="space-y-1">
                      <h5 className="text-[10px] font-black text-violet-950 uppercase tracking-widest">Active Screenings Registered</h5>
                      <p className="text-xs text-violet-750 font-medium leading-relaxed">
                        Your profile has been shortlisted for a secure video conversation. Please navigate to the{" "}
                        <strong className="font-extrabold text-violet-900 cursor-pointer hover:underline" onClick={() => { setSelectedApp(null); setActiveTab("INTERVIEWS"); }}>
                          Video Interviews
                        </strong>{" "}
                        tab to view details, company instructions, evaluation statuses, and to enter the live proctored interview.
                      </p>
                    </div>
                  </div>
                )}

                {/* Application Timeline Segment */}
                <div className="space-y-4">
                  <h4 className="font-black text-xs text-slate-900 uppercase tracking-wider pb-2 border-b border-slate-50">
                    Application Journey Timeline
                  </h4>

                  {loadingTimeline ? (
                    <div className="flex items-center gap-2 justify-center py-6 text-slate-400 font-mono text-xs uppercase tracking-wider">
                      <Loader2 size={16} className="animate-spin text-blue-600" /> Cataloguing historical checkpoint logs...
                    </div>
                  ) : (
                    <div className="relative pl-6 space-y-6">
                      {/* Timeline Vertical Axis Line */}
                      <div className="absolute left-2.5 top-2.5 bottom-2.5 w-0.5 bg-slate-100" />

                      {/* Display visual custom timeline */}
                      {(timelineData && timelineData.stages && timelineData.stages.length > 0) ? (
                        timelineData.stages.map((stage: any, index: number) => {
                          const isCompleted = timelineData.history.some((h) => h.stage_id === stage.id);
                          const isCurrent = selectedApp.current_stage_name === stage.stage_name;

                          return (
                            <div key={stage.id} className="relative flex items-start gap-4">
                              <span
                                className={`absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                  isCompleted
                                    ? "bg-emerald-500 border-white ring-4 ring-emerald-50/60"
                                    : isCurrent
                                    ? "bg-blue-600 border-white ring-4 ring-blue-50/60"
                                    : "bg-white border-slate-250"
                                }`}
                              />
                              <div className="space-y-1">
                                <h5 className={`text-xs font-black uppercase tracking-tight ${isCurrent ? "text-blue-600" : "text-slate-850"}`}>
                                  {stage.stage_name}
                                </h5>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                  Format/Type: {stage.stage_type}
                                </p>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        /* Standard Fallback Journey representation */
                        <>
                          <div className="relative flex items-start gap-4">
                            <span className="absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-y-2 bg-emerald-500 border-white ring-4 ring-emerald-50/60" />
                            <div>
                              <h5 className="text-xs font-black uppercase text-emerald-700 tracking-tight">Application Submitted</h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Submitted via TalentBridge Portal - {new Date(selectedApp.applied_at).toLocaleDateString()}</p>
                            </div>
                          </div>

                          <div className="relative flex items-start gap-4">
                            <span className={`absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-y-2 flex items-center justify-center ${
                              ["SHORTLISTED", "ASSESSMENT", "INTERVIEW", "OFFER", "SELECTED"].includes(selectedApp.status)
                                ? "bg-emerald-500 border-white ring-4 ring-emerald-50/60"
                                : "bg-white border-slate-250"
                            }`} />
                            <div>
                              <h5 className={`text-xs font-black uppercase tracking-tight ${
                                selectedApp.status === "SHORTLISTED" ? "text-blue-600" : "text-slate-800"
                              }`}>Application Screening</h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Recruiter profile validation and review</p>
                            </div>
                          </div>

                          <div className="relative flex items-start gap-4">
                            <span className={`absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-y-2 flex items-center justify-center ${
                              ["ASSESSMENT", "INTERVIEW", "OFFER", "SELECTED"].includes(selectedApp.status)
                                ? "bg-emerald-500 border-white ring-4 ring-emerald-50/60"
                                : "bg-white border-slate-250"
                            }`} />
                            <div>
                              <h5 className={`text-xs font-black uppercase tracking-tight ${
                                selectedApp.status === "ASSESSMENT" ? "text-blue-600" : "text-slate-800"
                              }`}>Intelligence / Code Test</h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Cognitive and skill-check challenges</p>
                            </div>
                          </div>

                          <div className="relative flex items-start gap-4">
                            <span className={`absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-y-2 flex items-center justify-center ${
                              ["INTERVIEW", "OFFER", "SELECTED"].includes(selectedApp.status)
                                ? "bg-emerald-500 border-white ring-4 ring-emerald-50/60"
                                : "bg-white border-slate-250"
                            }`} />
                            <div>
                              <h5 className={`text-xs font-black uppercase tracking-tight ${
                                selectedApp.status === "INTERVIEW" ? "text-blue-600" : "text-slate-800"
                              }`}>Scheduled video Interview</h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Secure proctored feedback conversation</p>
                            </div>
                          </div>

                          <div className="relative flex items-start gap-4">
                            <span className={`absolute -left-[20px] top-1 w-3.5 h-3.5 rounded-full border-y-2 flex items-center justify-center ${
                              ["SELECTED", "OFFER"].includes(selectedApp.status)
                                ? "bg-emerald-500 border-white ring-4 ring-emerald-50/60"
                                : "bg-white border-slate-250"
                            }`} />
                            <div>
                              <h5 className={`text-xs font-black uppercase tracking-tight ${
                                ["SELECTED", "OFFER"].includes(selectedApp.status) ? "text-emerald-700" : "text-slate-800"
                              }`}>Hired / Placement Offer</h5>
                              <p className="text-[10px] text-slate-400 font-bold mt-0.5">Recruiting final process completed</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer buttons of details */}
                <div className="pt-4 border-t border-slate-50 flex items-center justify-end">
                  <button
                    onClick={() => setSelectedApp(null)}
                    className="px-6 py-3 border border-slate-100 rounded-2xl hover:text-slate-800 hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-widest cursor-pointer"
                  >
                    Close Panel
                  </button>
                </div>
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AppliedJobsPage;
