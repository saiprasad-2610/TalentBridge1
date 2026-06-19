import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Video, 
  Calendar, 
  Clock, 
  ArrowRight, 
  MessageSquare,
  Sparkles,
  Award,
  AlertCircle,
  HelpCircle,
  Loader2
} from "lucide-react";
import { motion } from "motion/react";
import api from "../../services/api.ts";
import toast from "react-hot-toast";

interface Interview {
  id: number;
  application_id: number;
  type: string;
  location_or_link: string;
  time: string;
  role: string;
  company: string;
  company_logo?: string;
  status: string;
  notes?: string;
}

export function StudentInterviews() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInterviews = async () => {
    try {
      const response = await api.get("/interviews/student");
      if (response.data?.success) {
        setInterviews(response.data.data);
      }
    } catch (err) {
      console.error("Error loading interviews:", err);
      toast.error("Could not load your video interviews.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInterviews();
  }, []);

  const handleJoinCall = (interviewId: number) => {
    toast.success("Opening secure live calling room...");
    navigate(`/interview/live/${interviewId}`);
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Scanning Schedule Records</p>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto space-y-8"
    >
      {/* Top Welcome Title Banner */}
      <div className="bg-white rounded-[40px] border border-slate-200 p-8 md:p-10 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 relative z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full text-indigo-600 text-[10px] font-black uppercase tracking-wider">
            <Video size={12} className="text-indigo-500" /> SECURE INTERVIEW MODULE
          </div>
          <h2 className="text-3xl md:text-4xl font-black text-slate-900 uppercase tracking-tight">Your Video Interviews</h2>
          <p className="text-sm text-slate-500 max-w-xl">
            View scheduled live video calls with hiring managers. Make sure your microphone is connected and your camera permissions are active.
          </p>
        </div>

        {/* Dynamic Glowing badge */}
        <div className="bg-[#090D1C] rounded-3xl p-6 text-white border border-slate-800 shadow-xl relative overflow-hidden self-stretch flex flex-col justify-center max-w-sm md:w-80 shrink-0">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl"></div>
          <p className="text-[9px] font-black uppercase tracking-widest text-indigo-300 mb-1.5">Interview Preparation Tip</p>
          <p className="text-xs text-slate-300 leading-relaxed font-semibold">
            Join the link exactly 5 minutes earlier to test sound, lighting, and connection before the recruiter arrives.
          </p>
        </div>
      </div>

      {/* Render Lists */}
      {interviews.length === 0 ? (
        <div className="bg-white rounded-[40px] border border-slate-200 p-16 text-center select-none shadow-sm">
          <div className="w-16 h-16 bg-slate-50 border border-slate-100/80 rounded-2xl flex items-center justify-center mx-auto mb-6 text-slate-400">
            <Video size={28} />
          </div>
          <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">No Interviews Scheduled</h4>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-2 leading-relaxed">
            Whenever a hiring company schedules an online test or a live video interview stage with you, it will be listed right here!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {interviews.map((item) => {
            const dateObj = new Date(item.time);
            const isLive = item.status === 'LIVE';
            const isCompleted = item.status === 'COMPLETED';

            return (
              <div 
                key={item.id}
                className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md hover:border-slate-300 transition-all flex flex-col"
              >
                {/* Header card info */}
                <div className="p-6 md:p-8 flex-1 space-y-6">
                  {/* Row 1: Company Logo / status indicator */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      {item.company_logo ? (
                        <img 
                          src={item.company_logo} 
                          alt={item.company}
                          className="w-12 h-12 rounded-xl object-contain bg-slate-50 p-1.5 border border-slate-100"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 text-indigo-600 font-black text-lg flex items-center justify-center rounded-xl">
                          {item.company.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.company}</p>
                        <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">{item.role}</h4>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      isLive ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20 animate-pulse' :
                      isCompleted ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' :
                      'bg-indigo-500/10 text-indigo-600 border border-indigo-500/20'
                    }`}>
                      {isLive ? '• LIVE CALLING' : isCompleted ? 'CONCLUDED' : 'UPCOMING'}
                    </span>
                  </div>

                  {/* Scheduled date & time container */}
                  <div className="grid grid-cols-2 gap-4 py-4 px-5 bg-slate-50/70 border border-slate-100 rounded-2xl text-slate-700">
                    <div className="flex items-center gap-2.5">
                      <Calendar size={14} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[8px] font-extrabold uppercase text-slate-400 leading-none">Date</p>
                        <p className="text-xs font-bold mt-1 text-slate-700">{dateObj.toLocaleDateString()}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <div>
                        <p className="text-[8px] font-extrabold uppercase text-slate-400 leading-none">Time Slot</p>
                        <p className="text-xs font-bold mt-1 text-slate-700">{dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  </div>

                  {/* Comments/Notes if prompt exist */}
                  {item.notes && (
                    <div className="p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                      <p className="text-[9px] font-extrabold uppercase tracking-wide text-amber-600 flex items-center gap-1.5 mb-1">
                        <MessageSquare size={10} /> Recruiter Instructions:
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">{item.notes}</p>
                    </div>
                  )}
                </div>

                {/* Card CTA Trigger */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
                  <div className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    Meeting ID: <span className="font-mono text-slate-600 selection:bg-slate-200">TS-{item.id}</span>
                  </div>

                  {isCompleted ? (
                    <button 
                      disabled
                      className="px-6 py-3 bg-slate-200 text-slate-400 font-extrabold text-[10px] uppercase tracking-widest rounded-xl cursor-not-allowed select-none"
                    >
                      Completed
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleJoinCall(item.id)}
                      className={`px-6 py-3 font-extrabold text-[10px] uppercase tracking-widest rounded-xl flex items-center gap-2 transition-all shadow-md ${
                        isLive 
                          ? 'bg-rose-500 hover:bg-rose-600 text-white shadow-rose-500/20 animate-bounce' 
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-500/10'
                      }`}
                    >
                      {isLive ? 'Join Live Interivew' : 'Join Call'} <ArrowRight size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
export default StudentInterviews;
