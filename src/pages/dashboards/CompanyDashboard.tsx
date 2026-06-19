import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Briefcase, Users, UserCheck, Eye, TrendingUp, Sparkles, Plus, 
  ArrowRight, Calendar, MessageSquare, Loader2, ArrowUpRight, Award,
  CheckCircle, Target, ShieldCheck, Mail, Phone, ListChecks
} from "lucide-react";
import { motion } from "motion/react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { toast } from "react-hot-toast";

interface StatProps {
  label: string;
  value: string | number;
  icon: any;
  trend?: string;
  trendType?: "up" | "down" | "neutral";
  description: string;
}

export function CompanyDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  const fetchDashboardData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: resData } = await api.get(`/analytics/employer/${user.id}`);
      if (resData.success) {
        setData(resData.data);
      } else {
        toast.error("Failed to load recruiter analytics.");
      }
    } catch (err) {
      console.error("Failed to fetch employer dashboard stats:", err);
      toast.error("Unable to load real-time analytics.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Compiling Talent Analytics...</p>
      </div>
    );
  }

  const s = data?.stats || {
    totalJobs: 0,
    totalApps: 0,
    totalHires: 0,
    totalViews: 0,
    applicationRate: "0%",
    avgTimeToHire: "14 Days",
    interviewSuccess: "0%"
  };

  const trendData = data?.trendData && data.trendData.length > 0 ? data.trendData : [
    { name: "Mon", apps: 2 },
    { name: "Tue", apps: 5 },
    { name: "Wed", apps: 4 },
    { name: "Thu", apps: 8 },
    { name: "Fri", apps: 7 },
    { name: "Sat", apps: 3 },
    { name: "Sun", apps: 4 }
  ];

  const funnelData = data?.funnelData && data.funnelData.length > 0 ? data.funnelData : [
    { name: "Applied", value: s.totalApps || 0 },
    { name: "Testing", value: Math.round((s.totalApps || 0) * 0.6) },
    { name: "Interview", value: Math.round((s.totalApps || 0) * 0.3) },
    { name: "Hired", value: s.totalHires || 0 }
  ];

  const recentApplicants = data?.applicants?.slice(0, 5) || [];

  const stats: StatProps[] = [
    {
      label: "Active Job Slots",
      value: s.totalJobs,
      icon: Briefcase,
      trend: "Unlimited",
      trendType: "neutral",
      description: "Live open postings on portal"
    },
    {
      label: "Candidate Applications",
      value: s.totalApps,
      icon: Users,
      trend: `${s.applicationRate} Conversion`,
      trendType: "up",
      description: "Total developer submissions"
    },
    {
      label: "Position Hires",
      value: s.totalHires,
      icon: UserCheck,
      trend: s.interviewSuccess,
      trendType: "up",
      description: "Shortlisted & finalized candidates"
    },
    {
      label: "Profile Impressions",
      value: s.totalViews,
      icon: Eye,
      trend: "+12.4% MoM",
      trendType: "up",
      description: "Student views of employer details"
    }
  ];

  const COLORS = ["#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#10b981"];

  return (
    <div className="space-y-10 min-h-screen pb-12">
      {/* Welcome & Action Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-8 rounded-[32px] border border-slate-800 relative overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full -mr-20 -mt-20 blur-[60px]" />
        
        <div className="space-y-2 relative z-10">
          <span className="px-3.5 py-1.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] rounded-full">
            Recruiter Center
          </span>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight leading-none mt-2">
            Welcome, {profile?.company_name || "Recruiter"}
          </h1>
          <p className="text-slate-400 text-xs leading-relaxed max-w-xl font-semibold">
            Evaluate developer profiles, schedule secure interactive proctored video calls, and access comprehensive AI evaluations immediately.
          </p>
        </div>

        <div className="flex flex-wrap gap-4 relative z-10">
          <button 
            onClick={() => navigate("/company/jobs/new")}
            className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Plus size={16} /> Post New Position
          </button>
          <button 
            onClick={() => navigate("/company/interviews")}
            className="px-6 py-4 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 rounded-[20px] text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-all flex items-center gap-2 cursor-pointer"
          >
            <Calendar size={16} className="text-blue-500" /> Interview Center
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-100/40 transition-all flex flex-col justify-between"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
              <div className="p-3.5 bg-blue-50/50 rounded-2xl text-blue-600">
                <stat.icon size={22} />
              </div>
            </div>
            
            <div className="mt-5 pt-4 border-t border-slate-50 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-semibold">{stat.description}</span>
              {stat.trend && (
                <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                  stat.trendType === "up" ? "bg-emerald-50 text-emerald-600" :
                  stat.trendType === "down" ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-500"
                }`}>
                  {stat.trend}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Analytical Charts Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Area Trend Chart */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 col-span-2 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Application Trajectory</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Last 7 Days Response metrics</p>
            </div>
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none" }}
                  labelStyle={{ color: "#ffffff", fontWeight: "bold", fontSize: "11px" }}
                  itemStyle={{ color: "#60a5fa", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="apps" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Funnel Distribution Chart */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Hiring Pipeline</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Conversion Stage Allocation</p>
            </div>
            <div className="p-2.5 bg-slate-50 text-slate-500 rounded-xl">
              <ListChecks size={16} />
            </div>
          </div>
          <div className="h-72 flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="80%">
              <BarChart data={funnelData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none" }}
                  itemStyle={{ color: "#ffffff", fontSize: "11px" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {funnelData.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5 font-bold text-slate-500 uppercase tracking-widest">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span>{d.name}: {d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Application Activity table */}
      <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-50 pb-6 gap-4">
          <div>
            <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Recent Developer Applicants</h3>
            <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Review top cognitive scores & schedules</p>
          </div>
          <button 
            onClick={() => navigate("/company/applicants")}
            className="self-start text-xs font-black uppercase text-blue-600 hover:text-blue-700 tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            All Applicants <ArrowRight size={14} />
          </button>
        </div>

        {recentApplicants.length === 0 ? (
          <div className="h-44 flex flex-col items-center justify-center gap-3 text-center border border-dashed border-slate-100 rounded-3xl">
            <Users className="text-slate-350" size={32} />
            <div>
              <p className="font-bold text-slate-700 text-xs uppercase tracking-wider">No applicants yet</p>
              <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-widest leading-none">Your live postings will capture applications here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-50 text-[10px] font-black text-slate-450 uppercase tracking-widest">
                  <th className="py-4">Candidate Profile</th>
                  <th className="py-4">Applied Position</th>
                  <th className="py-4">Talent Index</th>
                  <th className="py-4">Evaluation Track</th>
                  <th className="py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {recentApplicants.map((app: any, index: any) => (
                  <tr key={index} className="text-xs text-slate-650 group font-medium">
                    <td className="py-5">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-700 font-black shadow-inner uppercase overflow-hidden">
                          {app.avatar_url ? (
                            <img src={app.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            app.first_name?.[0] || "U"
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-none">
                            {app.first_name} {app.last_name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-3">
                            <span className="flex items-center gap-1"><Mail size={11} /> {app.contact_email || "Not specified"}</span>
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-5 font-bold text-slate-900">
                      {app.job_title}
                    </td>
                    <td className="py-5">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-slate-900 border border-indigo-50/80 bg-indigo-50/30 text-indigo-700 px-2 py-0.5 rounded-md flex items-center gap-1 font-mono">
                          <Award size={12} className="text-indigo-600 fill-indigo-200" />
                          {app.talent_score || 72} XP
                        </span>
                      </div>
                    </td>
                    <td className="py-5">
                      <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                        app.status === "SELECTED" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                        app.status === "REJECTED" ? "bg-red-50 text-red-600 border border-red-100" :
                        app.status === "INTERVIEW" ? "bg-indigo-50 text-indigo-700 border border-indigo-100 animate-pulse" :
                        app.status === "TESTING" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                        "bg-blue-50 text-blue-700 border border-blue-105"
                      }`}>
                        {app.status || "APPLIED"}
                      </span>
                    </td>
                    <td className="py-5 text-right">
                      <button 
                        onClick={() => navigate(`/company/pipeline`)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <ArrowUpRight size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default CompanyDashboard;
