import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { 
  Search, Filter, Plus, MoreVertical, 
  Star, Clock, MessageSquare, CheckCircle, 
  XCircle, ChevronRight, GripVertical,
  ShieldAlert, Sparkles, Award, UserCheck, Check,
  ChevronLeft, RefreshCw, FilterX, HelpCircle, AlertTriangle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CandidateDetailModal } from '../../components/company/CandidateDetailModal.tsx';

const STAGES = [
  { id: 'APPLIED', label: 'Applied', color: 'blue', desc: 'New submissions' },
  { id: 'TESTING', label: 'Test', color: 'purple', desc: 'Skill assessments' },
  { id: 'INTERVIEW', label: 'Technical Interview', color: 'orange', desc: 'AI/Live panel' },
  { id: 'HR', label: 'HR Round', color: 'indigo', desc: 'Culture & Offer' },
  { id: 'SELECTED', label: 'Selected', color: 'emerald', desc: 'Offer extended' }
];

export function PipelineBoard() {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Advanced Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [minTalentScore, setMinTalentScore] = useState<number>(0);
  const [selectedJob, setSelectedJob] = useState<string>('ALL');
  const [integrityFilter, setIntegrityFilter] = useState<'ALL' | 'CLEAN' | 'FLAGGED'>('ALL');
  const [sortBy, setSortBy] = useState<'SCORE_DESC' | 'SCORE_ASC' | 'DATE_NEWEST'>('SCORE_DESC');

  useEffect(() => {
    if (user?.id) {
      fetchApplicants();
    }
  }, [user?.id]);

  const fetchApplicants = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/analytics/employer/${user.id}`);
      if (res.data.success) {
        setApplicants(res.data.data.applicants || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const updateCandidateStatus = async (appId: number, newStageId: string) => {
    // Map stage selected back to database status formats if required
    let statusValue = newStageId;
    if (newStageId === 'SELECTED') {
      statusValue = 'SHORTLISTED';
    }
    
    try {
      // Optimistic local state update to make drag/action instant
      setApplicants(prev => prev.map(app => {
        if (app.id === appId) {
          return { ...app, status: statusValue };
        }
        return app;
      }));
      
      await api.post(`/jobs/update-stage`, { 
        applicationId: appId, 
        status: statusValue, 
        action: statusValue, 
        notes: `Moved to ${newStageId} via Interactive Pipeline Board` 
      });
      // Silent refresh to ensure sync
      const res = await api.get(`/analytics/employer/${user?.id}`);
      if (res.data.success) {
        setApplicants(res.data.data.applicants || []);
      }
    } catch (e) {
      console.error(e);
      // Revert if failed
      fetchApplicants();
    }
  };

  // Get unique jobs for filter dropdown
  const uniqueJobs = React.useMemo(() => {
    const jobs = new Set<string>();
    applicants.forEach(app => {
      if (app.job_title) jobs.add(app.job_title);
    });
    return Array.from(jobs);
  }, [applicants]);

  // Apply search query, min score, selected job, and integrity checks
  const filteredApplicants = React.useMemo(() => {
    let result = [...applicants];

    // Search Box
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(app => 
        (app.full_name || '').toLowerCase().includes(query) ||
        (app.job_title || '').toLowerCase().includes(query) ||
        (app.email || '').toLowerCase().includes(query)
      );
    }

    // Min Talent Score filter
    if (minTalentScore > 0) {
      result = result.filter(app => (app.talent_score || 0) >= minTalentScore);
    }

    // Job Title dropdown filter
    if (selectedJob !== 'ALL') {
      result = result.filter(app => app.job_title === selectedJob);
    }

    // Integrity Violations filter
    if (integrityFilter === 'CLEAN') {
      result = result.filter(app => !(app.latest_test_violations > 0));
    } else if (integrityFilter === 'FLAGGED') {
      result = result.filter(app => app.latest_test_violations > 0);
    }

    // Apply Sorting logic
    if (sortBy === 'SCORE_DESC') {
      result.sort((a, b) => (b.talent_score || 0) - (a.talent_score || 0));
    } else if (sortBy === 'SCORE_ASC') {
      result.sort((a, b) => (a.talent_score || 0) - (b.talent_score || 0));
    } else if (sortBy === 'DATE_NEWEST') {
      result.sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());
    }

    return result;
  }, [applicants, searchQuery, minTalentScore, selectedJob, integrityFilter, sortBy]);

  // Group candidate status to target stages for board visualization
  const getCandidatesByStage = (stageId: string) => {
    return filteredApplicants.filter(app => {
      if (stageId === 'APPLIED' && (app.status === 'APPLIED' || !app.status)) return true;
      if (stageId === 'TESTING' && app.status === 'TESTING') return true;
      if (stageId === 'INTERVIEW' && app.status === 'INTERVIEW') return true;
      if (stageId === 'HR' && app.status === 'HR') return true;
      if (stageId === 'SELECTED' && app.status === 'SHORTLISTED') return true;
      return app.status === stageId;
    });
  };

  // Compute operational metric aggregates
  const totalInPipeline = filteredApplicants.length;
  const expertMatchCount = filteredApplicants.filter(app => (app.talent_score || 0) >= 80).length;
  const flaggedCount = filteredApplicants.filter(app => (app.latest_test_violations || 0) > 0).length;
  const pendingTesting = filteredApplicants.filter(app => app.status === 'TESTING' || app.status === 'APPLIED').length;

  const resetFilters = () => {
    setMinTalentScore(0);
    setSelectedJob('ALL');
    setIntegrityFilter('ALL');
    setSortBy('SCORE_DESC');
    setSearchQuery('');
  };

  return (
    <div className="h-full flex flex-col space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white/70 backdrop-blur-md p-6 rounded-3xl border border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 px-2.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-wider">Enterprise Console</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Real-time status sync</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight mt-1">Hiring Pipeline</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-0.5">Manage and track your candidates across interactive recruitment stages.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto">
          <div className="relative flex-1 md:w-80 group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Search by name, role, email..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all shadow-inner"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold text-xs"
              >
                Clear
              </button>
            )}
          </div>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all border ${
              showFilters || minTalentScore > 0 || selectedJob !== 'ALL' || integrityFilter !== 'ALL'
              ? 'bg-blue-50 border-blue-200 text-blue-600 shadow-sm' 
              : 'bg-white border-slate-150 text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Filter size={16} />
            Filters {(minTalentScore > 0 || selectedJob !== 'ALL' || integrityFilter !== 'ALL') ? '(Active)' : ''}
          </button>

          <button 
            onClick={fetchApplicants}
            disabled={loading}
            className="p-3 bg-white border border-slate-150 rounded-2xl text-slate-500 hover:text-blue-600 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50"
            title="Refresh pipeline data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Strategic Operational KPI Widgets */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100/90 rounded-3xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Active Portfolio</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-slate-900">{totalInPipeline}</span>
              <span className="text-[10px] text-slate-400 font-black">STUDENTS</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-blue-50/70 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100/30">
            <UserCheck size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-100/90 rounded-3xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Expert Fits (≥80%)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-emerald-600">{expertMatchCount}</span>
              <span className="text-[10px] text-slate-400 font-black">CANDIDATES</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-emerald-50/70 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100/30 animate-pulse">
            <Award size={18} className="fill-emerald-100/20" />
          </div>
        </div>

        <div className="bg-white border border-slate-100/90 rounded-3xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Testing Pipeline</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-black text-violet-600">{pendingTesting}</span>
              <span className="text-[10px] text-slate-400 font-black">AWAITING</span>
            </div>
          </div>
          <div className="w-10 h-10 bg-violet-50/70 rounded-2xl flex items-center justify-center text-violet-600 border border-violet-100/30">
            <Sparkles size={18} />
          </div>
        </div>

        <div className="bg-white border border-slate-100/90 rounded-3xl p-5 shadow-sm flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Integrity Escapes</span>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black ${flaggedCount > 0 ? 'text-rose-500' : 'text-slate-800'}`}>{flaggedCount}</span>
              <span className="text-[10px] text-slate-400 font-black">FLAGGED</span>
            </div>
          </div>
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border transition-all ${
            flaggedCount > 0 ? 'bg-rose-50 text-rose-500 border-rose-250 animate-bounce' : 'bg-slate-50 text-slate-400 border-slate-100'
          }`}>
            <ShieldAlert size={18} />
          </div>
        </div>
      </div>

      {/* Advanced Filter Panel Collapsible */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-slate-50 border border-slate-100 p-6 rounded-3xl mb-4 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-250/20 pb-3">
                <span className="text-xs font-black uppercase text-slate-800 tracking-wider flex items-center gap-1.5">
                  <Filter className="text-blue-600" size={14} /> Refine Applicant Board View
                </span>
                <button 
                  onClick={resetFilters}
                  className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500 flex items-center gap-1"
                >
                  <FilterX size={12} /> Clear Filters
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-1 text-xs">
                {/* Score Slider */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Min Talent Match: {minTalentScore}%</label>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={minTalentScore}
                    onChange={(e) => setMinTalentScore(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer h-1.5 bg-slate-200 rounded-lg appearance-none"
                  />
                  <div className="flex justify-between text-[9px] text-slate-400 font-semibold uppercase">
                    <span>Any Match</span>
                    <span>Expert (80+)</span>
                  </div>
                </div>

                {/* Job Dropdown */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Job Vacancy</label>
                  <select 
                    value={selectedJob} 
                    onChange={(e) => setSelectedJob(e.target.value)}
                    className="bg-white border border-slate-200 rounded-xl p-2 px-3 text-xs font-bold outline-none text-slate-700 shadow-sm focus:border-blue-500/30"
                  >
                    <option value="ALL">All Associated Jobs ({uniqueJobs.length})</option>
                    {uniqueJobs.map(job => (
                      <option key={job} value={job}>{job}</option>
                    ))}
                  </select>
                </div>

                {/* Integrity Filter Buttons */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Trust & Anti-Cheat Status</label>
                  <div className="grid grid-cols-3 gap-1.5 bg-white p-1 rounded-xl border border-slate-200 shadow-sm">
                    {(['ALL', 'CLEAN', 'FLAGGED'] as const).map(mode => (
                      <button
                        key={mode}
                        onClick={() => setIntegrityFilter(mode)}
                        className={`py-1 rounded-lg text-[9px] font-black uppercase transition-all ${
                          integrityFilter === mode 
                          ? 'bg-slate-900 text-white shadow-sm' 
                          : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {mode === 'ALL' ? 'All' : mode === 'CLEAN' ? 'Clean' : 'Flagged'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sorting Dropdown */}
                <div className="space-y-1.5 flex flex-col">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Order Candidates By</label>
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="bg-white border border-slate-200 rounded-xl p-2 px-3 text-xs font-bold outline-none text-slate-700 shadow-sm focus:border-blue-500/30"
                  >
                    <option value="SCORE_DESC">Score: Good to Low</option>
                    <option value="SCORE_ASC">Score: Low to Good</option>
                    <option value="DATE_NEWEST">Application: Newest First</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-6 -mx-4 px-4 scrollbar-hide">
        <div className="flex gap-6 min-w-max h-full">
          {STAGES.map((stage) => {
            const candidates = getCandidatesByStage(stage.id);
            return (
              <div key={stage.id} className="w-80 flex flex-col gap-3 group/col">
                {/* Column Title Block */}
                <div className="flex items-center justify-between px-2.5 py-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      stage.color === 'blue' ? 'bg-blue-500' :
                      stage.color === 'purple' ? 'bg-purple-500' :
                      stage.color === 'orange' ? 'bg-orange-500 shadow-orange-200' :
                      stage.color === 'indigo' ? 'bg-indigo-500' :
                      'bg-emerald-500 bg-emerald-300'
                    }`} />
                    <div>
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">{stage.label}</h3>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none mt-0.5">{stage.desc}</p>
                    </div>
                  </div>
                  <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold shadow-inner border border-slate-200/40">
                    {candidates.length}
                  </span>
                </div>

                {/* Column Body Container */}
                <div className="flex-1 bg-slate-50/50 rounded-[32px] border border-slate-150 p-4 space-y-4 overflow-y-auto max-h-[calc(100vh-340px)] min-h-[380px] scrollbar-hide select-none transition-colors hover:bg-slate-50">
                  {candidates.map((candidate) => (
                    <CandidateCard 
                      key={candidate.id} 
                      candidate={candidate} 
                      onClick={() => setSelectedCandidate(candidate)}
                      onMove={(newStatus) => updateCandidateStatus(candidate.id, newStatus)}
                    />
                  ))}
                  
                  {candidates.length === 0 && (
                    <div className="h-44 border-2 border-dashed border-slate-200 rounded-[28px] flex flex-col items-center justify-center p-6 text-center">
                      <HelpCircle size={22} className="text-slate-300 mb-2 animate-bounce" />
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Clear Horizon</p>
                      <p className="text-[8px] text-slate-400 font-medium uppercase leading-tight max-w-[140px]">No active candidate at this stage right now</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
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

function CandidateCard({ candidate, onClick, onMove }: { candidate: any, onClick: () => void, onMove: (status: string) => void }) {
  const [showMoveMenu, setShowMoveMenu] = useState(false);

  // Compute UI recommendation badges based on computed talent index
  const matchPercent = Math.round(candidate.talent_score || 0);
  
  const getAIRecommendation = () => {
    if (matchPercent >= 85) return { text: 'Expert Match 🚀', style: 'bg-emerald-50 text-emerald-700 border-emerald-100 font-extrabold shadow-sm shadow-emerald-50' };
    if (matchPercent >= 70) return { text: 'Proficient Match ⭐', style: 'bg-indigo-50 text-indigo-700 border-indigo-100 font-extrabold' };
    if (matchPercent >= 50) return { text: 'Capable Target', style: 'bg-blue-50 text-blue-700 border-blue-100 font-semibold' };
    return { text: 'Developing Potential', style: 'bg-slate-50 text-slate-500 border-slate-100 font-medium' };
  };

  const rec = getAIRecommendation();

  // Highlight warnings on violations
  const violationCount = candidate.latest_test_violations || 0;

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -3 }}
      transition={{ duration: 0.2 }}
      className={`bg-white p-5 rounded-3xl border ${
        violationCount > 0 
        ? 'border-red-200/70 hover:border-red-400 shadow-sm hover:shadow-red-500/5' 
        : 'border-slate-100 hover:border-blue-300 hover:shadow-xl hover:shadow-blue-500/5'
      } transition-all group/card cursor-pointer relative flex flex-col justify-between`}
      onClick={onClick}
    >
      <div>
        {/* Top line Info */}
        <div className="flex justify-between items-start mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-blue-600 font-black overflow-hidden shrink-0 shadow-inner group-hover/card:scale-105 transition-transform">
              {candidate.profile_photo_url ? (
                <img src={candidate.profile_photo_url} className="w-full h-full object-cover" />
              ) : (
                candidate.full_name?.[0]?.toUpperCase() || 'C'
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight leading-loose line-clamp-1">{candidate.full_name}</h4>
              <p className="text-[8px] font-extrabold text-indigo-650 uppercase tracking-widest line-clamp-1">{candidate.job_title}</p>
            </div>
          </div>
          
          <div className="relative">
            <button 
              className="p-1 hover:bg-slate-55 bg-slate-50/50 rounded-lg text-slate-400 hover:text-slate-700 transition-all border border-slate-100 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setShowMoveMenu(!showMoveMenu);
              }}
              title="Quick advance stage"
            >
              <MoreVertical size={13} />
            </button>
            
            {/* Action Popup Submenu */}
            <AnimatePresence>
              {showMoveMenu && (
                <motion.div 
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 5 }}
                  className="absolute right-0 mt-1 w-44 bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-800 z-30 p-1.5 overflow-hidden"
                  onClick={(e) => e.stopPropagation()}
                >
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-2.5 py-1 pt-1.5 border-b border-white/5 mb-1">Advance Stage</p>
                  {STAGES.map(s => (
                    <button 
                      key={s.id}
                      onClick={() => {
                        onMove(s.id);
                        setShowMoveMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-[9px] font-bold text-slate-200 hover:bg-white/10 hover:text-white rounded-lg transition-all flex items-center justify-between group/menuitem"
                    >
                      {s.label}
                      <ChevronRight size={10} className="text-slate-400 opacity-0 group-hover/menuitem:opacity-100 transition-all" />
                    </button>
                  ))}
                  <div className="mt-1.5 pt-1 border-t border-white/5">
                    <button 
                      onClick={() => {
                        onMove('REJECTED');
                        setShowMoveMenu(false);
                      }}
                      className="w-full text-left px-2 py-1.5 text-[9px] font-black text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                    >
                      Instant Rejection
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* AI scoring Pill and Security violations */}
        <div className="flex flex-col gap-1.5 mb-3">
          <div className={`px-2 py-0.5 rounded-lg text-[8px] border shrink-0 text-center uppercase tracking-wider ${rec.style}`}>
            {rec.text} ({matchPercent}%)
          </div>

          {violationCount > 0 && (
            <div className="flex items-center gap-1 bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase border border-rose-100 animate-pulse">
              <ShieldAlert size={10} /> Flagged: {violationCount} Violations
            </div>
          )}
        </div>

        {/* Skill visual tags */}
        <div className="flex flex-wrap gap-1 mb-3 pt-1">
          {(() => {
            try {
              const skills = typeof candidate.skills_json === 'string' ? JSON.parse(candidate.skills_json) : (candidate.skills_json || []);
              return skills.slice(0, 3).map((s: string, idx: number) => (
                <span key={idx} className="px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded-md text-[8px] text-slate-500 font-bold uppercase truncate max-w-[90px]">
                  {s}
                </span>
              ));
            } catch (e) {
              return null;
            }
          })()}
        </div>
      </div>

      {/* Speed advance controls at bottom of candidate item */}
      <div className="pt-3 border-t border-slate-50 flex items-center justify-between mt-auto bg-slate-50/20 px-1 rounded-b-xl">
        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase tracking-widest">
          <Clock size={10} />
          <span>{candidate.applied_at ? new Date(candidate.applied_at).toLocaleDateString() : 'Recent'}</span>
        </div>
        
        {/* Speed Action buttons to advance status with single tap */}
        <div className="flex items-center gap-1">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMove('REJECTED');
            }}
            className="p-1 hover:bg-rose-50 text-slate-350 hover:text-rose-600 rounded-lg transition-colors border border-transparent hover:border-rose-100"
            title="Reject Candidate"
          >
            <XCircle size={14} />
          </button>
          
          {candidate.status !== 'SHORTLISTED' && candidate.status !== 'SELECTED' && (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                // Determine next state in sequence
                const currentIdx = STAGES.findIndex(s => {
                  if (s.id === 'APPLIED' && (candidate.status === 'APPLIED' || !candidate.status)) return true;
                  if (s.id === 'SELECTED' && candidate.status === 'SHORTLISTED') return true;
                  return s.id === candidate.status;
                });
                if (currentIdx !== -1 && currentIdx < STAGES.length - 1) {
                  onMove(STAGES[currentIdx + 1].id);
                }
              }}
              className="p-1 bg-blue-50 hover:bg-blue-600 text-blue-600 hover:text-white rounded-lg transition-all border border-blue-100 flex items-center justify-center"
              title="Advance to next stage"
            >
              <ChevronRight size={14} />
            </button>
          )}

          {candidate.status === 'SHORTLISTED' || candidate.status === 'SELECTED' && (
            <span className="p-1 text-emerald-600 animate-bounce">
              <Check size={14} strokeWidth={3} />
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

