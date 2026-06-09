import React, { useEffect, useState } from 'react';
import { 
  Users, 
  CheckCircle2, 
  TrendingUp, 
  Award, 
  BrainCircuit,
  BarChart3,
  Target,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import api from '../../services/api';

import { toast } from 'react-hot-toast';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function TPODashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const handleNotImplemented = (feature: string) => {
    toast.info(`${feature} feature is coming soon!`, {
      icon: '🚀',
      style: {
        borderRadius: '16px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await api.get('/tpo/dashboard-stats');
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching TPO stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-96">Loading...</div>;

  const metrics = stats?.metrics || {};
  const collegeAnalytics = stats?.collegeAnalytics || [];

  const statCards = [
    { label: 'Total Students', value: metrics.totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Active Students', value: metrics.activeStudents, icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Placed Students', value: metrics.placedStudents, icon: Award, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Placement Rate', value: `${metrics.placementRate?.toFixed(1)}%`, icon: TrendingUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
              <div className={`${stat.bg} ${stat.color} p-3 rounded-2xl`}>
                <stat.icon size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placement Performance by College */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <BarChart3 className="text-blue-600" size={20} />
            College Performance Analytics
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collegeAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="college_name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                  cursor={{fill: '#f8fafc'}}
                />
                <Bar dataKey="placed_students" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Placed" />
                <Bar dataKey="total_students" fill="#e2e8f0" radius={[4, 4, 0, 0]} name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Talent Score Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-6 flex items-center gap-2">
            <Target className="text-blue-600" size={20} />
            Avg. Talent Scores by College
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={collegeAnalytics}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="college_name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontWeight: 'bold', fontSize: 12}} />
                <Tooltip 
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                />
                <Line type="monotone" dataKey="avg_talent_score" stroke="#3b82f6" strokeWidth={4} dot={{r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: '#fff'}} name="Talent Score" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* AI Insight Section */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-3xl text-white shadow-xl shadow-blue-500/20">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-white/20 p-2 rounded-xl">
            <BrainCircuit size={24} />
          </div>
          <h3 className="text-xl font-black uppercase tracking-tight">AI Placement Insights</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold text-blue-100 uppercase text-xs tracking-wider mb-2">College Strengths</h4>
              <p className="text-sm">Students across assigned colleges show exceptional proficiency in Data Structures and Algorithms with an average score of 82/100.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10">
              <h4 className="font-bold text-orange-100 uppercase text-xs tracking-wider mb-2">Skill Gaps Identified</h4>
              <p className="text-sm">A 40% deficiency in Soft Skills and Corporate Etiquette has been detected across CSE departments. Recommended workshop: "Corporate Communication 101".</p>
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl border border-white/10 flex flex-col justify-center items-center text-center">
            <AlertCircle size={48} className="text-blue-200 mb-4" />
            <h4 className="font-bold text-white uppercase tracking-wider mb-2">At-Risk Students</h4>
            <p className="text-sm text-blue-100 mb-4">{metrics.atRiskStudents || 0} students have a placement readiness score below 30%.</p>
            <button 
              onClick={() => handleNotImplemented('At-Risk Students List')}
              className="bg-white text-blue-600 px-6 py-2 rounded-xl font-bold text-sm hover:bg-blue-50 transition-colors"
            >
              View List
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
