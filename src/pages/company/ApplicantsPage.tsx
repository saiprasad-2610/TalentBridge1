import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Users, Search, Filter, ArrowLeft, Loader2, Award, Mail, Phone, Calendar, 
  Trash2, Eye, Compass, ShieldAlert, Sparkles, AlertCircle, FileText, ExternalLink, RefreshCw
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

interface Applicant {
  id: number;
  student_id: number;
  first_name: string;
  last_name: string;
  avatar_url: string;
  contact_email: string;
  contact_number: string;
  tech_stack: string;
  talent_score: number;
  status: string;
  application_id: number;
  current_stage_id: number;
  applied_at: string;
  job_title: string;
}

export function ApplicantsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [jobFilter, setJobFilter] = useState("ALL");

  const loadApplicants = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/employer/${user.id}`);
      if (data.success) {
        setApplicants(data.data.applicants || []);
      } else {
        toast.error("Failed to load applicants registry.");
      }
    } catch (err) {
      console.error("Applicants load error:", err);
      toast.error("Network communication issue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadApplicants();
  }, [user]);

  const uniqueJobs = Array.from(new Set(applicants.map(a => a.job_title))).filter(Boolean);

  const filteredApplicants = applicants.filter((applicant) => {
    const fullName = `${applicant.first_name} ${applicant.last_name}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || 
                          (applicant.tech_stack && applicant.tech_stack.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || applicant.status === statusFilter;
    const matchesJob = jobFilter === "ALL" || applicant.job_title === jobFilter;
    return matchesSearch && matchesStatus && matchesJob;
  });

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Accessing Candidate Register...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Applicants Registry</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Screen candidates, check talent points and manage stages</p>
        </div>
        <button
          onClick={loadApplicants}
          className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer self-start sm:self-auto shadow-sm"
        >
          <RefreshCw size={13} className="text-blue-600" /> Refresh List
        </button>
      </div>

      {/* Query Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search candidate names, skill keywords..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-slate-350"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="text-slate-400" size={15} />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-650 outline-none"
            >
              <option value="ALL">All Stages</option>
              <option value="APPLIED">Applied</option>
              <option value="TESTING">Testing</option>
              <option value="INTERVIEW">Interviewing</option>
              <option value="SELECTED">Hired</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <select
            value={jobFilter}
            onChange={(e) => setJobFilter(e.target.value)}
            className="bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-xs font-black uppercase tracking-widest text-slate-650 outline-none max-w-xs"
          >
            <option value="ALL">All Jobs Positions</option>
            {uniqueJobs.map((name, index) => (
              <option key={index} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table & Cards */}
      {filteredApplicants.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center gap-4 bg-white border border-slate-100 rounded-3xl p-8">
          <Users className="text-slate-350" size={36} />
          <div>
            <h3 className="font-extrabold text-slate-850 text-sm uppercase tracking-wider">No applicants found</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest leading-none">Try modifying filters or publish new listings.</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
          <div className="p-8 border-b border-slate-50">
            <h3 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              Showing {filteredApplicants.length} Candidates
            </h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-slate-50 text-[10px] font-black text-slate-450 uppercase tracking-widest bg-slate-50/50">
                  <th className="py-4 px-8">Candidate Profile</th>
                  <th className="py-4 px-4">Applied Job</th>
                  <th className="py-4 px-4">Talent Index</th>
                  <th className="py-4 px-4">Application Date</th>
                  <th className="py-4 px-4">Evaluation Stage</th>
                  <th className="py-4 px-8 text-right">Hiring Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredApplicants.map((candidate, idx) => (
                  <tr key={idx} className="text-xs text-slate-650 font-medium hover:bg-slate-50/40 transition-colors">
                    <td className="py-5 px-8">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-150 flex items-center justify-center text-slate-800 font-black uppercase overflow-hidden shadow-inner">
                          {candidate.avatar_url ? (
                            <img src={candidate.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            candidate.first_name?.[0] || "U"
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-950 leading-none">
                            {candidate.first_name} {candidate.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-2">
                            <span>{candidate.contact_email}</span>
                            {candidate.contact_number && <span>&bull; {candidate.contact_number}</span>}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 px-4 font-bold text-slate-950">
                      {candidate.job_title}
                    </td>
                    <td className="py-5 px-4">
                      <span className="font-extrabold text-slate-900 border border-indigo-50/80 bg-indigo-50/30 text-indigo-700 px-2 py-0.5 rounded-md flex items-center gap-1 w-fit font-mono">
                        <Award size={13} className="text-indigo-600 fill-indigo-200" />
                        {candidate.talent_score || 72} XP
                      </span>
                    </td>
                    <td className="py-5 px-4 font-black tracking-tighter text-slate-500 font-mono">
                      {new Date(candidate.applied_at).toLocaleDateString()}
                    </td>
                    <td className="py-5 px-4">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        candidate.status === "SELECTED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        candidate.status === "REJECTED" ? "bg-red-50 text-red-600 border border-red-100" :
                        candidate.status === "INTERVIEW" ? "bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse" :
                        candidate.status === "TESTING" ? "bg-amber-50 text-amber-500 border border-amber-100" :
                        "bg-blue-50 text-blue-700 border border-blue-105"
                      }`}>
                        {candidate.status || "APPLIED"}
                      </span>
                    </td>
                    <td className="py-5 px-8 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/company/pipeline`)}
                          className="px-4.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-black text-[9px] uppercase tracking-widest rounded-xl transition-colors cursor-pointer"
                        >
                          Review Candidate
                        </button>
                        <button
                          onClick={() => navigate(`/company/interviews`)}
                          className="px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-750 font-black text-[9px] uppercase tracking-widest rounded-xl transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Calendar size={11} /> Schedule Call
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicantsPage;
