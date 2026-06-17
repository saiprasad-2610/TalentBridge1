import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Video, 
  Calendar, 
  Clock, 
  FileText, 
  AlertCircle, 
  ChevronRight, 
  Sparkles, 
  CheckCircle,
  HelpCircle,
  X,
  ExternalLink,
  ShieldAlert
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";
import api from "../../services/api.ts";

interface Interview {
  id: number;
  job_id: number;
  company_id: number;
  student_id: number;
  title: string;
  interview_type: string;
  scheduled_start: string;
  scheduled_end: string;
  timezone: string;
  duration_minutes: number;
  status: string;
  instructions: string;
  company_name: string;
  company_logo: string;
  job_title: string;
}

export function StudentInterviews() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [activeTab, setActiveTab] = useState<"ACTIVE" | "PAST">("ACTIVE");
  const [reportData, setReportData] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const navigate = useNavigate();

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/interviews/student");
      if (data.success) {
        setInterviews(data.data || []);
      } else {
        toast.error("Could not fetch interviews.");
      }
    } catch (err) {
      console.error("Student interviews fetch error:", err);
      toast.error("Failed to connect to interviews register.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const getJoinButtonState = (meet: Interview) => {
    // If meeting is already marked as LIVE, allow joining immediately
    if (meet.status === "LIVE") {
      return { 
        enabled: true, 
        label: "Join Active Live Room Now", 
        color: "bg-emerald-600 hover:bg-emerald-700 hover:scale-102 shadow-emerald-500/20 shadow-lg text-white animate-pulse" 
      };
    }

    if (["COMPLETED", "REPORT_READY", "CANCELLED", "NO_SHOW"].includes(meet.status)) {
      return { 
        enabled: false, 
        label: "Interview Session Concluded", 
        color: "bg-slate-100 text-slate-400 cursor-not-allowed" 
      };
    }

    const now = new Date();
    const startTime = new Date(meet.scheduled_start);
    const durationMs = meet.duration_minutes * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);

    // Active join window is 10 minutes prior to scheduled start until scheduled end
    const joinWindowStart = new Date(startTime.getTime() - 10 * 60 * 1000);

    if (now < joinWindowStart) {
      const timeDiff = startTime.getTime() - now.getTime();
      const minsWord = Math.ceil(timeDiff / (60 * 1000));
      const hours = Math.floor(minsWord / 60);
      const remainingLabel = hours > 0 
        ? `Unlocks in ~${hours}h` 
        : `Unlocks in ~${minsWord}m`;

      return { 
        enabled: false, 
        label: `Lobby Closed (${remainingLabel})`, 
        color: "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed text-[11px]" 
      };
    }

    if (now > endTime) {
      return { 
        enabled: false, 
        label: "Lobby Expired", 
        color: "bg-slate-100 text-slate-350 cursor-not-allowed" 
      };
    }

    return { 
      enabled: true, 
      label: "Enter Preparation Lobby", 
      color: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/10 hover:scale-101 border border-indigo-500/10" 
    };
  };

  const activeInterviews = interviews.filter(i => 
    ["SCHEDULED", "RESCHEDULED", "LIVE", "WAITING"].includes(i.status)
  );

  const pastInterviews = interviews.filter(i => 
    ["COMPLETED", "REPORT_READY", "CANCELLED", "NO_SHOW", "EXPIRED"].includes(i.status)
  );

  const handleOpenReport = async (meet: Interview) => {
    setLoadingReport(true);
    setSelectedInterview(meet);
    try {
      const { data } = await api.get(`/interviews/${meet.id}`);
      if (data.success && data.data) {
        setReportData(data.data.report);
        setShowReportModal(true);
      } else {
        toast.error("Technical report not finalized yet.");
      }
    } catch (e) {
      console.error("Report lookup failure:", e);
      toast.error("Could not download technical performance record.");
    } finally {
      setLoadingReport(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-violet-50 text-indigo-600 border border-indigo-100 flex items-center gap-1">
              <Sparkles size={10} /> Live Workspace
            </span>
          </div>
          <h1 className="text-3xl font-black text-slate-950 mt-1 uppercase tracking-tight">On-Platform Screenings</h1>
          <p className="text-slate-500 font-medium text-xs mt-1">
            Conduct safe, interactive WebRTC video meetings and technical evaluations directly inside TalentBridge.
          </p>
        </div>
      </div>

      {/* TABS SELECTOR */}
      <div className="flex border-b border-slate-100">
        <button
          onClick={() => setActiveTab("ACTIVE")}
          className={`px-6 py-3 font-semibold text-xs tracking-wider uppercase border-b-2 transition-all ${
            activeTab === "ACTIVE" 
              ? "border-blue-600 text-blue-600 font-extrabold" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Scheduled & Active ({activeInterviews.length})
        </button>
        <button
          onClick={() => setActiveTab("PAST")}
          className={`px-6 py-3 font-semibold text-xs tracking-wider uppercase border-b-2 transition-all ${
            activeTab === "PAST" 
              ? "border-blue-600 text-blue-600 font-extrabold" 
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Completed Archives ({pastInterviews.length})
        </button>
      </div>

      {/* WORKSPACE LOADING */}
      {loading ? (
        <div className="py-20 text-center space-y-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-400 font-mono text-xs uppercase tracking-widest leading-none">Accessing Interview Registers...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {activeTab === "ACTIVE" ? (
              activeInterviews.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl"
                >
                  <Video className="mx-auto text-slate-300 mb-4" size={42} />
                  <h3 className="font-bold text-slate-700 text-sm">No Upcoming Interviews</h3>
                  <p className="text-slate-400 text-xs mt-1 max-w-sm mx-auto">
                    When recruiters schedule a screening session or move your profile in the pipeline, details and reminders will activate here.
                  </p>
                </motion.div>
              ) : (
                activeInterviews.map((meet) => {
                  const joinState = getJoinButtonState(meet);
                  return (
                    <motion.div
                      key={meet.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden relative group"
                    >
                      {/* Top Accent for Live Rooms */}
                      {meet.status === "LIVE" && (
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-indigo-500 animate-pulse" />
                      )}

                      <div className="p-6 space-y-5 flex-1">
                        {/* Header */}
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                              ID: #{meet.id}
                            </span>
                            <h3 className="font-bold text-slate-900 mt-2 text-base leading-snug group-hover:text-indigo-650 transition-colors">
                              {meet.title}
                            </h3>
                          </div>
                          <div className="h-10 w-10 shrink-0 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center p-1 font-black text-slate-400 text-xs text-center uppercase overflow-hidden">
                            {meet.company_logo ? (
                              <img src={meet.company_logo} alt={meet.company_name} className="w-full h-full object-contain" />
                            ) : (
                              meet.company_name.slice(0, 2)
                            )}
                          </div>
                        </div>

                        {/* Company Details */}
                        <div className="flex gap-2 items-center">
                          <span className="font-extrabold text-xs text-slate-800">{meet.company_name}</span>
                          <span className="text-slate-350">•</span>
                          <span className="text-xs text-slate-500 font-medium">{meet.job_title}</span>
                        </div>

                        <hr className="border-slate-50" />

                        {/* Schedules */}
                        <div className="space-y-2 text-xs font-semibold text-slate-500">
                          <div className="flex items-center gap-2.5">
                            <Calendar size={14} className="text-slate-400 shrink-0" />
                            <span>{new Date(meet.scheduled_start).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                          </div>
                          <div className="flex items-center gap-2.5">
                            <Clock size={14} className="text-slate-400 shrink-0" />
                            <span>
                              {new Date(meet.scheduled_start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({meet.duration_minutes} Minutes)
                            </span>
                          </div>
                        </div>

                        {meet.instructions && (
                          <div className="p-3 bg-indigo-50/40 rounded-2xl border border-indigo-50/20 text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                            <span className="font-black text-indigo-700/80 uppercase text-[9px] block mb-0.5 tracking-wider">Interviewer Note:</span>
                            {meet.instructions}
                          </div>
                        )}
                      </div>

                      {/* Bottom action panel */}
                      <div className="p-5 border-t border-slate-50 bg-slate-50/30 flex items-center gap-2">
                        <button
                          disabled={!joinState.enabled}
                          onClick={() => navigate(`/interview/room/${meet.id}`)}
                          className={`w-full py-3 rounded-xl font-black text-xs text-center uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer ${joinState.color}`}
                        >
                          <Video size={13} />
                          {joinState.label}
                        </button>
                      </div>
                    </motion.div>
                  );
                })
              )
            ) : (
              pastInterviews.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="col-span-full py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl"
                >
                  <FileText className="mx-auto text-slate-300 mb-4" size={42} />
                  <h3 className="font-bold text-slate-700 text-sm">No Concluded Interviews</h3>
                  <p className="text-slate-400 text-xs mt-1">Completed panel histories, MOM assessments, and performance markers will appear here.</p>
                </motion.div>
              ) : (
                pastInterviews.map((meet) => {
                  const stateColors: any = {
                    COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-100",
                    REPORT_READY: "bg-blue-50 text-blue-700 border-blue-105",
                    CANCELLED: "bg-red-50 text-red-700 border-red-100",
                    NO_SHOW: "bg-amber-50 text-amber-700 border-amber-100",
                    EXPIRED: "bg-slate-50 text-slate-500 border-slate-100"
                  };

                  return (
                    <motion.div
                      key={meet.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between overflow-hidden relative"
                    >
                      <div className="space-y-4">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className={`text-[9px] font-black uppercase tracking-wider px-2.5 py-1 border rounded-full ${stateColors[meet.status] || "bg-slate-50 text-slate-600 border-slate-200"}`}>
                              {meet.status === "REPORT_READY" ? "Report Finzalized" : meet.status}
                            </span>
                            <h3 className="font-bold text-slate-900 mt-2.5 text-base leading-snug">
                              {meet.title}
                            </h3>
                          </div>
                          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2 py-1 rounded">
                            ID: #{meet.id}
                          </div>
                        </div>

                        <div className="flex gap-2 items-center text-xs">
                          <span className="font-extrabold text-slate-800">{meet.company_name}</span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500 font-medium">{meet.job_title}</span>
                        </div>

                        <div className="text-[11px] text-slate-400 font-medium">
                          Screening conducted on: {new Date(meet.scheduled_start).toLocaleString()}
                        </div>
                      </div>

                      {meet.status === "REPORT_READY" && (
                        <div className="mt-5 pt-4 border-t border-slate-50">
                          <button
                            onClick={() => handleOpenReport(meet)}
                            className="w-full bg-blue-50 text-blue-700 hover:bg-blue-100 font-black py-3 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <FileText size={14} /> Open Assessment Report
                          </button>
                        </div>
                      )}
                    </motion.div>
                  );
                })
              )
            )}
          </AnimatePresence>
        </div>
      )}

      {/* DETAILED MOM REPORT WINDOW MODAL */}
      <AnimatePresence>
        {showReportModal && selectedInterview && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowReportModal(false)}
              className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl w-full max-w-4xl shadow-xl border border-slate-100 overflow-hidden relative max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 shrink-0">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full border border-indigo-100 flex items-center gap-1 w-max">
                    <Sparkles size={11} className="text-indigo-600 animate-pulse" /> Verified TalentBridge MOM Report
                  </span>
                  <h2 className="text-base font-black text-slate-900 mt-2.5 uppercase tracking-tight">
                    {selectedInterview.title} - Appraisal Log
                  </h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                    Job Role: {selectedInterview.job_title} | Conducted with {selectedInterview.company_name}
                  </p>
                </div>
                <button 
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-white border border-transparent hover:border-slate-100 rounded-xl transition-all cursor-pointer text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
                {/* Score Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { label: "Overall Fitness Score", score: reportData?.analytics?.overall_fit_score },
                    { label: "Technical Depth", score: reportData?.analytics?.technical_depth_score },
                    { label: "Communication Skills", score: reportData?.analytics?.communication_score },
                    { label: "Critical Problem Solving", score: reportData?.analytics?.problem_solving_score },
                  ].map((card, idx) => (
                    <div key={idx} className="bg-slate-50/70 border border-slate-100 rounded-2xl p-4 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">{card.label}</div>
                      <div className="text-3xl font-black text-indigo-600 mt-2">{card.score || "N/A"}<span className="text-xs text-slate-400 font-bold">/10</span></div>
                    </div>
                  ))}
                </div>

                {/* MOM Summary */}
                <div className="space-y-2.5">
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                    <FileText size={14} className="text-slate-400" /> Professional Summary & MoM
                  </h3>
                  <div className="bg-slate-50/40 p-4 rounded-2xl border border-slate-50 text-xs text-slate-600 leading-relaxed font-semibold">
                    {reportData?.mom?.summary || "No summary transcribed for this session."}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Key Strengths */}
                  <div className="space-y-2.5 bg-emerald-50/20 border border-emerald-50/40 rounded-2.5xl p-5">
                    <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
                      <CheckCircle size={14} /> Key Strengths Identified
                    </h4>
                    <ul className="list-disc pl-4 text-xs font-semibold text-slate-600 space-y-2 mt-1">
                      {reportData?.mom?.key_strengths?.map((str: string, i: number) => (
                        <li key={i}>{str}</li>
                      )) || <li className="text-slate-400 list-none font-medium">No strengths logged.</li>}
                    </ul>
                  </div>

                  {/* Areas of Improvement */}
                  <div className="space-y-2.5 bg-amber-50/15 border border-amber-50/30 rounded-2.5xl p-5">
                    <h4 className="text-xs font-black text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                      <HelpCircle size={14} /> Improvement Recommendations
                    </h4>
                    <ul className="list-disc pl-4 text-xs font-semibold text-slate-600 space-y-2 mt-1">
                      {reportData?.mom?.improvement_areas?.map((imp: string, i: number) => (
                        <li key={i}>{imp}</li>
                      )) || <li className="text-slate-400 list-none font-medium">No suggestions logged.</li>}
                    </ul>
                  </div>
                </div>

                {reportData?.analytics?.proctoring_concerns && reportData.analytics.proctoring_concerns.length > 0 && (
                  <div className="space-y-2.5 bg-red-50/10 border border-red-50/20 rounded-2.5xl p-5">
                    <h4 className="text-xs font-black text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldAlert size={14} /> Flagged Proctoring / Security Records
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mt-0.5">
                      Deterrence warnings / blur timeline anomalies noticed during screening
                    </p>
                    <ul className="list-disc pl-4 text-xs font-semibold text-slate-600 space-y-1.5 mt-2">
                      {reportData.analytics.proctoring_concerns.map((poc: string, i: number) => (
                        <li key={i}>{poc}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Timeline Q&A Transcripts */}
                {reportData?.timeline && reportData.timeline.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                      <Clock size={14} className="text-slate-400" /> Verification Timeline & Transcripts
                    </h3>
                    <div className="space-y-4">
                      {reportData.timeline.map((event: any, i: number) => (
                        <div key={i} className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 flex gap-4 text-xs">
                          <span className="p-2 h-7 w-7 shrink-0 rounded-lg text-[9px] font-black uppercase tracking-widest bg-white border border-slate-100 flex items-center justify-center">
                            {i + 1}
                          </span>
                          <div className="space-y-2">
                            <div>
                              <span className="font-extrabold text-slate-900 select-all block">{event.question}</span>
                            </div>
                            <div className="text-slate-500 font-medium pl-2.5 border-l-2 border-slate-205">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5 select-none">Transcribed Answer:</span>
                              {event.answer || "Blank / No audible response captured."}
                            </div>
                            {event.ideal_solution && (
                              <div className="text-indigo-700/80 font-medium bg-indigo-50/25 p-2 rounded-lg border border-indigo-50/10">
                                <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block mb-0.5 select-none font-black">Ideal Criteria:</span>
                                {event.ideal_solution}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50/30 border-t border-slate-55 shrink-0 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest select-none">
                TalentBridge Screening Trust Index — Secured Cryptographic Record
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default StudentInterviews;
