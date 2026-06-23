import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, FunnelChart, Funnel, LabelList
} from 'recharts';
import { 
  TrendingUp, Users, Briefcase, Target, 
  Calendar, Filter, Download, ArrowUpRight, ArrowDownRight, BarChart3
} from 'lucide-react';

const COLORS = ['#2563eb', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchAnalytics();
    }
  }, [user?.id]);

  const fetchAnalytics = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/analytics/employer/${user.id}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const trendData = data?.trendData || [];
  const funnelData = data?.funnelData || [];
  const skillData = data?.skillData || [];
  const rejectionData = data?.rejectionData || [];
  const stats = data?.stats || {};
  const applicants = data?.applicants || [];
  const totalHires = applicants.filter((a: any) => a.status === 'SELECTED').length;

  if (loading) return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data) return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
      <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300">
        <BarChart3 size={40} />
      </div>
      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">No Analytics Data Yet</h2>
      <p className="text-slate-500 text-sm max-w-xs text-center font-medium italic">
        We're still gathering insights for your workspace. Start posting jobs and reviewing candidates to see trends here!
      </p>
      <button 
        onClick={fetchAnalytics}
        className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg"
      >
        Refresh Data
      </button>
    </div>
  );

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Recruiter Analytics</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Real-time insights into your hiring performance and talent trends.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Calendar size={16} /> Last 30 Days
          </button>
          <button className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10">
            <Download size={16} /> Export Report
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Hires', value: totalHires, trend: '+100%', up: true, icon: Users, color: 'emerald' },
          { label: 'Application Rate', value: stats.applicationRate || '0%', trend: '+4.2%', up: true, icon: TrendingUp, color: 'blue' },
          { label: 'Interview Success', value: stats.interviewSuccess || '0%', trend: '+12%', up: true, icon: Target, color: 'purple' },
          { label: 'Active Jobs', value: stats.totalJobs || '0', trend: '+2', up: true, icon: Briefcase, color: 'orange' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-sm group hover:shadow-xl transition-all">
             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${
               stat.color === 'blue' ? 'bg-blue-50 text-blue-600' :
               stat.color === 'purple' ? 'bg-purple-50 text-purple-600' :
               stat.color === 'emerald' ? 'bg-emerald-50 text-emerald-600' :
               'bg-orange-50 text-orange-600'
             }`}>
               <stat.icon size={24} />
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
             <div className="flex items-end gap-3">
               <h3 className="text-2xl font-black text-slate-900">{stat.value}</h3>
               <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg flex items-center gap-1 ${stat.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                 {stat.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                 {stat.trend}
               </span>
             </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Application Trends */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Application Trends</h3>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Weekly Growth</span>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorApps" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: '#94a3b8' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  itemStyle={{ fontSize: '12px', fontWeight: '900', textTransform: 'uppercase' }}
                />
                <Area type="monotone" dataKey="apps" stroke="#2563eb" strokeWidth={4} fillOpacity={1} fill="url(#colorApps)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Hiring Funnel */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Hiring Funnel</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <FunnelChart>
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Funnel data={funnelData} dataKey="value">
                  <LabelList position="right" fill="#64748b" stroke="none" dataKey="name" style={{ fontSize: '10px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} />
                </Funnel>
              </FunnelChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Skill Demand */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Top Skill Demands</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <BarChart data={skillData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }} width={80} />
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="count" radius={[0, 10, 10, 0]} barSize={24}>
                  {skillData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Rejection Reasons */}
        <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Rejection Insights</h3>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
              <PieChart>
                <Pie
                  data={rejectionData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={8}
                  dataKey="value"
                >
                  {rejectionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-6 mt-4">
             {rejectionData.map((entry, index) => (
               <div key={index} className="flex items-center gap-2">
                 <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                 <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{entry.name}</span>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
