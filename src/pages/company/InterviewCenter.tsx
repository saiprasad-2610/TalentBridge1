import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { 
  Calendar, Clock, Video, Users, 
  ChevronRight, MoreVertical, Plus, 
  Filter, CheckCircle, XCircle, AlertCircle,
  ExternalLink, MessageSquare, Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function InterviewCenter() {
  const { user } = useAuth();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchInterviews();
    }
  }, [user?.id]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/employer/${user?.id}/interviews`);
      if (res.data.success) {
        setInterviews(res.data.data.map((i: any) => ({
          ...i,
          time: new Date(i.time)
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Interview Center</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Manage your interview schedule and coordinate with candidates.</p>
        </div>
        <div className="flex gap-4">
           <button className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95">
              <Plus size={18} strokeWidth={3} /> Schedule Interview
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Upcoming Interviews List */}
        <div className="lg:col-span-2 space-y-6">
           <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-3">
                 <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                 <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Upcoming Today</h3>
              </div>
              <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                 Calendar View <Calendar size={14} />
              </button>
           </div>

           <div className="space-y-4">
              {interviews.map((interview) => (
                <InterviewCard key={interview.id} interview={interview} />
              ))}
           </div>
        </div>

        {/* Sidebar: Attendance & Quick Actions */}
        <div className="space-y-8">
          <div className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm space-y-8">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Attendance Stats</h3>
              <div className="space-y-6">
                 {[
                   { label: 'Confirmed/Upcoming', val: interviews.length > 0 ? ((interviews.filter(i => i.status === 'UPCOMING' || i.status === 'CONFIRMED').length / interviews.length) * 100).toFixed(0) + '%' : '0%', color: 'emerald', icon: CheckCircle },
                   { label: 'Completed', val: interviews.length > 0 ? ((interviews.filter(i => i.status === 'COMPLETED').length / interviews.length) * 100).toFixed(0) + '%' : '0%', color: 'blue', icon: Clock },
                   { label: 'Cancelled', val: interviews.length > 0 ? ((interviews.filter(i => i.status === 'CANCELLED').length / interviews.length) * 100).toFixed(0) + '%' : '0%', color: 'red', icon: XCircle },
                 ].map((stat, i) => (
                   <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 bg-${stat.color}-50 text-${stat.color}-600 rounded-xl flex items-center justify-center`}>
                            <stat.icon size={20}/>
                         </div>
                         <p className="text-xs font-black text-slate-800 uppercase">{stat.label}</p>
                      </div>
                      <p className={`text-lg font-black text-${stat.color}-600`}>{stat.val}</p>
                   </div>
                 ))}
              </div>
           </div>

           <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-2xl shadow-blue-500/20">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-md">
                    <Video size={24} />
                 </div>
                 <h3 className="text-lg font-black uppercase tracking-tight">Virtual Room</h3>
              </div>
              <p className="text-sm font-medium text-blue-100 mb-8 leading-relaxed">
                 Start your automated technical assessment session with AI monitoring enabled.
              </p>
              <button className="w-full py-4 bg-white text-blue-600 rounded-[20px] font-black uppercase text-xs tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
                 Enter Lobby <ChevronRight size={16} strokeWidth={3} />
              </button>
           </div>
        </div>
      </div>
    </div>
  );
}

function InterviewCard({ interview }: { interview: any }) {
  const [timeLeft, setTimeLeft] = useState('');
  const isUpcoming = interview.status !== 'COMPLETED';

  useEffect(() => {
    if (!isUpcoming) return;

    const timer = setInterval(() => {
      const diff = interview.time.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Starting Now');
        clearInterval(timer);
        return;
      }

      const mins = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(mins / 60);
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins % 60}m`);
      } else {
        setTimeLeft(`${mins}m remaining`);
      }
    }, 1000 * 60);

    return () => clearInterval(timer);
  }, [interview.time, isUpcoming]);

  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-6 flex flex-col md:flex-row justify-between items-center group hover:border-blue-200 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
      <div className="flex gap-6 items-center flex-1 w-full">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 border border-slate-100 shadow-sm overflow-hidden group-hover:scale-110 transition-transform">
           {interview.photo ? <img src={interview.photo} className="w-full h-full object-cover" /> : <Users size={28} />}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{interview.candidate}</h4>
            <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border ${
              interview.status === 'COMPLETED' ? 'bg-slate-50 text-slate-400 border-slate-100' :
              interview.status === 'UPCOMING' ? 'bg-blue-50 text-blue-600 border-blue-100' :
              'bg-emerald-50 text-emerald-600 border-emerald-100'
            }`}>
              {interview.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Briefcase size={14} /> {interview.role}</span>
            <span className="flex items-center gap-1.5 text-blue-600"><Clock size={14} /> {interview.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {interview.type}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 md:mt-0 flex items-center gap-6 w-full md:w-auto">
        {isUpcoming && (
          <div className="text-right hidden md:block">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Time Left</p>
            <p className="text-sm font-black text-blue-600 uppercase">{timeLeft || 'Loading...'}</p>
          </div>
        )}
        
        <div className="flex gap-3 flex-1 md:flex-none">
           {interview.status === 'COMPLETED' ? (
             <button className="flex-1 md:flex-none px-6 py-3 bg-slate-50 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 transition-all">
                View Feedback
             </button>
           ) : (
             <button className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10">
                Join Call <Video size={16} strokeWidth={3} />
             </button>
           )}
           <button className="p-4 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-slate-600 transition-all">
              <MoreVertical size={18} />
           </button>
        </div>
      </div>
    </div>
  );
}
