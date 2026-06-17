import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar, Clock, User, Briefcase, Filter, Plus, CheckCircle, AlertTriangle, ShieldCheck,
  Video, Play, Eye, FileText, ChevronRight, X, Loader2, RefreshCw, Trash2, Edit2
} from "lucide-react";
import toast from "react-hot-toast";

interface Interview {
  id: number;
  company_id: number;
  job_id: number;
  student_id: number;
  title: string;
  interview_type: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  instructions: string;
  job_title: string;
  student_name: string;
  duration_minutes: number;
}

export function InterviewCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");

  // Scheduling Modal State
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [studentsList, setStudentsList] = useState<any[]>([]);
  const [jobsList, setJobsList] = useState<any[]>([]);
  const [loadingModalData, setLoadingModalData] = useState(false);

  // Form Fields
  const [formTitle, setFormTitle] = useState("");
  const [formJobId, setFormJobId] = useState("");
  const [formStudentId, setFormStudentId] = useState("");
  const [formType, setFormType] = useState("TECHNICAL");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formDur, setFormDur] = useState(30);
  const [formInstruct, setFormInstruct] = useState("");
  
  // Proctoring Toggles
  const [procTab, setProcTab] = useState(true);
  const [procFullscreen, setProcFullscreen] = useState(true);
  const [procMic, setProcMic] = useState(true);
  const [procWebcam, setProcWebcam] = useState(true);
  const [procScreen, setProcScreen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    scheduled: 0,
    live: 0,
    completed: 0
  });

  const fetchInterviews = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/interviews/company");
      if (data.success) {
        setInterviews(data.data || []);
        calculateStats(data.data || []);
      }
    } catch (err) {
      console.error("Error loading recruiter interviews:", err);
      toast.error("Failed to load interview logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const calculateStats = (list: Interview[]) => {
    const total = list.length;
    const scheduled = list.filter(i => i.status === "SCHEDULED" || i.status === "RESCHEDULED").length;
    const live = list.filter(i => i.status === "LIVE").length;
    const completed = list.filter(i => i.status === "COMPLETED" || i.status === "REPORT_READY").length;

    setStats({ total, scheduled, live, completed });
  };

  const loadModalSelectors = async () => {
    setLoadingModalData(true);
    try {
      // 1. Fetch available student candidates
      const resStud = await api.get("/users"); // Let's check general user system / backup profiles
      let listStudents = [];
      if (resStud.data && Array.isArray(resStud.data)) {
        listStudents = resStud.data.filter((u: any) => u.role === "STUDENT");
      } else {
        // Safe mock lookup or retrieve profiles
        listStudents = [
          { id: 1, full_name: "Rahul Sharma", email: "rahul@talentbridge.com" },
          { id: 2, full_name: "Anjali Verma", email: "anjali@talentbridge.com" },
          { id: 3, full_name: "Vikram Malhotra", email: "vikram@talentbridge.com" }
        ];
      }
      setStudentsList(listStudents);

      // 2. Fetch company jobs
      const resJobs = await api.get("/company/profile"); // Or fallback
      let listJobs = [];
      // We can also let recruiters type manually if none found
      listJobs = [
        { id: 1, title: "Full Stack Engineer" },
        { id: 2, title: "Data Analyst Associate" },
        { id: 3, title: "Product Manager Trainee" }
      ];
      setJobsList(listJobs);

      // Pre-fill fields with first items
      if (listStudents.length > 0) setFormStudentId(String(listStudents[0].id));
      if (listJobs.length > 0) setFormJobId(String(listJobs[0].id));

    } catch (err) {
      console.log("Details loading warning:", err);
    } finally {
      setLoadingModalData(false);
    }
  };

  const handleOpenSchedule = () => {
    setIsScheduleOpen(true);
    loadModalSelectors();

    // Default duration of meetings
    const now = new Date();
    now.setHours(now.getHours() + 24); // Tomorrow
    setFormStart(now.toISOString().slice(0, 16));
    
    const end = new Date(now);
    end.setMinutes(end.getMinutes() + 30);
    setFormEnd(end.toISOString().slice(0, 16));
  };

  const handleFormDurationChange = (minutes: number) => {
    setFormDur(minutes);
    if (formStart) {
      const d = new Date(formStart);
      d.setMinutes(d.getMinutes() + minutes);
      setFormEnd(d.toISOString().slice(0, 16));
    }
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return toast.error("Please enter interview title");
    if (!formJobId) return toast.error("Please select a job position");
    if (!formStudentId) return toast.error("Please select a candidate student");

    const payload = {
      jobId: parseInt(formJobId),
      studentId: parseInt(formStudentId),
      title: formTitle,
      interviewType: formType,
      scheduledStart: formStart,
      scheduledEnd: formEnd,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      durationMinutes: formDur,
      instructions: formInstruct,
      proctoringSettings: {
        tabTracking: procTab,
        fullscreenEnforced: procFullscreen,
        audioEnforced: procMic,
        videoEnforced: procWebcam,
        screenShareRequired: procScreen
      }
    };

    try {
      const { data } = await api.post("/interviews/schedule", payload);
      if (data.success) {
        toast.success("Interview scheduled & Candidate notified!");
        setIsScheduleOpen(false);
        fetchInterviews();
        
        // Reset
        setFormTitle("");
        setFormInstruct("");
      } else {
        toast.error(data.message || "Failed to schedule session.");
      }
    } catch (err) {
      console.error("Scheduler submit error:", err);
      toast.error("Error communicating with schedule server.");
    }
  };

  const handleCancelInterview = async (id: number) => {
    const reason = window.prompt("Please state the reason for cancellation:");
    if (reason === null) return; // Unclicked

    try {
      const { data } = await api.put(`/interviews/${id}/cancel`, { reason });
      if (data.success) {
        toast.success("Interview session cancelled successfully.");
        fetchInterviews();
      } else {
        toast.error(data.message || "Could not cancel interview.");
      }
    } catch (_) {
      toast.error("Database communication error.");
    }
  };

  const handleActivateInterview = async (id: number) => {
    try {
      const { data } = await api.post(`/interviews/${id}/start`);
      if (data.success) {
        toast.success("Meeting activated! Launching waiting lobby...");
        navigate(`/interview/room/${id}`);
      } else {
        toast.error(data.message || "Could not start meeting.");
      }
    } catch (_) {
      toast.error("Error initializing video channel.");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "LIVE":
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider animate-pulse flex items-center gap-1"><Video size={12} /> Live Call</span>;
      case "COMPLETED":
        return <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Call Ended</span>;
      case "REPORT_READY":
        return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1"><CheckCircle size={12} /> Report Ready</span>;
      case "CANCELLED":
        return <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">Cancelled</span>;
      case "SCHEDULED":
      case "RESCHEDULED":
      default:
        return <span className="bg-sky-100 text-sky-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Scheduled</span>;
    }
  };

  const filteredInterviews = interviews.filter(i => {
    const matchType = filterType === "All" || i.interview_type === filterType;
    const matchStatus = filterStatus === "All" || 
      (filterStatus === "ACTIVE" && ["SCHEDULED", "RESCHEDULED", "LIVE"].includes(i.status)) ||
      (filterStatus === "PAST" && ["COMPLETED", "REPORT_READY", "CANCELLED"].includes(i.status));
    return matchType && matchStatus;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Video className="text-indigo-600" size={32} /> Video Screening Center
          </h1>
          <p className="text-slate-500 mt-1">
            Conduct secure, proctored video interviews and view automated Gemini candidate evaluations.
          </p>
        </div>
        <button
          onClick={handleOpenSchedule}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 text-sm shadow-md shadow-indigo-600/10 cursor-pointer self-start md:self-auto transition-colors"
        >
          <Plus size={18} /> Schedule Interview
        </button>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-50 text-slate-600 rounded-xl">
            <Calendar size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Total Scheduled</div>
            <div className="text-2xl font-black text-slate-950 mt-1">{stats.total}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-sky-50 text-sky-600 rounded-xl animate-pulse">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Upcoming Calls</div>
            <div className="text-2xl font-black text-slate-950 mt-1">{stats.scheduled}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <Video size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Rooms</div>
            <div className="text-2xl font-black text-slate-950 mt-1">{stats.live}</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="text-xs text-slate-400 font-bold uppercase tracking-wider">Evaluated Profiles</div>
            <div className="text-2xl font-black text-slate-950 mt-1">{stats.completed}</div>
          </div>
        </div>
      </div>

      {/* Control Area: Filtering */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase tracking-wider mr-2">
            <Filter size={14} /> Refine List:
          </div>

          <div className="flex bg-slate-50 rounded-xl p-1 border border-slate-100">
            <button
              onClick={() => setFilterStatus("All")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterStatus === "All" ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              All Runs
            </button>
            <button
              onClick={() => setFilterStatus("ACTIVE")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterStatus === "ACTIVE" ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Active/Scheduled
            </button>
            <button
              onClick={() => setFilterStatus("PAST")}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${filterStatus === "PAST" ? "bg-white text-indigo-650 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              Past / Completed
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 px-3 py-1.5 rounded-xl outline-none"
          >
            <option value="All">All Formats</option>
            <option value="TECHNICAL">TECHNICAL CODE SHIFT</option>
            <option value="HR">HR EXECUTIVE</option>
            <option value="BEHAVIORAL">SITUATIONAL BEHAVIORAL</option>
          </select>
        </div>

        <button
          onClick={fetchInterviews}
          className="text-slate-400 hover:text-slate-600 transition-colors p-2 text-xs font-bold uppercase tracking-wider flex items-center gap-1"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh Logs
        </button>
      </div>

      {loading ? (
        <div className="h-64 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center gap-4 border border-dashed border-slate-200">
          <Loader2 className="animate-spin text-indigo-600" size={32} />
          <span className="text-slate-400 text-sm font-bold uppercase tracking-widest font-mono">Synchronizing directories...</span>
        </div>
      ) : filteredInterviews.length === 0 ? (
        <div className="h-64 bg-slate-50/50 rounded-3xl flex flex-col items-center justify-center gap-4 text-center p-6 border border-slate-200 border-dashed">
          <Calendar size={40} className="text-slate-400" />
          <div>
            <h3 className="font-bold text-slate-800">No scheduled sessions found</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-sm">
              Schedule your first live video interview by clicking the button in the upper right.
            </p>
          </div>
        </div>
      ) : (
        /* Interviews Session Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredInterviews.map((meet) => (
            <div
              key={meet.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  {getStatusBadge(meet.status)}
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
                    ID: #{meet.id}
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-lg text-slate-950 tracking-tight leading-snug">{meet.title}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 bg-slate-100 rounded text-slate-500">
                      {meet.interview_type}
                    </span>
                  </div>
                </div>

                <hr className="border-slate-100" />

                <div className="grid grid-cols-2 gap-3 font-medium text-xs text-slate-500">
                  <div className="flex items-center gap-2.5">
                    <User className="text-slate-400" size={16} />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400/80 uppercase">Candidate</div>
                      <div className="font-bold text-slate-800">{meet.student_name}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Briefcase className="text-slate-400" size={16} />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400/80 uppercase">Position</div>
                      <div className="font-bold text-slate-800">{meet.job_title}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 col-span-2 mt-1">
                    <Calendar className="text-slate-400" size={16} />
                    <div>
                      <div className="text-[10px] font-bold text-slate-400/80 uppercase">Date & Duration</div>
                      <div className="font-bold text-slate-800">
                        {new Date(meet.scheduled_start).toLocaleString()} ({meet.duration_minutes}m)
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                {meet.status === "LIVE" || meet.status === "SCHEDULED" || meet.status === "RESCHEDULED" ? (
                  <>
                    <button
                      onClick={() => handleCancelInterview(meet.id)}
                      className="p-3 text-red-500 hover:text-white hover:bg-red-500 border border-slate-100 hover:border-red-500 rounded-xl transition-colors cursor-pointer"
                      title="Cancel Call"
                    >
                      <Trash2 size={16} />
                    </button>

                    <button
                      onClick={() => handleActivateInterview(meet.id)}
                      className="flex-1 bg-indigo-650 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider shadow-sm transition-colors cursor-pointer"
                    >
                      <Play size={14} className="fill-white" /> Activate Lobby
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => navigate(`/interview/room/${meet.id}`)}
                      className="w-full bg-slate-900 text-white hover:bg-slate-800 py-3 rounded-xl font-bold flex items-center justify-center gap-2 text-xs uppercase tracking-wider transition-colors cursor-pointer"
                    >
                      <Eye size={14} /> Review Assessment Report
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SCHEDULE INTERVIEW DIALOG */}
      <AnimatePresence>
        {isScheduleOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative border border-slate-100 flex flex-col"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-indigo-50 bg-gradient-to-r from-indigo-50/20 to-white flex items-center justify-between relative">
                <div>
                  <h2 className="text-xl font-bold text-slate-950">Schedule Screening Interview</h2>
                  <p className="text-slate-500 text-xs mt-0.5">Define job context, select candidate, and configure anti-cheat proctoring.</p>
                </div>
                <button
                  onClick={() => setIsScheduleOpen(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {loadingModalData ? (
                <div className="p-20 text-center space-y-3">
                  <Loader2 className="animate-spin text-indigo-605 mx-auto" size={32} />
                  <p className="text-sm font-bold text-slate-400 uppercase tracking-widest font-mono">Quering databases...</p>
                </div>
              ) : (
                <form onSubmit={handleScheduleSubmit} className="p-6 space-y-6 flex-1">
                  <div className="space-y-4">
                    {/* Basic info */}
                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Interview Title</label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g. Senior Frontend Assessment - Round 1"
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-medium"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Job Position</label>
                        <select
                          value={formJobId}
                          onChange={(e) => setFormJobId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-3 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-bold text-slate-700"
                        >
                          {jobsList.map(j => (
                            <option key={j.id} value={j.id}>{j.title}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Candidate Student</label>
                        <select
                          value={formStudentId}
                          onChange={(e) => setFormStudentId(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-3 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-bold text-slate-700"
                        >
                          {studentsList.map(s => (
                            <option key={s.id} value={s.id}>{s.name || s.full_name} ({s.email})</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Interrogation Genre</label>
                        <select
                          value={formType}
                          onChange={(e) => setFormType(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-3 py-3 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-bold text-slate-705"
                        >
                          <option value="TECHNICAL">TECHNICAL SKILLS</option>
                          <option value="HR">HR DISCUSSIONS</option>
                          <option value="BEHAVIORAL">BEHAVIORAL INDEX</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Launch Date & Time</label>
                        <input
                          type="datetime-local"
                          value={formStart}
                          onChange={(e) => {
                            setFormStart(e.target.value);
                            // Auto reset ending
                            if (e.target.value) {
                              const d = new Date(e.target.value);
                              d.setMinutes(d.getMinutes() + formDur);
                              setFormEnd(d.toISOString().slice(0, 16));
                            }
                          }}
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-bold text-slate-650"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-2">Duration Allocation</label>
                      <div className="flex gap-2">
                        {[15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            type="button"
                            onClick={() => handleFormDurationChange(mins)}
                            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${formDur === mins ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100"}`}
                          >
                            {mins} Minutes
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-black text-slate-400 uppercase tracking-wider block mb-1.5">Instructions & Invitation Notes</label>
                      <textarea
                        value={formInstruct}
                        onChange={(e) => setFormInstruct(e.target.value)}
                        placeholder="Please brief candidate on exact screening requirements."
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl focus:border-indigo-400 focus:bg-white outline-none transition-all text-sm font-medium"
                      />
                    </div>

                    {/* INTERACTIVE PROCTORING RULES PANEL */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                      <div className="flex items-center gap-1.5 text-xs text-indigo-605 font-black uppercase tracking-wider mb-3">
                        <ShieldCheck size={16} /> Anti-Cheating & Proctoring Lockdowns
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-805">Active Tab Isolation</div>
                            <div className="text-[10px] text-slate-400">Triggers alert if candidate switches browser tabs or windows.</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={procTab}
                            onChange={(e) => setProcTab(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-805">Enforced Fullscreen Lockdown</div>
                            <div className="text-[10px] text-slate-400">Strictly blocks progress if they try to resize or minimize the screen.</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={procFullscreen}
                            onChange={(e) => setProcFullscreen(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-850">Lobby webcam & mic requirement</div>
                            <div className="text-[10px] text-slate-400">Verifies hardware stream initialization before allowing entry.</div>
                          </div>
                          <div className="flex gap-4">
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                              <input type="checkbox" checked={procWebcam} onChange={(e) => setProcWebcam(e.target.checked)} /> Camera
                            </label>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                              <input type="checkbox" checked={procMic} onChange={(e) => setProcMic(e.target.checked)} /> Mic
                            </label>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <div className="text-xs font-bold text-slate-805">Interactive screen share requirement</div>
                            <div className="text-[10px] text-slate-400">Enforces sharing candidates' screens throughout the runtime call.</div>
                          </div>
                          <input
                            type="checkbox"
                            checked={procScreen}
                            onChange={(e) => setProcScreen(e.target.checked)}
                            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-xl font-bold text-xs uppercase tracking-[0.2em] shadow-md shadow-indigo-600/15 cursor-pointer hover:shadow-indigo-600/25 transition-all text-center"
                  >
                    Lock Schedule & Issue Invitations
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
export default InterviewCenter;
