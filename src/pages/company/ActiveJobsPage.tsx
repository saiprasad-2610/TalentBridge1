import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Plus, Search, Briefcase, MapPin, Calendar, Users, 
  ArrowUpRight, AlertCircle, Loader2, Sparkles, Filter, ChevronRight, Ban, Eye
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

interface Job {
  id: number;
  title: string;
  description: string;
  location: string;
  job_type: string;
  experience_level: string;
  salary_range: string;
  deadline: string;
  status: string;
  applicant_count: number;
  skills: string[];
}

export function ActiveJobsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchJobs = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/jobs/company/${user.id}`);
      if (data.success) {
        setJobs(data.data || []);
      } else {
        toast.error("Could not load company jobs.");
      }
    } catch (err) {
      console.error("Error fetching company active jobs:", err);
      toast.error("Network communication issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [user]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.location.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || job.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Accessing Job Register...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Active Job Postings</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Manage and track your published positions</p>
        </div>
        <button
          onClick={() => navigate("/company/jobs/new")}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} /> Post New Position
        </button>
      </div>

      {/* Query Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search roles by title, location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-slate-300"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="text-slate-400" size={16} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-650 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="OPEN">Open Postings</option>
            <option value="CLOSED">Closed/Paused</option>
          </select>
        </div>
      </div>

      {/* Grid of Jobs */}
      {filteredJobs.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center gap-4 bg-white border border-slate-150 border-dashed rounded-3xl p-8">
          <Briefcase className="text-slate-300" size={40} />
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">No matching jobs found</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest leading-none">Try adjusting search term or post a brand new position.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-100/40 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    job.status === "OPEN" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                  }`}>
                    {job.status}
                  </span>
                  
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-slate-400">
                    <Users size={14} className="text-blue-500" />
                    <span>{job.applicant_count || 0} applicants</span>
                  </div>
                </div>

                <div>
                  <h3 className="font-black text-slate-900 text-lg uppercase tracking-tight line-clamp-1">{job.title}</h3>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest">
                    <span className="flex items-center gap-1"><MapPin size={12} /> {job.location || "Remote"}</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> Deadline: {job.deadline ? new Date(job.deadline).toLocaleDateString() : "Open"}</span>
                  </div>
                </div>

                <p className="text-slate-500 text-xs font-semibold leading-relaxed line-clamp-3">
                  {job.description}
                </p>

                {/* Skills json */}
                {job.skills && job.skills.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {job.skills.map((skill, index) => (
                      <span key={index} className="text-[9px] bg-slate-50 border border-slate-100 text-slate-605 px-2 py-0.5 rounded-md font-bold font-mono">
                        {skill}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-blue-600 font-black tracking-widest uppercase">{job.salary_range || "Salary Disclosed"}</span>
                <button
                  onClick={() => navigate(`/company/jobs/tracking/${job.id}`)}
                  className="px-4 py-2 bg-slate-50 group-hover:bg-blue-600 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-[10px] font-black uppercase tracking-widest rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Manage <ChevronRight size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ActiveJobsPage;
