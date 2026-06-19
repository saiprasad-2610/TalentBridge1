import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Briefcase, Search, Filter, MapPin, Calendar, Award, CheckCircle2, 
  ChevronRight, ArrowLeft, Loader2, Sparkles, Building2, HelpCircle, AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { toast } from "react-hot-toast";

interface Job {
  id: number;
  company_id: number;
  company_name: string;
  logo_url: string;
  title: string;
  description: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string;
  skills_json: string;
  deadline: string;
  match_score?: number;
}

interface Application {
  id: number;
  status: string;
  job_id: number;
  job_title: string;
  company_name: string;
  current_stage_name: string;
}

export function AllJobsPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  
  // Search parameters
  const [searchTerm, setSearchTerm] = useState("");
  const [locationTerm, setLocationTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [experienceFilter, setExperienceFilter] = useState("ALL");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchJobsAndApps = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const studentId = profile?.id;
      // Fetch OPEN jobs and student application histories in parallel
      const [jobsResp, appsResp] = await Promise.all([
        api.get(`/jobs?studentId=${studentId || ""}`),
        api.get(`/analytics/student/${user.id}/applications`)
      ]);

      if (jobsResp.data.success) {
        setJobs(jobsResp.data.data || []);
      }
      if (appsResp.data.success) {
        setApplications(appsResp.data.data || []);
      }
    } catch (err) {
      console.error("Browse jobs load error:", err);
      toast.error("Internal API or networking issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobsAndApps();
  }, [user, profile]);

  const getApplicationForJob = (jobId: number) => {
    return applications.find(a => a.job_id === jobId);
  };

  const handleApply = async (jobId: number) => {
    if (!profile) {
      toast.error("Please set up a student profile first.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/jobs/apply", {
        studentId: profile.id,
        jobId: jobId
      });

      if (data.success) {
        toast.success("Application successfully registered!");
        // Refresh listings and states
        fetchJobsAndApps();
        // Update selected job modal if open
        if (selectedJob && selectedJob.id === jobId) {
          setSelectedJob(null);
        }
      } else {
        toast.error(data.message || "Failed to submit application.");
      }
    } catch (err: any) {
      console.error("Apply to position error:", err);
      const msg = err.response?.data?.message || "Hiring check failed.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredJobs = jobs.filter(job => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.company_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLoc = !locationTerm || job.location?.toLowerCase().includes(locationTerm.toLowerCase());
    const matchesType = typeFilter === "ALL" || job.job_type === typeFilter;
    const matchesExp = experienceFilter === "ALL" || job.experience_level === experienceFilter;
    
    return matchesSearch && matchesLoc && matchesType && matchesExp;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Querying Hot Opportunities...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen pb-12 font-sans">
      {/* Welcome Showcase */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 rounded-[32px] border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-[60px]" />
        
        <div className="space-y-2 relative z-10">
          <span className="px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
            Browse Opportunities
          </span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none mt-2">
            Target Placements
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xl font-semibold">
            Evaluate skill-matched vacancies, view match ratings, configure filters, and launch career advancements.
          </p>
        </div>
      </div>

      {/* Query Bar */}
      <div className="bg-white border border-slate-100 p-5 rounded-[24px] shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search roles, product names..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-350"
          />
        </div>

        <div className="relative w-full md:w-60">
          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
          <input
            type="text"
            placeholder="Location, 'Remote'..."
            value={locationTerm}
            onChange={(e) => setLocationTerm(e.target.value)}
            className="w-full bg-slate-50 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-500 focus:bg-white transition-all placeholder:text-slate-350"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-650 outline-none w-full md:w-auto"
          >
            <option value="ALL">All Types</option>
            <option value="FULL_TIME">Full-time</option>
            <option value="INTERNSHIP">Internship</option>
            <option value="CONTRACT">Contract</option>
            <option value="REMOTE">Remote</option>
          </select>

          <select
            value={experienceFilter}
            onChange={(e) => setExperienceFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-650 outline-none w-full md:w-auto"
          >
            <option value="ALL">All Experience Levels</option>
            <option value="Entry Level">Entry Level (0-1 yrs)</option>
            <option value="Mid Level">Mid Level (2-4 yrs)</option>
            <option value="Senior">Senior (5+ yrs)</option>
            <option value="Graduate Trainee">Fresher</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      {filteredJobs.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center gap-4 bg-white border border-slate-150 border-dashed rounded-3xl p-8">
          <Briefcase className="text-slate-355" size={40} />
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">No matching vacancies</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest leading-none">Try clearing your filters or check back later.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => {
            const app = getApplicationForJob(job.id);
            const skills = job.skills_json ? (typeof job.skills_json === "string" ? JSON.parse(job.skills_json) : job.skills_json) : [];

            return (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-104/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Card head */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 text-slate-700 flex items-center justify-center font-black uppercase text-xs">
                        {job.logo_url ? <img src={job.logo_url} alt="Logo" className="w-full h-full object-cover" /> : job.company_name?.[0]}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs leading-none">{job.company_name}</h4>
                        <span className="text-[9px] text-slate-400 mt-1 block uppercase tracking-wider font-extrabold">{job.location}</span>
                      </div>
                    </div>

                    {job.match_score !== undefined && (
                      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100 flex items-center gap-1 font-mono">
                        <Award size={12} /> {job.match_score}% Match
                      </span>
                    )}
                  </div>

                  <div>
                    <h3 className="font-black text-slate-950 text-base uppercase tracking-tight line-clamp-1">{job.title}</h3>
                    <p className="text-slate-500 text-xs mt-2 font-semibold leading-relaxed line-clamp-3">{job.description}</p>
                  </div>

                  {skills.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {skills.slice(0, 4).map((s: string, i: number) => (
                        <span key={i} className="text-[9px] bg-slate-50 border border-slate-100 font-bold px-2 py-0.5 rounded text-slate-650 font-mono">
                          {s}
                        </span>
                      ))}
                      {skills.length > 4 && (
                        <span className="text-[8px] text-slate-400 font-bold px-1 py-0.5">+{skills.length - 4} more</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card footer */}
                <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                  {app ? (
                    <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                      app.status === "SELECTED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100 animate-bounce" :
                      app.status === "REJECTED" ? "bg-red-50 text-red-600" :
                      "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    }`}>
                      Stage: {app.status || "APPLIED"}
                    </span>
                  ) : (
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{job.salary_range || "Competitive"}</span>
                  )}

                  <button
                    onClick={() => setSelectedJob(job)}
                    className="px-4.5 py-2.5 bg-slate-950 text-white hover:bg-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest transition-colors flex items-center gap-0.5 cursor-pointer"
                  >
                    View details <ChevronRight size={10} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Detail slide out modal */}
      <AnimatePresence>
        {selectedJob && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[32px] border border-slate-100 max-w-2xl w-full p-8 shadow-2xl space-y-6 relative max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-105 overflow-hidden flex items-center justify-center font-black text-slate-800 text-lg">
                    {selectedJob.logo_url ? <img src={selectedJob.logo_url} alt="Logo" className="w-full h-full object-cover" /> : selectedJob.company_name?.[0]}
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-slate-950 uppercase tracking-tight leading-none">{selectedJob.title}</h2>
                    <p className="text-slate-400 font-semibold text-xs tracking-wide uppercase mt-1 flex items-center gap-2">
                      <span>{selectedJob.company_name}</span> &bull; <span>{selectedJob.location}</span>
                    </p>
                  </div>
                </div>
                
                {selectedJob.match_score !== undefined && (
                  <span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1 font-mono">
                    <Award size={13} /> {selectedJob.match_score}% Skills Match
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-50 pb-2">Hiring Specs</h4>
                <p className="text-slate-650 text-xs leading-relaxed font-medium whitespace-pre-line">{selectedJob.description}</p>
                
                <div className="grid grid-cols-2 gap-4 py-4 bg-slate-50 rounded-2xl border border-slate-100 p-4">
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Experience Index</p>
                    <p className="text-slate-800 text-xs font-bold uppercase mt-1.5">{selectedJob.experience_level}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Compensation Allocation</p>
                    <p className="text-blue-600 text-xs font-black uppercase mt-1.5">{selectedJob.salary_range || "Not Disclosed"}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-205 text-slate-700 rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer"
                >
                  Close
                </button>

                {getApplicationForJob(selectedJob.id) ? (
                  <button
                    disabled
                    className="px-8 py-3.5 bg-indigo-50 text-indigo-700 font-black uppercase tracking-widest text-xs rounded-xl cursor-default"
                  >
                    Hiring Active (Applied)
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => handleApply(selectedJob.id)}
                    className="px-8 py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-widest cursor-pointer shadow-lg shadow-blue-500/10 flex items-center gap-1.5"
                  >
                    {submitting ? <Loader2 className="animate-spin" size={12} /> : "Transmit Application"}
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AllJobsPage;
