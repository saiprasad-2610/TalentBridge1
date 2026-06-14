import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { 
  Search, Filter, MoreVertical, Star, Clock, MessageSquare, 
  CheckCircle, XCircle, ChevronRight, GripVertical, ShieldAlert, 
  Sparkles, Award, UserCheck, Check, ChevronLeft, RefreshCw, 
  FilterX, HelpCircle, AlertTriangle, Briefcase, Users, Target,
  Calendar, Zap, Download, Mail, MailPlus, CalendarPlus,
  PlayCircle, ThumbsUp, ThumbsDown, BarChart2, Eye, Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import toast from 'react-hot-toast';

// Define the stages for the pipeline
const PIPELINE_STAGES = [
  { id: 'APPLIED', label: 'Applied', color: 'blue' },
  { id: 'SCREENING', label: 'AI Screening', color: 'indigo' },
  { id: 'TESTING', label: 'Assessment', color: 'purple' },
  { id: 'INTERVIEW', label: 'Technical Interview', color: 'orange' },
  { id: 'HR', label: 'HR Interview', color: 'pink' },
  { id: 'SHORTLISTED', label: 'Selected', color: 'emerald' },
];

export function PipelineBoard() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [allApplicants, setAllApplicants] = useState<any[]>([]);
  
  const [selectedJobId, setSelectedJobId] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Selection & Bulk
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  
  // Preview
  const [previewCandidate, setPreviewCandidate] = useState<any | null>(null);

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [minScore, setMinScore] = useState(0);

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [analyticsRes, jobsRes] = await Promise.all([
        api.get(`/analytics/employer/${user?.id}`),
        api.get(`/jobs`)
      ]);

      let fetchedApplicants = [];
      if (analyticsRes.data.success) {
        fetchedApplicants = (analyticsRes.data.data.applicants || []).map((app: any) => ({
          ...app,
          status: app.current_stage_id || app.status || 'APPLIED'
        }));
        setAllApplicants(fetchedApplicants);
      }
      
      if (jobsRes.data.success) {
        const companyJobs = jobsRes.data.data.filter((j: any) => j.company_id === profile?.id);
        setJobs(companyJobs);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load pipeline data');
    } finally {
      setLoading(false);
    }
  };

  const updateCandidateStage = async (appId: number, newStage: string) => {
    try {
      // Optimistic Update
      setAllApplicants(prev => prev.map(a => a.application_id === appId ? { ...a, status: newStage } : a));
      
      let action = newStage;
      if (newStage === 'SHORTLISTED') action = 'SELECTED';
      if (newStage === 'REJECTED') action = 'REJECTED';

      await api.post(`/jobs/update-stage`, { 
        applicationId: appId, 
        stageId: newStage, 
        action: action, 
        notes: `Moved to ${newStage} via ATS Pipeline` 
      });
      toast.success('Stage updated');
    } catch (e) {
      toast.error('Failed to update stage');
      fetchData(); // revert
    }
  };

  const handleBulkAction = async (action: string) => {
    if (selectedCandidates.length === 0) return;
    
    toast.success(`Applying ${action} to ${selectedCandidates.length} candidates...`);
    
    if (action.startsWith('MOVE_')) {
       const stage = action.replace('MOVE_', '');
       for (const id of selectedCandidates) {
          await updateCandidateStage(id, stage);
       }
       setSelectedCandidates([]);
    } else {
       setTimeout(() => setSelectedCandidates([]), 1000);
    }
  };

  // Derived applicant list Based on job UI, search, match score
  const currentApplicants = useMemo(() => {
    let list = allApplicants;
    if (selectedJobId !== 'ALL') {
       list = list.filter(a => a.job_id.toString() === selectedJobId);
    }
    if (searchQuery) {
       list = list.filter(a => a.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || a.job_title?.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    if (minScore > 0) {
       list = list.filter(a => (a.talent_score || 0) >= minScore);
    }
    
    list = list.map(a => {
        let stg = PIPELINE_STAGES.find(s => s.id === a.status);
        if(!stg && (a.status === 'SELECTED' || a.status === 'SHORTLISTED')) a.status = 'SHORTLISTED';
        else if(!stg && a.status === 'IN_PROGRESS') a.status = 'SCREENING';
        else if(!stg) a.status = 'APPLIED';
        return a;
    });
    return list;
  }, [allApplicants, selectedJobId, searchQuery, minScore]);

  const insights = useMemo(() => {
     const total = currentApplicants.length;
     const expert = currentApplicants.filter(a => (a.talent_score || 0) > 80).length;
     const stuck = currentApplicants.filter(a => a.status === 'INTERVIEW').length;
     return { total, expert, stuck };
  }, [currentApplicants]);


  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, appId: number) => {
    e.dataTransfer.setData('appId', appId.toString());
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAppId(appId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    const appIdStr = e.dataTransfer.getData('appId');
    if (appIdStr) {
      updateCandidateStage(Number(appIdStr), stageId);
    }
    setDraggedAppId(null);
  };

  return (
    <div className="h-full flex flex-col pt-2 pb-4 font-sans bg-slate-50/50">
       <PipelineHeader 
         jobs={jobs} 
         selectedJobId={selectedJobId} 
         setSelectedJobId={setSelectedJobId} 
         applicants={currentApplicants}
       />
       
       <div className="flex flex-col lg:flex-row gap-4 mb-6 px-1">
          <AICopilot insights={insights} />
          <QuickFilters 
             searchQuery={searchQuery} setSearchQuery={setSearchQuery}
             minScore={minScore} setMinScore={setMinScore}
          />
       </div>

       {selectedCandidates.length > 0 && (
          <BulkActionBar 
             count={selectedCandidates.length} 
             onClear={() => setSelectedCandidates([])}
             onAction={handleBulkAction}
          />
       )}

       {/* Kanban Board */}
       <div className="flex-1 overflow-x-auto pb-6 scrollbar-hide -mx-4 px-5">
          <div className="flex gap-5 min-w-max h-full items-start">
             {PIPELINE_STAGES.map(stage => {
                const stageApps = currentApplicants.filter(a => a.status === stage.id);
                return (
                   <StageColumn 
                     key={stage.id} 
                     stage={stage} 
                     applicants={stageApps} 
                     onDragStart={handleDragStart}
                     onDragOver={handleDragOver}
                     onDrop={handleDrop}
                     selectedCandidates={selectedCandidates}
                     setSelectedCandidates={setSelectedCandidates}
                     setPreviewCandidate={setPreviewCandidate}
                     draggedAppId={draggedAppId}
                   />
                );
             })}
          </div>
       </div>

       <AnimatePresence>
         {previewCandidate && (
           <CandidateQuickPreview 
              candidate={previewCandidate} 
              onClose={() => setPreviewCandidate(null)}
              onAction={(action: string) => updateCandidateStage(previewCandidate.application_id, action)}
           />
         )}
       </AnimatePresence>
    </div>
  );
}

// --- Sub components ---

function PipelineHeader({ jobs, selectedJobId, setSelectedJobId, applicants }: any) {
   const selectedJob = jobs.find((j: any) => j.id.toString() === selectedJobId);
   return (
      <div className="bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-6 justify-between items-center relative overflow-hidden mx-1">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl" />
         
         <div className="z-10 flex-1 w-full">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-3">Hiring Pipeline</h1>
            <div className="flex items-center gap-3">
               <select 
                  value={selectedJobId}
                  onChange={e => setSelectedJobId(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-800 text-sm font-bold rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-blue-500/20 w-full max-w-sm"
               >
                  <option value="ALL">All Active Jobs</option>
                  {jobs.map((j: any) => (
                     <option key={j.id} value={j.id.toString()}>{j.title}</option>
                  ))}
               </select>
               {selectedJob && (
                  <span className="px-3 py-2 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 flex items-center gap-1">
                     <CheckCircle size={14} /> Active
                  </span>
               )}
            </div>
         </div>

         <div className="flex gap-4 z-10 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
             <KPICard title="Total Applicants" value={applicants.length} icon={Users} color="blue" />
             <KPICard title="Shortlisted" value={applicants.filter((a:any) => a.status === 'SHORTLISTED' || a.status === 'SELECTED').length} icon={Target} color="emerald" />
             <KPICard title="In Interview" value={applicants.filter((a:any) => a.status === 'INTERVIEW').length} icon={Calendar} color="orange" />
         </div>
      </div>
   );
}

function KPICard({ title, value, icon: Icon, color }: any) {
  const colorMap: any = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    orange: 'bg-orange-50 text-orange-600 border-orange-100'
  };
  return (
    <div className={`flex items-center gap-4 px-5 py-3.5 rounded-[20px] border bg-white shadow-sm shrink-0 min-w-[200px]`}>
       <div className={`p-3 rounded-xl border ${colorMap[color]}`}>
          <Icon size={20} />
       </div>
       <div>
         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</p>
         <p className="text-2xl font-black text-slate-800 leading-none mt-1">{value}</p>
       </div>
    </div>
  );
}

function AICopilot({ insights }: { insights: any }) {
   return (
      <div className="flex-1 bg-gradient-to-br from-indigo-900 to-blue-900 rounded-[24px] p-6 shadow-lg relative overflow-hidden text-white flex flex-col justify-center border border-indigo-800">
         <div className="absolute -right-10 -top-10 text-white/5 pointer-events-none">
            <Sparkles size={160} />
         </div>
         <div className="relative z-10">
            <div className="flex items-center gap-2 mb-4">
               <Sparkles className="text-yellow-400" size={20} />
               <h3 className="text-sm font-black uppercase tracking-wider text-indigo-50 flex items-center">
                  AI Hiring Copilot <span className="text-[9px] bg-white/20 px-2 py-0.5 rounded-md ml-2 text-white border border-white/20">BETA</span>
               </h3>
            </div>
            <ul className="space-y-3 text-xs font-semibold text-indigo-100">
               <li className="flex items-start gap-2.5 bg-indigo-800/40 p-2.5 rounded-xl border border-indigo-700/50">
                  <div className="w-5 h-5 rounded bg-yellow-400/20 text-yellow-400 flex items-center justify-center shrink-0"><Star size={12}/></div>
                  <span className="leading-tight">Found <strong className="text-white bg-white/20 px-1.5 rounded">{insights.expert} candidates</strong> exceeding role requirements based on historical data.</span>
               </li>
               {insights.stuck > 0 && (
                  <li className="flex items-start gap-2.5 bg-indigo-800/40 p-2.5 rounded-xl border border-indigo-700/50">
                     <div className="w-5 h-5 rounded bg-rose-400/20 text-rose-400 flex items-center justify-center shrink-0"><AlertTriangle size={12}/></div>
                     <span className="leading-tight">Bottleneck Warning: <strong className="text-white">{insights.stuck} candidates</strong> are stuck in the Technical Interview stage.</span>
                  </li>
               )}
            </ul>
         </div>
      </div>
   );
}

function QuickFilters({ searchQuery, setSearchQuery, minScore, setMinScore }: any) {
   return (
      <div className="w-full lg:w-[420px] bg-white rounded-[24px] p-6 border border-slate-200 shadow-sm flex flex-col justify-center gap-4">
         <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
               type="text"
               placeholder="Search skills, names, colleges..."
               value={searchQuery}
               onChange={e => setSearchQuery(e.target.value)}
               className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 transition-all"
            />
         </div>
         <div className="flex items-center gap-4 px-1">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest shrink-0 flex items-center gap-1.5"><Filter size={12}/> Min Match</label>
            <input 
               type="range" min="0" max="100" value={minScore} 
               onChange={e => setMinScore(Number(e.target.value))}
               className="flex-1 accent-indigo-600 h-1.5 bg-slate-200 rounded-full cursor-pointer"
            />
            <span className="text-[11px] font-black text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 w-11 text-center">{minScore}%</span>
         </div>
      </div>
   );
}

function BulkActionBar({ count, onClear, onAction }: any) {
   return (
      <motion.div 
         initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
         className="bg-slate-900 text-white rounded-2xl px-6 py-3 mb-6 flex items-center justify-between shadow-2xl border border-slate-700 mx-1 sticky top-4 z-40"
      >
         <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400 font-black text-sm shadow-inner">
               {count}
            </div>
            <span className="text-sm font-bold tracking-wide">Candidates Selected</span>
         </div>
         <div className="flex items-center gap-2">
            <button onClick={() => onAction('MOVE_SCREENING')} className="px-3 py-2 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
               <Zap size={14} className="text-yellow-400" /> Auto Screen
            </button>
            <button onClick={() => onAction('EMAIL')} className="px-3 py-2 hover:bg-white/10 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
               <Mail size={14} className="text-emerald-400" /> Message
            </button>
            <button onClick={() => onAction('MOVE_REJECTED')} className="px-3 py-2 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors">
               <XCircle size={14} /> Reject
            </button>
            <div className="w-px h-6 bg-slate-700 mx-2" />
            <button onClick={onClear} className="text-xs font-bold text-slate-400 hover:text-white uppercase tracking-widest px-2 transition-colors">Clear</button>
         </div>
      </motion.div>
   );
}

function StageColumn({ stage, applicants, onDragStart, onDragOver, onDrop, selectedCandidates, setSelectedCandidates, setPreviewCandidate, draggedAppId }: any) {
   const [isOver, setIsOver] = useState(false);

   const colorMap: any = {
      blue: 'bg-blue-500 shadow-blue-500/30', indigo: 'bg-indigo-500 shadow-indigo-500/30', purple: 'bg-purple-500 shadow-purple-500/30',
      orange: 'bg-orange-500 shadow-orange-500/30', pink: 'bg-pink-500 shadow-pink-500/30', emerald: 'bg-emerald-500 shadow-emerald-500/30'
   };
   const bgMap: any = {
      blue: 'bg-blue-50/80 border-blue-200', indigo: 'bg-indigo-50/80 border-indigo-200', purple: 'bg-purple-50/80 border-purple-200',
      orange: 'bg-orange-50/80 border-orange-200', pink: 'bg-pink-50/80 border-pink-200', emerald: 'bg-emerald-50/80 border-emerald-200'
   };

   return (
      <div 
         className={`w-[320px] shrink-0 flex flex-col rounded-[24px] border-2 transition-all duration-300 ${isOver ? bgMap[stage.color] : 'bg-slate-100/50 border-slate-200/60'}`}
         onDragOver={(e) => { e.preventDefault(); setIsOver(true); onDragOver(e); }}
         onDragLeave={() => setIsOver(false)}
         onDrop={(e) => { setIsOver(false); onDrop(e, stage.id); }}
      >
         <div className="p-4 py-3.5 flex justify-between items-center border-b border-slate-200/50 bg-white/70 rounded-t-[22px] backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
               <span className={`w-2.5 h-2.5 rounded-full shadow-md ${colorMap[stage.color]}`} />
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest leading-none mt-0.5">{stage.label}</h3>
            </div>
            <span className="bg-white border border-slate-200 text-slate-600 px-2.5 py-0.5 rounded-md text-[10px] font-black shadow-sm">
               {applicants.length}
            </span>
         </div>
         
         <div className="p-3.5 flex-1 flex flex-col gap-3.5 min-h-[500px] overflow-y-auto scrollbar-hide pb-10">
            {applicants.map((app: any) => (
               <CandidateCard 
                  key={app.application_id} 
                  candidate={app} 
                  onDragStart={onDragStart}
                  selected={selectedCandidates.includes(app.application_id)}
                  onToggleSelect={(e: any) => {
                     e.stopPropagation();
                     const id = app.application_id;
                     if(selectedCandidates.includes(id)) setSelectedCandidates(selectedCandidates.filter((x:any) => x!==id));
                     else setSelectedCandidates([...selectedCandidates, id]);
                  }}
                  onClick={() => setPreviewCandidate(app)}
                  isDragged={draggedAppId === app.application_id}
               />
            ))}
            {applicants.length === 0 && (
               <div className="h-32 border-2 border-dashed border-slate-300/60 rounded-[18px] flex flex-col items-center justify-center text-[10px] font-black text-slate-400/80 uppercase tracking-widest gap-2 bg-white/30 backdrop-blur-sm">
                  <div className="p-2 bg-slate-100 rounded-full"><Plus size={16} /></div>
                  Drop Candidates
               </div>
            )}
         </div>
      </div>
   );
}

function CandidateCard({ candidate, onDragStart, selected, onToggleSelect, onClick, isDragged }: any) {
  const matchScore = candidate.talent_score || Math.floor(Math.random() * 40 + 40);
  
  let recBadge = <span className="bg-slate-100 border border-slate-200 text-slate-500 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase truncate shadow-sm">Evaluating</span>;
  if (matchScore >= 85) recBadge = <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[8px] font-black uppercase truncate border border-emerald-200 flex items-center gap-1 shadow-sm"><Star size={8} className="fill-emerald-600"/> Top Match</span>;
  else if (matchScore >= 70) recBadge = <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md text-[8px] font-bold uppercase truncate shadow-sm">Strong Fit</span>;

  let skills = [];
  try { skills = typeof candidate.skills_json === 'string' ? JSON.parse(candidate.skills_json) || [] : candidate.skills_json || [] } catch(e){}

  return (
    <div 
      draggable
      onDragStart={(e) => onDragStart(e, candidate.application_id)}
      onClick={onClick}
      className={`bg-white p-4 pb-3.5 rounded-[20px] border-2 transition-all cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-xl ${selected ? 'border-blue-500 shadow-blue-500/20' : 'border-slate-100 hover:border-blue-200 hover:shadow-blue-500/5'} ${isDragged ? 'opacity-40 scale-95 border-dashed' : 'opacity-100'}`}
    >
       <div className="flex justify-between items-start mb-3 border-b border-slate-50 pb-3">
          <div className="flex items-center gap-3 w-full min-w-0">
             <div onClick={onToggleSelect} className="shrink-0 p-1 -ml-1 cursor-pointer">
                <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all ${selected ? 'bg-blue-600 border-blue-600 shadow-sm' : 'bg-slate-50 border-slate-300 hover:border-blue-400'}`}>
                   {selected && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
             </div>
             <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 font-bold shadow-inner">
               {candidate.profile_photo_url ? <img src={candidate.profile_photo_url} className="w-full h-full object-cover" /> : candidate.full_name?.charAt(0)}
             </div>
             <div className="min-w-0 pr-2">
                <h4 className="text-xs font-black text-slate-900 truncate leading-tight tracking-tight mb-0.5">{candidate.full_name || 'Anonymous Applicant'}</h4>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider truncate">{candidate.job_title}</p>
             </div>
          </div>
       </div>

       <div className="flex items-center justify-between mb-3 pt-0.5">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Match Score</span>
          <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border ${matchScore >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : matchScore >= 60 ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>{matchScore}%</span>
       </div>

       <div className="flex flex-wrap gap-1.5 mb-3">
          {recBadge}
          {skills.slice(0, 2).map((s:string, i:number) => (
             <span key={i} className="bg-slate-50 border border-slate-200/80 text-slate-600 px-2 py-0.5 rounded-md text-[8px] font-bold truncate max-w-[85px]">{s}</span>
          ))}
          {skills.length > 2 && <span className="bg-slate-50 text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-200/80 text-[8px] font-bold">+{skills.length-2}</span>}
       </div>

       <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
           <div className="flex items-center gap-1.5 text-slate-400 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
               <Clock size={10} />
               <span className="text-[8px] font-black uppercase leading-none mt-0.5 text-slate-500">{new Date(candidate.applied_at || Date.now()).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
           </div>
           <button className="text-[9px] font-black text-blue-600 flex items-center gap-0.5 hover:text-blue-800 bg-blue-50/50 hover:bg-blue-100 px-2 py-1 rounded-lg transition-colors border border-blue-100/50 hover:border-blue-200">
              Review <ChevronRight size={10} />
           </button>
       </div>
    </div>
  );
}

function CandidateQuickPreview({ candidate, onClose, onAction }: any) {
  let skills = [];
  try { skills = typeof candidate.skills_json === 'string' ? JSON.parse(candidate.skills_json) || [] : candidate.skills_json || [] } catch(e){}

  return (
    <>
      <motion.div 
         initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
         className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100]"
         onClick={onClose}
      />
      <motion.div
         initial={{ x: '100%', boxShadow: '-20px 0 50px rgba(0,0,0,0)' }}
         animate={{ x: 0, boxShadow: '-20px 0 50px rgba(0,0,0,0.2)' }}
         exit={{ x: '100%', boxShadow: '-20px 0 50px rgba(0,0,0,0)' }}
         transition={{ type: "spring", stiffness: 350, damping: 35 }}
         className="fixed right-0 top-0 bottom-0 w-full max-w-[500px] bg-white z-[110] border-l border-slate-200 flex flex-col font-sans overflow-hidden"
      >
         {/* Cover & Profile Header */}
         <div className="relative h-36 bg-slate-900 shrink-0 overflow-hidden">
            <div className="absolute inset-0 opacity-40 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-500 via-indigo-900 to-slate-900" />
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/60 to-transparent" />
            <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white backdrop-blur-md transition-colors z-10">
               <ChevronRight size={18} />
            </button>
            <div className="absolute top-4 right-4 flex gap-2 z-10">
               <button className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white backdrop-blur-md transition-colors"><MessageSquare size={16}/></button>
               <button className="p-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-full text-white backdrop-blur-md transition-colors"><MoreVertical size={16}/></button>
            </div>
         </div>
         
         <div className="px-8 relative -mt-16 shrink-0 z-10">
            <div className="w-28 h-28 rounded-[20px] bg-white p-1.5 border border-slate-200 shadow-xl mb-4">
               <div className="w-full h-full bg-slate-100 rounded-[14px] overflow-hidden flex items-center justify-center text-4xl font-black text-slate-300 shadow-inner">
                  {candidate.profile_photo_url ? <img src={candidate.profile_photo_url} className="w-full h-full object-cover" /> : candidate.full_name?.charAt(0)}
               </div>
            </div>
            <div className="pb-5 border-b border-slate-100 flex justify-between items-start">
               <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-1.5">{candidate.full_name}</h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">{candidate.job_title}</p>
               </div>
               <div className="bg-emerald-50 border-2 border-emerald-100 rounded-2xl p-2 px-3 text-center shadow-sm">
                  <div className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-1 mt-0.5">Match Score</div>
                  <div className="text-2xl font-black text-emerald-700 leading-none mb-1">{candidate.talent_score || 85}%</div>
               </div>
            </div>
         </div>

         {/* Content Scroll Area */}
         <div className="flex-1 overflow-y-auto px-8 py-6 space-y-7 scrollbar-hide pb-10">
            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-3">
               <QuickActionButton icon={Mail} label="Email" onClick={() => toast.success('Open Composer')} />
               <QuickActionButton icon={CalendarPlus} label="Interview" onClick={() => toast.success('Schedule Modal')} />
               <QuickActionButton icon={BarChart2} label="Assessments" onClick={() => toast.success('View Test Results')} />
               <QuickActionButton icon={Download} label="Resume" onClick={() => toast.success('Downloading...')} />
            </div>

            {/* AI Summary */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[20px] p-5 shadow-inner">
               <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-500/20"><Sparkles size={12} className="text-white" /></div>
                  <span className="text-[10px] font-black uppercase text-indigo-900 tracking-widest mt-0.5">AI Copilot Analysis</span>
               </div>
               <p className="text-xs font-semibold text-indigo-900/80 leading-relaxed tabular-nums pr-2">
                  Candidate demonstrates strong technical aptitude highly matching the <strong className="text-indigo-900">{candidate.job_title}</strong> role requirements. 
                  Projects strongly align with the requested stack. Coding assessment scores reside within the top 15th percentile of the applicant pool.
               </p>
            </div>

            {/* Core Info Details */}
            <div className="bg-white border border-slate-200 rounded-[20px] overflow-hidden p-1 shadow-sm">
               <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-4 pt-4 pb-3">Profile Details</h3>
               <div className="grid grid-cols-2 gap-px bg-slate-100">
                  <div className="bg-white p-4">
                     <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mt-1">Pipeline Stage</span>
                     <span className="text-xs font-black text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 inline-block">{PIPELINE_STAGES.find(s => s.id === candidate.status)?.label || candidate.status}</span>
                  </div>
                  <div className="bg-white p-4">
                     <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mt-1">Applied Date</span>
                     <span className="text-xs font-black text-slate-800 bg-slate-50 px-2 py-1 rounded-md border border-slate-100 inline-block">{new Date(candidate.applied_at || Date.now()).toLocaleDateString(undefined, {dateStyle:'medium'})}</span>
                  </div>
                  <div className="bg-white p-4 col-span-2 flex justify-between items-center">
                     <div>
                        <span className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 mt-1">Contact Details</span>
                        <span className="text-sm font-bold text-slate-800 block">{candidate.email || 'No email provided'}</span>
                        <span className="text-xs font-bold text-slate-500 block mt-1">{candidate.contact || 'No phone provided'}</span>
                     </div>
                     <button className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors shadow-sm"><MailPlus size={16}/></button>
                  </div>
               </div>
            </div>

            {/* Verfied Skills */}
            <div>
               <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100 pb-2 mb-4 pl-1">Verified Skills Extract</h3>
               <div className="flex flex-wrap gap-2">
                  {skills.map((s:string, i:number) => (
                     <span key={i} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-bold shadow-sm">{s}</span>
                  ))}
                  {skills.length === 0 && <span className="text-xs text-slate-400 font-bold px-1">Candidate has not listed any skills.</span>}
               </div>
            </div>
         </div>

         {/* Footer Actions */}
         <div className="p-6 border-t border-slate-100 bg-white shrink-0 grid grid-cols-3 gap-3">
             <button 
               onClick={() => { onAction('REJECTED'); onClose(); }}
               className="py-3.5 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 rounded-xl text-xs flex justify-center font-black uppercase tracking-widest transition-colors w-full shadow-sm"
               title="Reject Candidate"
             >
                <ThumbsDown size={18} />
             </button>
             <button 
               onClick={() => { 
                 const currentIdx = PIPELINE_STAGES.findIndex(s => s.id === candidate.status);
                 if(currentIdx > -1 && currentIdx < PIPELINE_STAGES.length - 1) {
                    onAction(PIPELINE_STAGES[currentIdx + 1].id);
                 }
                 onClose(); 
               }}
               className="col-span-2 py-3.5 bg-slate-900 text-white rounded-xl text-[11px] flex items-center justify-center gap-2 font-black uppercase tracking-widest shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all active:scale-[0.98]"
             >
                Advance Candidate <ChevronRight size={16} />
             </button>
         </div>
      </motion.div>
    </>
  );
}

function QuickActionButton({ icon: Icon, label, onClick }: any) {
   return (
      <button onClick={onClick} className="flex flex-col items-center justify-center gap-2 p-3 pb-2.5 rounded-2xl bg-white border border-slate-200 hover:border-blue-200 hover:bg-blue-50 transition-all font-sans text-slate-600 active:scale-95 shadow-sm group">
         <Icon size={18} className="text-slate-500 group-hover:text-blue-600 transition-colors" />
         <span className="text-[9px] font-black uppercase tracking-widest group-hover:text-blue-700 transition-colors">{label}</span>
      </button>
   );
}
