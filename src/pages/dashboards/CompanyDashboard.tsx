import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Plus, 
  Users, 
  Briefcase, 
  Trophy, 
  Clock, 
  BarChart3, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  Lock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";

// Components
import { CandidateDetailModal } from "../../components/company/CandidateDetailModal.tsx";

export function CompanyDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Stats mirroring the high-fidelity screenshot
  const [activeJobs] = useState(18);
  const [totalApplicants] = useState(742);
  const [inPipeline] = useState(256);
  const [interviewsToday] = useState(7);
  const [hiredThisMonth] = useState(5);

  const [hoveredTrend, setHoveredTrend] = useState<number | null>(null);

  // Mock Active Jobs matching the screenshot exactly
  const mockJobs = [
    { id: "job-1", title: "Senior React Developer", type: "Full-time", applicants: 124, pipeline: 48, interviews: 12, hired: 2, status: "Active" },
    { id: "job-2", title: "Backend Node.js Developer", type: "Full-time", applicants: 98, pipeline: 36, interviews: 8, hired: 1, status: "Active" },
    { id: "job-3", title: "UI/UX Designer", type: "Full-time", applicants: 76, pipeline: 28, interviews: 5, hired: 0, status: "Active" },
    { id: "job-4", title: "Python Developer", type: "Internship", applicants: 156, pipeline: 64, interviews: 15, hired: 1, status: "Active" },
    { id: "job-5", title: "Product Manager", type: "Full-time", applicants: 67, pipeline: 22, interviews: 6, hired: 1, status: "Active" }
  ];

  // Mock upcoming interviews matching picture
  const upcomingInterviews = [
    { id: "int-1", name: "Rahul Sharma", role: "Senior React Developer", time: "10:00 AM", status: "Interviewing", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120" },
    { id: "int-2", name: "Priya Patel", role: "UI/UX Designer", time: "11:30 AM", status: "Interviewing", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120" },
    { id: "int-3", name: "Aman Verma", role: "Python Developer", time: "02:00 PM", status: "Scheduled", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120" }
  ];

  // Pipeline Steps with percentages matching the photo perfectly
  const pipelineSteps = [
    { label: "Applied", value: 742, pct: "100%", trend: null, color: "bg-blue-600" },
    { label: "Screening", value: 312, pct: "42%", trend: "- 8%", trendUp: false, color: "bg-cyan-500" },
    { label: "Assessment", value: 178, pct: "24%", trend: "- 5%", trendUp: false, color: "bg-purple-650 bg-indigo-500" },
    { label: "Interview", value: 68, pct: "9%", trend: "- 2%", trendUp: false, color: "bg-amber-500" },
    { label: "Offer", value: 12, pct: "1.6%", trend: "- 0.5%", trendUp: false, color: "bg-orange-500" },
    { label: "Hired", value: 5, pct: "0.6%", trend: "+ 0.2%", trendUp: true, color: "bg-emerald-500" }
  ];

  // Application trends data for custom spark chart
  const trendDays = [
    { day: "Jun 16", count: 120 },
    { day: "Jun 17", count: 142 },
    { day: "Jun 18", count: 110 },
    { day: "Jun 19", count: 186 },
    { day: "Jun 20", count: 154 },
    { day: "Jun 21", count: 139 },
    { day: "Jun 22", count: 172 }
  ];

  // Candidate quality distribution data
  const qualityScore = {
    overall: 78,
    label: "Good",
    excellentPct: 30,
    goodPct: 48,
    averagePct: 15,
    needsImprovementPct: 7
  };

  return (
    <div className="space-y-8 bg-[#f8fafd] min-h-screen px-4 py-8">
      
      {/* Greetings Block & Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            Good Evening, Saiprasad! <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs mt-1">
            Here's what's happening with your hiring today.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Calendar Picker Wrapper */}
          <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-slate-600 font-extrabold text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span>Jun 22 - Jun 28, 2026</span>
          </div>

          <Link 
            to="/company/jobs"
            className="px-5 py-2.5 bg-[#1e40af] hover:bg-blue-800 text-white rounded-2xl font-extrabold text-xs uppercase tracking-wider shadow-md shadow-blue-900/10 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Plus size={15} strokeWidth={3} />
            Post New Job
          </Link>
        </div>
      </div>

      {/* Five Gorgeous KPI Metric Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Active Jobs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0">
            <Briefcase size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-405 text-slate-400 block tracking-tight">Active Jobs</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">18</span>
            <span className="text-[9px] font-extrabold text-blue-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> 3 this week
            </span>
          </div>
        </div>

        {/* Total Applicants */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-teal-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
            <Users size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight">Total Applicants</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">742</span>
            <span className="text-[9px] font-extrabold text-emerald-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> 12% vs last week
            </span>
          </div>
        </div>

        {/* In Pipeline */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-purple-50 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
            <GitBranch size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight">In Pipeline</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">256</span>
            <span className="text-[9px] font-extrabold text-indigo-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> 8% vs last week
            </span>
          </div>
        </div>

        {/* Interviews Today */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-all">
          <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-400 block tracking-tight">Interviews Today</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">07</span>
            <span className="text-[9px] font-extrabold text-orange-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> 2 scheduled
            </span>
          </div>
        </div>

        {/* Hired Month */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100/80 shadow-sm flex items-start gap-4 hover:shadow-md transition-all col-span-2 md:col-span-1">
          <div className="w-10 h-10 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center shrink-0">
            <Trophy size={20} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-slate-405 text-slate-400 block tracking-tight">Hired (This Month)</span>
            <span className="text-2xl font-black text-slate-900 block mt-1">05</span>
            <span className="text-[9px] font-extrabold text-rose-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> 25% vs last month
            </span>
          </div>
        </div>
      </div>

      {/* Main Dashboard High-Fidelity Split Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Columns (8/12) */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* Hiring Pipeline Overview Map */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Hiring Pipeline Overview
              </h2>
              <div className="text-[10px] bg-slate-50 border border-slate-100 text-slate-500 font-extrabold px-3 py-1.5 rounded-xl uppercase tracking-wider">
                This Week ▾
              </div>
            </div>

            {/* Pipeline Step Chevron Connectors design */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 pt-2">
              {pipelineSteps.map((step, idx) => (
                <div key={idx} className="relative bg-[#f8fafd] border border-slate-100 rounded-2xl p-4 text-center hover:bg-slate-50 hover:border-slate-200 transition-colors">
                  <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                    {step.label}
                  </span>
                  
                  <span className="text-xl font-black text-slate-950 block mt-2">
                    {step.value}
                  </span>

                  <div className="mt-3 flex justify-center items-center gap-1">
                    <span className="text-[9px] font-extrabold px-2 py-0.5 bg-white border border-slate-100 rounded-md text-slate-600">
                      {step.pct}
                    </span>
                    {step.trend && (
                      <span className={`text-[9px] font-extrabold flex items-center ${step.trendUp ? "text-emerald-600" : "text-rose-500"}`}>
                        {step.trendUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                        {step.trend.replace(/[-+]/g, '')}
                      </span>
                    )}
                  </div>
                  
                  {/* Glowing step connector dot indicator line */}
                  <div className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-3 h-3 bg-white border-2 border-slate-200 rounded-full hidden md:block z-10" style={{ display: idx === 5 ? 'none' : 'block' }}>
                    <div className="w-1 h-1 bg-indigo-500 rounded-full mx-auto" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Active Jobs Table block */}
          <div className="bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Top Active Jobs
              </h2>
              <Link to="/company/jobs" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-0.5">
                View All Jobs <ArrowUpRight size={13} />
              </Link>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-4 px-6">Job Title</th>
                    <th className="py-4 px-6 text-center">Applicants</th>
                    <th className="py-4 px-6 text-center">In Pipeline</th>
                    <th className="py-4 px-6 text-center">Interviews</th>
                    <th className="py-4 px-6 text-center">Hired</th>
                    <th className="py-4 px-6 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-slate-700 text-xs font-semibold">
                  {mockJobs.map((job, index) => (
                    <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3.5 px-6">
                        <span className="font-extrabold text-slate-900 block">{job.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-1">{job.type}</span>
                      </td>
                      <td className="py-3.5 px-6 font-extrabold text-center text-slate-900">{job.applicants}</td>
                      <td className="py-3.5 px-6 font-extrabold text-center text-indigo-600">{job.pipeline}</td>
                      <td className="py-3.5 px-6 font-extrabold text-center text-orange-600">{job.interviews}</td>
                      <td className="py-3.5 px-6 font-extrabold text-center text-emerald-605 text-[#10b981]">{job.hired}</td>
                      <td className="py-3.5 px-6 text-right">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-100 text-emerald-700 font-black uppercase text-[9px] rounded-lg tracking-wide">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                          Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Application Trends Spark Line Chart */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Application Trends
                </h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Daily Application spikes over the past week
                </p>
              </div>
              <div className="bg-[#f0f4ff] hover:bg-[#e0ebff] text-blue-600 text-[10px] font-black px-4 py-2 rounded-xl transition-all shadow-sm">
                186 Applications
              </div>
            </div>

            {/* Custom SVG Line Chart matching aesthetic style */}
            <div className="h-48 relative pt-4">
              <svg className="w-full h-full" viewBox="0 0 700 160">
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.18" />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
                {/* Gridlines */}
                <line x1="0" y1="40" x2="700" y2="40" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="80" x2="700" y2="80" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="120" x2="700" y2="120" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
                
                {/* Shading Area */}
                <path 
                  d="M 50 140 Q 150 120 250 80 T 450 110 T 650 40 L 650 150 L 50 150 Z" 
                  fill="url(#chartGrad)" 
                />

                {/* Spline Curve path */}
                <path 
                  d="M 50 140 Q 150 120 250 80 T 450 110 T 650 40" 
                  fill="none" 
                  stroke="#4f46e5" 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                />

                {/* Highlight Dots */}
                {trendDays.map((t, idx) => {
                  const x = 50 + idx * 100;
                  // Compute dynamic visual y matched curve
                  const ys = [140, 115, 80, 105, 95, 75, 40];
                  return (
                    <g key={idx} className="cursor-pointer group" onMouseEnter={() => setHoveredTrend(idx)} onMouseLeave={() => setHoveredTrend(null)}>
                      <circle 
                        cx={x} 
                        cy={ys[idx]} 
                        r={hoveredTrend === idx ? "7" : "4.5"} 
                        fill={hoveredTrend === idx ? "#4f46e5" : "white"} 
                        stroke="#4f46e5" 
                        strokeWidth="3.5"
                        className="transition-all"
                      />
                      {hoveredTrend === idx && (
                        <foreignObject x={x - 45} y={ys[idx] - 38} width="90" height="30">
                          <div className="bg-slate-950 text-white text-[9px] font-black rounded-lg py-1 px-2 text-center shadow-lg uppercase tracking-wider">
                            {t.count} Apps
                          </div>
                        </foreignObject>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Chart labels bottom */}
              <div className="flex justify-between px-6 pt-2 border-t border-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                {trendDays.map((td, index) => (
                  <span key={index}>{td.day}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Columns (4/12) */}
        <div className="lg:col-span-4 space-y-8">
          
          {/* AI Insights box matched exactly */}
          <div className="bg-[#0b0f2a] text-white p-6 rounded-[24px] border border-[#1e234c] shadow-xl relative overflow-hidden flex flex-col justify-between min-h-[300px]">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-650 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
            <div className="space-y-5 relative z-10">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black tracking-widest text-[#a5b4fc] uppercase flex items-center gap-1.5">
                  <Sparkles size={14} className="text-indigo-400" />
                  AI Insights
                </span>
                <Link to="/company/ai-recruiter" className="text-[10px] font-black text-indigo-300 hover:text-white uppercase tracking-wider">
                  View All
                </Link>
              </div>

              {/* Insight Rows styling */}
              <div className="space-y-4 pt-1">
                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <Sparkles size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      8 candidates are highly recommended for Senior Developer role
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>

                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <BarChart3 size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      Frontend Developer applications increased by 34% this week
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>

                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <Users size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      5 candidates are at risk of dropping off in the assessment stage
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>
              </div>
            </div>

            <Link 
              to="/company/ai-recruiter"
              className="mt-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-500 text-white rounded-xl text-center text-[10px] font-black uppercase tracking-widest relative z-10 block transition-all"
            >
              Go to AI Recruiter <span className="font-sans">→</span>
            </Link>
          </div>

          {/* Candidate Quality Score Donut chart */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Candidate Quality Score
              </h3>
              <span className="text-[10px] text-indigo-500 font-black uppercase tracking-wider cursor-pointer hover:underline">
                Details
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-6 pt-2">
              {/* Circular Dial using SVG */}
              <div className="relative w-28 h-28 shrink-0">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                  {/* Background track */}
                  <path 
                    className="text-slate-100" 
                    strokeWidth="3.5" 
                    stroke="currentColor" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  />
                  {/* Excellent segment */}
                  <path 
                    className="text-blue-500" 
                    strokeDasharray="30 100" 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    stroke="currentColor" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  />
                  {/* Good segment */}
                  <path 
                    className="text-emerald-500" 
                    strokeDasharray="48 100" 
                    strokeDashoffset="-30"
                    strokeWidth="4" 
                    strokeLinecap="round"
                    stroke="currentColor" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  />
                </svg>
                {/* Score central display */}
                <div className="absolute inset-0 flex flex-col justify-center items-center">
                  <span className="text-xl font-black text-slate-950 leading-none">78</span>
                  <span className="text-[9px] text-emerald-600 font-extrabold uppercase mt-1">Good</span>
                </div>
              </div>

              {/* Dynamic Legend matches design exact colors */}
              <div className="flex-1 space-y-2 w-full text-xs">
                <div className="flex justify-between items-center text-slate-605">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="font-extrabold text-slate-800">Excellent (80-100)</span>
                  </div>
                  <span className="font-extrabold text-slate-900">30%</span>
                </div>
                <div className="flex justify-between items-center text-slate-605">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-slate-800">Good (60-79)</span>
                  </div>
                  <span className="font-extrabold text-slate-900">48%</span>
                </div>
                <div className="flex justify-between items-center text-slate-605">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="font-extrabold text-slate-800">Average (40-59)</span>
                  </div>
                  <span className="font-extrabold text-slate-900">15%</span>
                </div>
                <div className="flex justify-between items-center text-slate-605">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                    <span className="font-extrabold text-slate-800">Needs Improvement</span>
                  </div>
                  <span className="font-extrabold text-slate-900">7%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Upcoming Interviews listing section */}
          <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Upcoming Interviews
              </h3>
              <span className="text-[10px] text-blue-600 font-black uppercase tracking-wider cursor-pointer hover:underline">
                View Calendar
              </span>
            </div>

            <div className="space-y-4">
              {upcomingInterviews.map((interview, index) => (
                <div key={index} className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                      <img src={interview.avatar} alt="Candidate" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-950 block">{interview.name}</span>
                      <span className="text-[10px] text-slate-450 text-slate-400 font-bold block mt-0.5">{interview.role}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-right">
                    <div className="text-right">
                      <span className="text-[10px] font-black text-slate-950 block">{interview.time}</span>
                      <span className="text-[8px] text-indigo-500 font-extrabold uppercase mt-0.5 block">Live Meet</span>
                    </div>
                    
                    <button 
                      onClick={() => {
                        toast.success(`Opening live audio/video setup for ${interview.name}...`);
                        navigate(`/company/interviews`);
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-black uppercase tracking-wider text-[9px] rounded-lg cursor-pointer"
                    >
                      {interview.status}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={() => { navigate('/company/interviews'); }}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl text-center border border-slate-100 block transition-colors"
            >
              +4 More Interviews Today
            </button>
          </div>

        </div>

      </div>

      <AnimatePresence>
        {selectedCandidate && (
          <CandidateDetailModal 
            candidate={selectedCandidate} 
            onClose={() => setSelectedCandidate(null)} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}
