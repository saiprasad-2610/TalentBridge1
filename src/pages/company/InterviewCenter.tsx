import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { 
  Calendar, Clock, Video, Users, 
  ChevronRight, MoreVertical, Plus, 
  Filter, CheckCircle, XCircle, AlertCircle,
  ExternalLink, MessageSquare, Briefcase, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';

const parseLocalDatetime = (dateStr: string | Date | null | undefined): Date => {
  if (!dateStr) return new Date();
  if (dateStr instanceof Date) return dateStr;
  
  try {
    if (String(dateStr).includes('Z')) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const normalized = String(dateStr).replace(' ', 'T');
    const parsed = new Date(normalized);
    if (!isNaN(parsed.getTime())) return parsed;
    return new Date(dateStr);
  } catch (err) {
    console.warn("Failed to parse datetime:", err);
    return new Date(dateStr);
  }
};

export function InterviewCenter() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Scheduling states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [selectedAppId, setSelectedAppId] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [scheduling, setScheduling] = useState(false);

  // New enterprise parameters
  const [scheduledType, setScheduledType] = useState('Technical Interview');
  const [mode, setMode] = useState('Online Interview');
  const [duration, setDuration] = useState('30');
  const [interviewerName, setInterviewerName] = useState('Staff Recruiter');
  const [instructions, setInstructions] = useState('Please have a working mic and camera, and join 5 minutes early.');

  useEffect(() => {
    if (user?.id) {
      fetchInterviews();
      fetchApplicants();
    }
  }, [user?.id]);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/employer/${user?.id}/interviews`);
      if (res.data.success) {
        setInterviews(res.data.data.map((i: any) => ({
          ...i,
          time: parseLocalDatetime(i.time)
        })));
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicants = async () => {
    if (!user?.id) return;
    try {
      setLoadingApplicants(true);
      const res = await api.get(`/analytics/employer/${user?.id}`);
      if (res.data.success) {
        setApplicants(res.data.data.applicants || []);
      }
    } catch (e) {
      console.error("Error loading company applicants:", e);
    } finally {
      setLoadingApplicants(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppId) {
      toast.error('Please select a candidate');
      return;
    }
    if (!scheduledAt) {
      toast.error('Please select a date and time');
      return;
    }

    const selectedApp = applicants.find(app => String(app.application_id) === String(selectedAppId));
    if (!selectedApp) {
      toast.error('Selected candidate application could not be verified');
      return;
    }

    try {
      setScheduling(true);
      const res = await api.post('/jobs/applications/schedule-interview', {
        applicationId: Number(selectedAppId),
        stageId: selectedApp.current_stage_id || 1, // fallback stage
        interviewType: scheduledType,
        locationOrLink: mode,
        scheduledAt: new Date(scheduledAt).toISOString(),
        notes,
        duration: Number(duration),
        interviewerName,
        instructions
      });

      if (res.data.success) {
        toast.success('Interview scheduled successfully!');
        setShowScheduleModal(false);
        // Reset
        setSelectedAppId('');
        setScheduledAt('');
        setNotes('');
        // Refresh
        fetchInterviews();
      } else {
        toast.error(res.data.message || 'Failed to schedule');
      }
    } catch (err: any) {
      console.error("Error scheduling:", err);
      toast.error('Failed to schedule interview due to network issue');
    } finally {
      setScheduling(false);
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
        <div className="flex gap-4 cursor-pointer">
           <button 
             onClick={() => setShowScheduleModal(true)}
             className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 cursor-pointer"
           >
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
              {loading ? (
                <div className="text-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400 font-medium text-sm">
                  Loading schedules...
                </div>
              ) : interviews.length === 0 ? (
                <div className="text-center py-16 bg-white rounded-3xl border border-slate-100 shadow-sm text-slate-400">
                  <Calendar className="mx-auto text-slate-300 mb-3" size={44} />
                  <p className="font-bold text-sm text-slate-600">No Scheduled Interviews</p>
                  <p className="text-xs text-slate-400 mt-1">Click the top right button to schedule an interview with an active applicant.</p>
                </div>
              ) : (
                interviews.map((interview) => (
                  <InterviewCard key={interview.id} interview={interview} onJoin={() => navigate(`/interview/live/${interview.id}`)} />
                ))
              )}
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

      {/* Schedule Interview Modal Dialog */}
      <AnimatePresence>
        {showScheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowScheduleModal(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            {/* Modal Body */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[40px] border border-slate-100 shadow-2xl p-8 max-w-2xl w-full relative z-10 max-h-[85vh] overflow-y-auto mx-4"
            >
              <div className="flex justify-between items-center mb-6 border-b border-slate-50 pb-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Schedule Interview</h3>
                  <p className="text-xs text-slate-400 font-medium">Coordinate a premium, live assessment session with an active candidate</p>
                </div>
                <button 
                  onClick={() => setShowScheduleModal(false)}
                  className="p-3 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>

              <form onSubmit={handleScheduleInterview} className="space-y-6">
                {/* Select Applicant Dropdown */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Choose Candidate / Applicant</label>
                  <select 
                    value={selectedAppId}
                    onChange={(e) => setSelectedAppId(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all uppercase"
                  >
                    <option value="">-- SELECT CANDIDATE --</option>
                    {applicants.map((app) => (
                      <option key={app.application_id} value={app.application_id}>
                        {app.full_name} / {app.job_title} ({app.status})
                      </option>
                    ))}
                  </select>
                  {applicants.length === 0 && !loadingApplicants && (
                    <p className="text-[10px] text-amber-600 font-medium">⚠️ No applicants available to schedule. Post jobs and receive candidates first!</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Interview Mode Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block font-bold">Interview Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMode('Online Interview')}
                        className={`py-3.5 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                          mode === 'Online Interview' 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                          : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        Online CALL
                      </button>
                      <button
                        type="button"
                        onClick={() => setMode('Offline Interview')}
                        className={`py-3.5 rounded-2xl text-[11px] font-extrabold uppercase tracking-wider border transition-all ${
                          mode === 'Offline Interview' 
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10' 
                          : 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100'
                        }`}
                      >
                        In-Person VISIT
                      </button>
                    </div>
                  </div>

                  {/* Interview Type Selection */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Interview Round Type</label>
                    <select
                      value={scheduledType}
                      onChange={(e) => setScheduledType(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all uppercase"
                    >
                      <option value="HR Interview">HR Interview</option>
                      <option value="Technical Interview">Technical Interview</option>
                      <option value="Managerial Interview">Managerial Interview</option>
                      <option value="Final Round">Final Round Interview</option>
                      <option value="Campus Placement Interview">Campus Placement Interview</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Interviewer Name */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Interviewer Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. John Doe (Engineering Lead)"
                      value={interviewerName}
                      onChange={(e) => setInterviewerName(e.target.value)}
                      required
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all"
                    />
                  </div>

                  {/* Duration Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Session Duration</label>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all"
                    >
                      <option value="15">15 Minutes (Brief Check)</option>
                      <option value="30">30 Minutes (Standard)</option>
                      <option value="45">45 Minutes (Technical Deep Dive)</option>
                      <option value="60">60 Minutes (Comprehensive)</option>
                    </select>
                  </div>
                </div>

                {/* Date & Time Selector */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Scheduled Date & Time</label>
                  <input 
                    type="datetime-local" 
                    value={scheduledAt}
                    onChange={(e) => setScheduledAt(e.target.value)}
                    required
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all cursor-pointer"
                  />
                </div>

                {/* Detailed Instructions Textarea */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Specific Stage Instructions</label>
                  <textarea 
                    placeholder="Provide meeting rules, code of conduct, environment details etc."
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all font-sans"
                  />
                </div>

                {/* General Notes */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">General Notes to Candidate (Email / Notification Alert)</label>
                  <textarea 
                    placeholder="Dress code, resume preparation, guidelines..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-150 transition-all font-sans"
                  />
                </div>

                {/* Submit / Action buttons */}
                <div className="flex gap-4 pt-2 border-t border-slate-50 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowScheduleModal(false)}
                    className="flex-1 py-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={scheduling}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {scheduling ? 'Scheduling...' : 'Save Schedule'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function InterviewCard({ interview, onJoin }: { interview: any; onJoin: () => void }) {
  const [timeLeft, setTimeLeft] = useState('');
  const isUpcoming = interview.status !== 'COMPLETED';

  useEffect(() => {
    if (!isUpcoming) return;

    const computeTime = () => {
      const diff = interview.time.getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Starting Now');
        return;
      }

      const mins = Math.floor(diff / (1000 * 60));
      const hours = Math.floor(mins / 60);
      
      if (hours > 0) {
        setTimeLeft(`${hours}h ${mins % 60}m`);
      } else {
        setTimeLeft(`${mins}m remaining`);
      }
    };

    computeTime();
    const timer = setInterval(computeTime, 1000 * 60);

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
              interview.status === 'LIVE' ? 'bg-red-50 text-red-650 border-red-100 animate-pulse' :
              'bg-blue-50 text-blue-601 border-blue-100'
            }`}>
              {interview.status}
            </span>
          </div>
          <div className="flex flex-wrap gap-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Briefcase size={14} /> {interview.role}</span>
            <span className="flex items-center gap-1.5 text-blue-600">
              <Clock size={14} /> {interview.time.toLocaleDateString([], { month: 'short', day: '2-digit' })}, {interview.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="flex items-center gap-1.5"><MessageSquare size={14} /> {interview.type}</span>
          </div>
          {interview.notes && (
            <p className="text-xs text-slate-450 italic mt-2 font-medium bg-slate-50 p-2.5 rounded-lg border border-slate-100 border-dashed">
              Notes: {interview.notes}
            </p>
          )}
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
             <button 
               onClick={onJoin}
               className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10 cursor-pointer"
             >
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
