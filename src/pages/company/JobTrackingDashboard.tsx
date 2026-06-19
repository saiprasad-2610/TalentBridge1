import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { 
  ArrowLeft, Search, Filter, Briefcase, MapPin, Calendar, Users, Award, 
  ChevronRight, Compass, ShieldAlert, Sparkles, CheckCircle2, AlertCircle, FileText, 
  ExternalLink, Loader2, RefreshCw, BarChart, Activity, User, BookOpen
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

interface Applicant {
  application_id: number;
  status: string;
  applied_at: string;
  current_stage_id: number;
  student_id: number;
  user_id: number;
  full_name: string;
  email: string;
  resume_url: string;
  skills_json: string;
  profile_photo_url: string;
  talent_score: number;
  psychometric_score: number;
  psychometric_personality: string;
  latest_test_score: number;
  latest_test_violations: number;
  latest_test_auto_submitted: number;
}

export function JobTrackingDashboard() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [jobDetails, setJobDetails] = useState<any>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [stages, setStages] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const loadJobTrackingData = async () => {
    if (!jobId) return;
    setLoading(true);
    try {
      const [jobResp, applicantsResp] = await Promise.all([
        api.get(`/jobs/${jobId}`),
        api.get(`/jobs/applicants/${jobId}`)
      ]);

      if (jobResp.data.success) {
        setJobDetails(jobResp.data.data);
      }
      if (applicantsResp.data.success) {
        setApplicants(applicantsResp.data.data.applicants || []);
        setStages(applicantsResp.data.data.stages || []);
      }
    } catch (err) {
      console.error("Error loading job-specific tracking:", err);
      toast.error("Could not obtain deep job intelligence.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobTrackingData();
  }, [jobId]);

  const filteredApplicants = applicants.filter(a => {
    const matchesSearch = a.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStageName = (stageId: number) => {
    const st = stages.find(s => s.id === stageId);
    return st ? st.stage_name : "Pending Screening";
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Resolving Position Analytics...</p>
      </div>
    );
  }

  // Calculate Funnel
  const funnelCount = {
    total: applicants.length,
    testing: applicants.filter(a => a.status === "TESTING").length,
    interview: applicants.filter(a => a.status === "INTERVIEW" || a.status === "IN_PROGRESS").length,
    hired: applicants.filter(a => a.status === "SELECTED").length
  };

  return (
    <div className="space-y-8 min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <button 
          onClick={() => navigate("/company/jobs")}
          className="p-3 bg-white border border-slate-100 hover:border-slate-200 text-slate-600 rounded-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer shadow-sm"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Position Evaluation: {jobDetails?.title}</h1>
          <div className="flex items-center gap-4 text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">
            <span className="flex items-center gap-1"><MapPin size={12} /> {jobDetails?.location}</span>
            <span className="flex items-center gap-1"><Calendar size={12} /> Deadline: {jobDetails?.deadline ? new Date(jobDetails.deadline).toLocaleDateString() : "Open"}</span>
          </div>
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-150/60 p-5 rounded-3xl flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Applicants</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{funnelCount.total}</h3>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Users size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-150/60 p-5 rounded-3xl flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Skills Assessment</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{funnelCount.testing}</h3>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
            <Activity size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-150/60 p-5 rounded-3xl flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Live Video Calls</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{funnelCount.interview}</h3>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-650 rounded-2xl">
            <BookOpen size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-150/60 p-5 rounded-3xl flex justify-between items-center shadow-sm">
          <div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Hired Tracks</span>
            <h3 className="text-2xl font-black text-slate-900 mt-1">{funnelCount.hired}</h3>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
            <CheckCircle2 size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Applicants List */}
        <div className="col-span-2 bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Candidate Feed</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Review applicant profiles and evaluation subscores</p>
            </div>
            
            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-slate-650 outline-none"
              >
                <option value="ALL">All Status</option>
                <option value="APPLIED">Applied</option>
                <option value="TESTING">Testing</option>
                <option value="INTERVIEW">Interview Round</option>
                <option value="SELECTED">Selected</option>
                <option value="REJECTED">Archived</option>
              </select>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Filter applicant by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50/50 rounded-2xl pl-11 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-slate-350"
            />
          </div>

          <div className="divide-y divide-slate-50">
            {filteredApplicants.map((appl) => (
              <div key={appl.application_id} className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 text-slate-800 font-black flex items-center justify-center overflow-hidden">
                    {appl.profile_photo_url ? (
                      <img src={appl.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      appl.full_name?.[0] || "U"
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-950 text-xs leading-none">{appl.full_name}</h4>
                    <p className="text-[10px] text-slate-400 mt-1.5 font-semibold">{appl.email}</p>
                    
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[9px] bg-slate-50 border border-slate-100 text-slate-500 font-mono font-bold px-1.5 py-0.5 rounded">
                        Stage: {getStageName(appl.current_stage_id)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  {/* Scores */}
                  <div className="text-right">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Talent KPI</p>
                    <span className="text-xs font-black text-indigo-700 font-mono">
                      {appl.talent_score || 72} XP
                    </span>
                  </div>

                  <div className="text-right border-l border-slate-100 pl-4">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Assessment</p>
                    <span className="text-xs font-black text-slate-850 font-mono">
                      {appl.latest_test_score !== null ? `${appl.latest_test_score}%` : "No submissions"}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {appl.resume_url ? (
                      <a
                        href={appl.resume_url}
                        target="_blank"
                        rel="noreferrer"
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition-colors cursor-pointer"
                        title="Resume"
                      >
                        <FileText size={14} />
                      </a>
                    ) : null}
                    
                    <button
                      onClick={() => navigate(`/company/pipeline`)}
                      className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition-colors cursor-pointer"
                      title="Manage Status"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {filteredApplicants.length === 0 && (
              <div className="py-12 text-center text-xs text-slate-400 font-bold uppercase tracking-widest">
                No matching candidate profiles.
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Position Details */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-6 shadow-sm space-y-6 self-start">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <Briefcase size={16} className="text-blue-500" />
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Position Specifics</h3>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Title</span>
              <p className="font-bold text-slate-850 text-xs mt-1">{jobDetails?.title}</p>
            </div>

            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Description</span>
              <p className="text-slate-500 text-xs font-semibold leading-relaxed line-clamp-4 mt-1">{jobDetails?.description}</p>
            </div>

            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Job Type</span>
              <p className="font-black text-slate-850 text-xs uppercase mt-1">{jobDetails?.job_type || "FULL TIME"}</p>
            </div>

            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Location</span>
              <p className="font-bold text-slate-850 text-xs mt-1">{jobDetails?.location || "Remote"}</p>
            </div>

            <div>
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Salary bracket</span>
              <p className="font-bold text-blue-600 text-xs mt-1">{jobDetails?.salary_range || "Open Allocation"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobTrackingDashboard;
