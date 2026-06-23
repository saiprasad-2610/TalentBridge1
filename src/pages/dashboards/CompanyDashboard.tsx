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

  // Normalize candidate stages dynamically
  const normalizeStageBucket = (app: any) => {
    const status = String(app.status || '').toUpperCase();
    const stageType = String(app.current_stage_type || app.stage_type || '').toUpperCase();
    const stageName = String(app.current_stage_name || app.stage_name || '').toUpperCase();

    if (status === 'REJECTED') return 'REJECTED';

    if (
      status === 'SELECTED' ||
      stageType.includes('SELECTED') ||
      stageType.includes('HIRED') ||
      stageName.includes('SELECTED') ||
      stageName.includes('HIRED') ||
      stageName.includes('OFFER')
    ) {
      return 'HIRED';
    }

    if (
      stageType.includes('INTERVIEW') ||
      stageType.includes('HR') ||
      stageName.includes('INTERVIEW') ||
      stageName.includes('HR')
    ) {
      return 'INTERVIEW';
    }

    if (
      stageType.includes('TEST') ||
      stageType.includes('ASSESSMENT') ||
      stageName.includes('TEST') ||
      stageName.includes('ASSESSMENT') ||
      stageName.includes('APTITUDE')
    ) {
      return 'ASSESSMENT';
    }

    if (
      stageType.includes('SCREEN') ||
      stageName.includes('SCREEN') ||
      status === 'IN_PROGRESS'
    ) {
      return 'SCREENING';
    }

    return 'APPLIED';
  };

  // Stats driven dynamically by actual database fetches
  const [activeJobsCount, setActiveJobsCount] = useState(0);
  const [totalApplicantsCount, setTotalApplicantsCount] = useState(0);
  const [inPipelineCount, setInPipelineCount] = useState(0);
  const [interviewsTodayCount, setInterviewsTodayCount] = useState(0);
  const [hiredThisMonthCount, setHiredThisMonthCount] = useState(0);

  const [realJobs, setRealJobs] = useState<any[]>([]);
  const [realApplicants, setRealApplicants] = useState<any[]>([]);
  const [realInterviews, setRealInterviews] = useState<any[]>([]);
  const [historicalTrend, setHistoricalTrend] = useState<any[]>([]);
  const [pipelineStepCounts, setPipelineStepCounts] = useState<any[]>([]);

  const [hoveredTrend, setHoveredTrend] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const fetchDashboardData = async () => {
      if (!user?.id) return;
      try {
        setLoading(true);
        const [analyticsRes, jobsRes, interviewsRes] = await Promise.all([
          api.get(`/analytics/employer/${user.id}`),
          api.get(`/jobs`),
          api.get(`/analytics/employer/${user.id}/interviews`)
        ]);

        if (!active) return;

        let filteredJobs: any[] = [];
        if (jobsRes.data?.success) {
          filteredJobs = jobsRes.data.data.filter((j: any) => j.company_id === profile?.id);
          setRealJobs(filteredJobs);
          setActiveJobsCount(filteredJobs.length);
        }

        if (analyticsRes.data?.success) {
          const apps = analyticsRes.data.data.applicants || [];
          const trend = analyticsRes.data.data.trendData || [];
          
          setRealApplicants(apps);
          setTotalApplicantsCount(apps.length);
          
          const inPipeline = apps.filter((a: any) => {
            const bucket = normalizeStageBucket(a);
            return bucket !== 'REJECTED' && bucket !== 'HIRED';
          }).length;
          setInPipelineCount(inPipeline);
          
          if (trend.length > 0) {
            setHistoricalTrend(trend);
          }
          
          const now = new Date();
          const hiredCount = apps.filter((a: any) => {
            if (normalizeStageBucket(a) !== 'HIRED') return false;
            if (!a.applied_at) return true;
            const resDate = new Date(a.applied_at);
            return resDate.getMonth() === now.getMonth() && resDate.getFullYear() === now.getFullYear();
          }).length;
          setHiredThisMonthCount(hiredCount);
        }

        if (interviewsRes.data?.success) {
          const fetchedInterviews = interviewsRes.data.data || [];
          setRealInterviews(fetchedInterviews);
          
          const todayStr = new Date().toDateString();
          const interviewsToday = fetchedInterviews.filter((i: any) => {
            if (!i.time) return false;
            return new Date(i.time).toDateString() === todayStr;
          }).length;
          setInterviewsTodayCount(interviewsToday);
        }

      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
        toast.error("Failed to load dashboard metrics.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();

    const handleRefresh = () => {
      fetchDashboardData();
    };

    window.addEventListener('talentbridge:pipeline-updated', handleRefresh);
    window.addEventListener('talentbridge:job-created', handleRefresh);

    return () => {
      active = false;
      window.removeEventListener('talentbridge:pipeline-updated', handleRefresh);
      window.removeEventListener('talentbridge:job-created', handleRefresh);
    };
  }, [user?.id, profile?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f8fafd]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-bold text-sm">Loading dashboard metrics...</p>
        </div>
      </div>
    );
  }

  // Dynamic calculation helpers
  const getPast7Days = () => {
    const days = [];
    const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        day: daysOfWeek[d.getDay()],
        count: 0
      });
    }
    return days;
  };

  const getCurrentWeekString = () => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
    const startOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // start from Monday
    const start = new Date(today);
    start.setDate(today.getDate() + startOffset);
    
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    
    const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    return `${start.toLocaleDateString('en-US', options)} - ${end.toLocaleDateString('en-US', options)}`;
  };

  const getGreeting = () => {
    const hours = new Date().getHours();
    if (hours < 12) return "Good Morning";
    if (hours < 17) return "Good Afternoon";
    return "Good Evening";
  };

  // Derived datasets
  const activeJobsListToRender = realJobs.map((j: any) => {
    const matchingApps = realApplicants.filter((a: any) => a.job_title === j.title || a.job_id === j.id);
    const interviewsCount = matchingApps.filter((a: any) => normalizeStageBucket(a) === 'INTERVIEW').length;
    const hiredCount = matchingApps.filter((a: any) => normalizeStageBucket(a) === 'HIRED').length;
    const pipelineCount = matchingApps.filter((a: any) => {
      const b = normalizeStageBucket(a);
      return b !== 'REJECTED' && b !== 'HIRED';
    }).length;
    return {
      id: j.id,
      title: j.title,
      type: j.job_type || "Full-time",
      applicants: matchingApps.length,
      pipeline: pipelineCount,
      interviews: interviewsCount,
      hired: hiredCount,
      status: "Active"
    };
  });

  const upcomingInterviews = realInterviews.slice(0, 4).map((i: any) => ({
    id: i.id,
    name: i.candidate,
    role: i.role,
    time: new Date(i.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    status: i.status === 'UPCOMING' ? 'Scheduled' : 'Live Meet',
    avatar: i.photo || `https://images.unsplash.com/photo-${1534528741775 + i.id % 100}?auto=format&fit=crop&q=80&w=120`
  }));

  // Pipeline Step Chevrons mapped from live stats
  const appliedStepCount = realApplicants.length;
  const screeningStepCount = realApplicants.filter(a => normalizeStageBucket(a) !== 'REJECTED').length;
  const assessmentStepCount = realApplicants.filter(a => ['ASSESSMENT', 'INTERVIEW', 'HIRED'].includes(normalizeStageBucket(a))).length;
  const interviewStepCount = realApplicants.filter(a => ['INTERVIEW', 'HIRED'].includes(normalizeStageBucket(a))).length;
  const offerStepCount = realApplicants.filter(a => ['HIRED'].includes(normalizeStageBucket(a))).length;
  const hiredStepCount = realApplicants.filter(a => normalizeStageBucket(a) === 'HIRED').length;

  const pipelineSteps = [
    { label: "Applied", value: appliedStepCount, pct: "100%", trend: null, color: "bg-blue-600" },
    { label: "Screening", value: screeningStepCount, pct: (appliedStepCount > 0 ? Math.round((screeningStepCount / appliedStepCount) * 100) : 0) + "%", trend: null, color: "bg-cyan-500" },
    { label: "Assessment", value: assessmentStepCount, pct: (appliedStepCount > 0 ? Math.round((assessmentStepCount / appliedStepCount) * 100) : 0) + "%", trend: null, color: "bg-indigo-500" },
    { label: "Interview", value: interviewStepCount, pct: (appliedStepCount > 0 ? Math.round((interviewStepCount / appliedStepCount) * 100) : 0) + "%", trend: null, color: "bg-amber-500" },
    { label: "Offer", value: offerStepCount, pct: (appliedStepCount > 0 ? Math.round((offerStepCount / appliedStepCount) * 100) : 0) + "%", trend: null, color: "bg-orange-500" },
    { label: "Hired", value: hiredStepCount, pct: (appliedStepCount > 0 ? Math.round((hiredStepCount / appliedStepCount) * 100) : 0) + "%", trend: null, color: "bg-emerald-500" }
  ];

  const trendDays = (() => {
    const days = getPast7Days();
    realApplicants.forEach((app: any) => {
      if (!app.applied_at) return;
      const appDate = new Date(app.applied_at);
      const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const appDayName = daysOfWeek[appDate.getDay()];
      const diffTime = Math.abs(new Date().getTime() - appDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const matchingDay = days.find(d => d.day === appDayName);
        if (matchingDay) {
          matchingDay.count += 1;
        }
      }
    });
    return days;
  })();

  // Candidate quality distribution data dynamically calculated
  const totalWithScores = realApplicants.filter(a => a.talent_score !== null && a.talent_score !== undefined).length;
  const excellentCount = realApplicants.filter(a => Number(a.talent_score) >= 80).length;
  const goodCount = realApplicants.filter(a => Number(a.talent_score) >= 60 && Number(a.talent_score) < 80).length;
  const averageCount = realApplicants.filter(a => Number(a.talent_score) >= 40 && Number(a.talent_score) < 60).length;
  const needsImprovementCount = realApplicants.filter(a => a.talent_score !== null && a.talent_score !== undefined && Number(a.talent_score) < 40).length;

  const excellentPct = totalWithScores > 0 ? Math.round((excellentCount / totalWithScores) * 100) : 0;
  const goodPct = totalWithScores > 0 ? Math.round((goodCount / totalWithScores) * 100) : 0;
  const averagePct = totalWithScores > 0 ? Math.round((averageCount / totalWithScores) * 100) : 0;
  const needsImprovementPct = totalWithScores > 0 ? Math.round((needsImprovementCount / totalWithScores) * 100) : 0;

  const totalScoresSum = realApplicants.reduce((sum, a) => sum + (a.talent_score ? Number(a.talent_score) : 0), 0);
  const avgOverallScore = totalWithScores > 0 ? Math.round(totalScoresSum / totalWithScores) : 0;

  const qualityLabel = avgOverallScore >= 80 ? "Excellent" : avgOverallScore >= 60 ? "Good" : avgOverallScore >= 40 ? "Average" : totalWithScores > 0 ? "Under Review" : "N/A";

  return (
    <div className="space-y-8 bg-[#f8fafd] min-h-screen px-4 py-8">
      
      {/* Greetings Block & Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            {getGreeting()}, {(user as any)?.name || profile?.company_name || "Saiprasad"}! <span className="animate-bounce">👋</span>
          </h1>
          <p className="text-slate-400 font-medium text-xs mt-1">
            Here's what's happening with your hiring today.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Calendar Picker Wrapper */}
          <div className="bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-2xl flex items-center gap-2 text-slate-600 font-extrabold text-xs">
            <Calendar size={14} className="text-slate-400" />
            <span>{getCurrentWeekString()}</span>
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
            <span className="text-2xl font-black text-slate-900 block mt-1">{activeJobsCount}</span>
            <span className="text-[9px] font-extrabold text-blue-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> Synced Live
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
            <span className="text-2xl font-black text-slate-900 block mt-1">{totalApplicantsCount}</span>
            <span className="text-[9px] font-extrabold text-emerald-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> Real-time
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
            <span className="text-2xl font-black text-slate-900 block mt-1">{inPipelineCount}</span>
            <span className="text-[9px] font-extrabold text-indigo-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> In Evaluation
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
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {String(interviewsTodayCount).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-extrabold text-orange-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> Scheduled Today
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
            <span className="text-2xl font-black text-slate-900 block mt-1">
              {String(hiredThisMonthCount).padStart(2, '0')}
            </span>
            <span className="text-[9px] font-extrabold text-rose-600 mt-1.5 flex items-center gap-0.5 uppercase tracking-wide">
              <TrendingUp size={10} /> Verified Selection
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
                    {(step as any).trend && (
                      <span className={`text-[9px] font-extrabold flex items-center ${(step as any).trendUp ? "text-emerald-600" : "text-rose-500"}`}>
                        {(step as any).trendUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                        {(step as any).trend.replace(/[-+]/g, '')}
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
            
            {activeJobsListToRender.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                  <Briefcase size={20} />
                </div>
                <h3 className="text-sm font-black text-slate-800">No active jobs posted yet</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Create your first job posting to start matching with high-quality candidate applications.
                </p>
                <Link 
                  to="/company/jobs" 
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Post First Job
                </Link>
              </div>
            ) : (
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
                    {activeJobsListToRender.map((job, index) => (
                      <tr key={index} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3.5 px-6">
                          <span className="font-extrabold text-slate-900 block">{job.title}</span>
                          <span className="text-[10px] text-slate-400 font-bold block mt-1">{job.type}</span>
                        </td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-slate-900">{job.applicants}</td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-indigo-600">{job.pipeline}</td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-orange-600">{job.interviews}</td>
                        <td className="py-3.5 px-6 font-extrabold text-center text-[#10b981]">{job.hired}</td>
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
            )}
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
                {(() => {
                  const totalTrendApps = trendDays.reduce((sum, td) => sum + (td.count || 0), 0);
                  return `${totalTrendApps} Applications`;
                })()}
              </div>
            </div>

            {/* Custom SVG Line Chart matching aesthetic style */}
            <div className="h-48 relative pt-4">
              {(() => {
                const maxVal = Math.max(...trendDays.map(d => d.count), 1);
                const trendPoints = trendDays.map((t, idx) => {
                  const x = 50 + idx * 100;
                  const y = 140 - (t.count / maxVal) * 100;
                  return { x, y };
                });

                let trendPathD = "";
                if (trendPoints.length > 0) {
                  trendPathD = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
                  for (let i = 1; i < trendPoints.length; i++) {
                    trendPathD += ` L ${trendPoints[i].x} ${trendPoints[i].y}`;
                  }
                }

                const trendAreaD = trendPathD ? `${trendPathD} L ${trendPoints[trendPoints.length - 1].x} 150 L ${trendPoints[0].x} 150 Z` : "";

                return (
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
                    {trendAreaD && (
                      <path 
                        d={trendAreaD} 
                        fill="url(#chartGrad)" 
                      />
                    )}

                    {/* Spline Curve path */}
                    {trendPathD && (
                      <path 
                        d={trendPathD} 
                        fill="none" 
                        stroke="#4f46e5" 
                        strokeWidth="3.5" 
                        strokeLinecap="round"
                      />
                    )}

                    {/* Highlight Dots */}
                    {trendDays.map((t, idx) => {
                      const pt = trendPoints[idx];
                      if (!pt) return null;
                      return (
                        <g key={idx} className="cursor-pointer group" onMouseEnter={() => setHoveredTrend(idx)} onMouseLeave={() => setHoveredTrend(null)}>
                          <circle 
                            cx={pt.x} 
                            cy={pt.y} 
                            r={hoveredTrend === idx ? "7" : "4.5"} 
                            fill={hoveredTrend === idx ? "#4f46e5" : "white"} 
                            stroke="#4f46e5" 
                            strokeWidth="3.5"
                            className="transition-all"
                          />
                          {hoveredTrend === idx && (
                            <foreignObject x={pt.x - 45} y={pt.y - 38} width="90" height="30">
                              <div className="bg-slate-950 text-white text-[9px] font-black rounded-lg py-1 px-2 text-center shadow-lg uppercase tracking-wider">
                                {t.count} Apps
                              </div>
                            </foreignObject>
                          )}
                        </g>
                      );
                    })}
                  </svg>
                );
              })()}

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
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            
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
                {/* Bullet 1 */}
                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <Sparkles size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      {(() => {
                        const highlyRatedCount = realApplicants.filter((a: any) => Number(a.talent_score) >= 85).length;
                        return highlyRatedCount > 0 
                          ? `${highlyRatedCount} profile${highlyRatedCount > 1 ? "s are" : " is"} highly recommended based on outstanding AI screening scores`
                          : "No candidate applications are currently rated above 85/100";
                      })()}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>

                {/* Bullet 2 */}
                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <BarChart3 size={14} className="text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      {activeJobsCount > 0 
                        ? `AI Recruiter is currently guarding pipelines across ${activeJobsCount} active job vacancies`
                        : "Awaiting active job postings to spin up automated recruiter matching algorithms"}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>

                {/* Bullet 3 */}
                <div className="flex items-start gap-3 bg-white/[0.04] p-3 rounded-xl border border-white/[0.03] hover:bg-white/[0.07] transition-all cursor-pointer">
                  <div className="w-8 h-8 rounded-lg bg-indigo-950 flex items-center justify-center shrink-0 border border-indigo-500/10">
                    <Users size={14} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] text-slate-100 font-extrabold leading-relaxed">
                      {screeningStepCount > 0 
                        ? `${screeningStepCount} candidate${screeningStepCount > 1 ? "s are" : " is"} currently undergoing active evaluation & vetting screening`
                        : "No candidate registration backlog; applicant streams are quiet and up to date"}
                    </p>
                  </div>
                  <ChevronRight size={14} className="text-slate-400 shrink-0 self-center" />
                </div>
              </div>
            </div>

            <Link 
              to="/company/ai-recruiter"
              className="mt-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white rounded-xl text-center text-[10px] font-black uppercase tracking-widest relative z-10 block transition-all"
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
                  {/* Dynamic Progress indicator */}
                  <path 
                    className="text-indigo-600" 
                    strokeDasharray={`${avgOverallScore || 0} 100`} 
                    strokeWidth="4" 
                    strokeLinecap="round"
                    stroke="currentColor" 
                    fill="none" 
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                  />
                </svg>
                {/* Score central display */}
                <div className="absolute inset-0 flex flex-col justify-center items-center">
                  <span className="text-xl font-black text-slate-950 leading-none">{avgOverallScore || "--"}</span>
                  <span className="text-[9px] text-indigo-600 font-extrabold uppercase mt-1">{qualityLabel}</span>
                </div>
              </div>

              {/* Dynamic Legend matches design exact colors */}
              <div className="flex-1 space-y-2 w-full text-xs">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600" />
                    <span className="font-extrabold text-slate-800">Excellent (80-100)</span>
                  </div>
                  <span className="font-extrabold text-slate-900">{excellentPct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="font-extrabold text-slate-800">Good (60-79)</span>
                  </div>
                  <span className="font-extrabold text-slate-900">{goodPct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="font-extrabold text-slate-800">Average (40-59)</span>
                  </div>
                  <span className="font-extrabold text-slate-900">{averagePct}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-450 bg-rose-400" />
                    <span className="font-extrabold text-slate-800">Needs Improvement</span>
                  </div>
                  <span className="font-extrabold text-slate-900">{needsImprovementPct}%</span>
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
              <span onClick={() => { navigate('/company/interviews'); }} className="text-[10px] text-blue-600 font-black uppercase tracking-wider cursor-pointer hover:underline">
                View Calendar
              </span>
            </div>

            {upcomingInterviews.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                <Calendar size={24} className="text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-800">No interviews scheduled</p>
                <p className="text-[10px] text-slate-400 mt-1 max-w-xs px-2">
                  When you shortlist candidates and send outlook calendar invites, upcoming interview rounds appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {upcomingInterviews.map((interview, index) => (
                  <div key={index} className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full overflow-hidden border border-slate-200">
                        <img src={interview.avatar} alt="Candidate" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </div>
                      <div>
                        <span className="text-xs font-black text-slate-950 block">{interview.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5">{interview.role}</span>
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
            )}

            <button 
              onClick={() => { navigate('/company/interviews'); }}
              className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-black text-[10px] uppercase tracking-widest rounded-xl text-center border border-slate-100 block transition-colors cursor-pointer"
            >
              Manage Calendar & Invites
            </button>
          </div> </div>

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
