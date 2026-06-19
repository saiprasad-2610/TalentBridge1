import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  BarChart3, Loader2, Sparkles, TrendingUp, Award, Clock, ArrowUpRight, 
  HelpCircle, ShieldCheck, Heart, PieChart as PieIcon, Briefcase, RefreshCw, BarChart
} from "lucide-react";
import { motion } from "motion/react";
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart as ReBarChart, Bar, Cell, PieChart, Pie
} from "recharts";
import { toast } from "react-hot-toast";

interface StatItem {
  id: number;
  label: string;
  value: string | number;
  icon: any;
  trend: string;
  color: string;
}

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any>(null);

  const fetchAnalytics = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/analytics/employer/${user.id}`);
      if (data.success) {
        setAnalytics(data.data);
      } else {
        toast.error("Telemetry failed log extraction.");
      }
    } catch (err) {
      console.error("Telemetry analytics load error:", err);
      toast.error("Database querying latency.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest font-bold">Querying Deep Analytics...</p>
      </div>
    );
  }

  const s = analytics?.stats || {};
  const stats: StatItem[] = [
    {
      id: 1,
      label: "Total Hires Count",
      value: s.totalHires || 0,
      icon: Award,
      trend: s.interviewSuccess || "0% Success",
      color: "bg-emerald-50 text-emerald-600"
    },
    {
      id: 2,
      label: "Conversion Yield",
      value: s.applicationRate || "0%",
      icon: TrendingUp,
      trend: "Traffic metrics",
      color: "bg-blue-50 text-blue-600"
    },
    {
      id: 3,
      label: "Average Hiring Velocity",
      value: s.avgTimeToHire || "14 Days",
      icon: Clock,
      trend: "Screener to final round",
      color: "bg-indigo-50 text-indigo-600"
    },
    {
      id: 4,
      label: "Recruiter Impressions",
      value: s.totalViews || 0,
      icon: Briefcase,
      trend: "Profile Views",
      color: "bg-purple-50 text-purple-600"
    }
  ];

  const trendData = analytics?.trendData && analytics.trendData.length > 0 ? analytics.trendData : [
    { name: "Mon", apps: 2 },
    { name: "Tue", apps: 5 },
    { name: "Wed", apps: 4 },
    { name: "Thu", apps: 8 },
    { name: "Fri", apps: 7 },
    { name: "Sat", apps: 3 },
    { name: "Sun", apps: 4 }
  ];

  const funnelData = analytics?.funnelData && analytics.funnelData.length > 0 ? analytics.funnelData : [
    { name: "Applied", value: s.totalApps || 4 },
    { name: "Testing", value: Math.round((s.totalApps || 4) * 0.6) },
    { name: "Interview", value: Math.round((s.totalApps || 4) * 0.3) },
    { name: "Hired", value: s.totalHires || 1 }
  ];

  const skillData = analytics?.skillData && analytics.skillData.length > 0 ? analytics.skillData : [
    { name: "React", count: 4 },
    { name: "TypeScript", count: 3 },
    { name: "Node.js", count: 3 },
    { name: "SQL", count: 2 },
    { name: "CSS", count: 1 }
  ];

  const rejectionData = analytics?.rejectionData && analytics.rejectionData.length > 0 ? analytics.rejectionData : [
    { name: "Skill Match", value: 3 },
    { name: "Experienc Level", value: 2 },
    { name: "Culture fit", value: 1 }
  ];

  const COLORS = ["#3b82f6", "#6366f1", "#a855f7", "#ec4899", "#10b981"];

  return (
    <div className="space-y-8 min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Talent Pipeline Analytics</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Review demand indices, screening trends, and hiring funnel velocity</p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
        >
          <RefreshCw size={13} className="text-blue-600" /> Refresh Tel. Data
        </button>
      </div>

      {/* KPI Stats list */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.id} className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-lg transition-transform duration-200">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</span>
                <h3 className="text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3.5 rounded-2xl ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>

            <p className="text-[10px] text-slate-400 font-extrabold uppercase mt-5 pt-4 border-t border-slate-50">
              {stat.trend}
            </p>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Area Chart */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Candidate volume trajectory</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Application velocity over time</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none" }}
                  labelStyle={{ color: "#ffffff", fontWeight: "bold", fontSize: "11px" }}
                  itemStyle={{ color: "#60a5fa", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="apps" stroke="#3b82f6" strokeWidth={3.5} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pipeline Funnel Distribution */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Conversion Stages Allocation</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Pipeline dropoff diagnostics</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
              <BarChart3 size={16} />
            </div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ReBarChart data={funnelData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={9} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "16px", border: "none" }}
                  itemStyle={{ color: "#ffffff", fontSize: "11px" }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </ReBarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skills required */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Top Required Skill Index</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Tech stacks in demand from your job postings</p>
            </div>
          </div>
          <div className="space-y-4">
            {skillData.map((skill: any, idx: number) => {
              const maxCount = Math.max(...skillData.map((s: any) => s.count)) || 1;
              const percent = (skill.count / maxCount) * 100;
              return (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wide">
                    <span className="text-slate-800">{skill.name}</span>
                    <span className="text-slate-400 font-mono font-medium">{skill.count} Jobs</span>
                  </div>
                  <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Archive/Rejections pie reasons */}
        <div className="bg-white border border-slate-100 rounded-[32px] p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-5">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm uppercase tracking-wider">Archive Rejections Breakdown</h3>
              <p className="text-slate-400 text-[10px] uppercase font-bold mt-1">Analytical audit of archive actions</p>
            </div>
            <div className="p-2 bg-slate-50 rounded-xl text-slate-500">
              <PieIcon size={16} />
            </div>
          </div>
          <div className="h-44 flex items-center justify-around">
            <ResponsiveContainer width="50%" height="100%">
              <PieChart>
                <Pie
                  data={rejectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {rejectionData.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "none" }}
                  itemStyle={{ color: "#ffffff", fontSize: "10px" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2">
              {rejectionData.map((r: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-[10px]">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span className="font-extrabold text-slate-500 uppercase tracking-wider">{r.name}: {r.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;
