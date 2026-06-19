import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Plus, Users, Briefcase, Target, ArrowRight, Sparkles, Trophy, BarChart3
} from "lucide-react";
import { AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";

// Components
import { AnalyticsCard } from "../../components/company/AnalyticsCard.tsx";
import { JobCard } from "../../components/company/JobCard.tsx";
import { CandidateTable } from "../../components/company/CandidateTable.tsx";
import { CandidateDetailModal } from "../../components/company/CandidateDetailModal.tsx";
import { AIInsightsPanel } from "../../components/company/AIInsightsPanel.tsx";
import { HiringHealthPanel } from "../../components/company/HiringHealthPanel.tsx";

export function CompanyDashboard() {
  const { user, profile } = useAuth();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [companyJobs, setCompanyJobs] = useState<any[]>([]);

  useEffect(() => {
    if (user?.id) {
      fetchInitialData();
    }
  }, [user?.id]);

  const fetchInitialData = async () => {
    if (!user?.id) return;
    try {
      const [applicantsRes, jobsRes] = await Promise.all([
        api.get(`/analytics/employer/${user.id}`),
        api.get(`/jobs`)
      ]);

      if (applicantsRes.data.success) {
        setApplicants(applicantsRes.data.data.applicants || []);
        setStats(applicantsRes.data.data.stats || null);
      }

      const filteredJobs = (jobsRes.data.data || []).filter((j: any) => j.company_id === profile?.id);
      setCompanyJobs(filteredJobs);
    } catch (e) { console.error(e); }
  };

  const handleViewCandidate = async (candidate: any) => {
    setSelectedCandidate(candidate);
    try {
      await api.post("/analytics/profile-view", { 
        studentUserId: candidate.user_id, 
        companyUserId: user?.id 
      });
    } catch (e) { console.error(e); }
  };

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 py-12">
      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 bg-white p-12 rounded-[3rem] border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.02)] relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-50/30 rounded-full blur-[100px] -mr-64 -mt-64 transition-transform duration-1000 group-hover:scale-110" />
        <div className="relative z-10 flex-1">
           <div className="flex items-center gap-4 mb-6">
              <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse shadow-[0_0_15px_rgba(37,99,235,0.5)]" />
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em]">Recruiter Command Center</p>
           </div>
           <h1 className="text-6xl font-black text-slate-900 uppercase tracking-tight leading-[0.9] mb-8">
             {(() => {
                const hour = new Date().getHours();
                if (hour < 12) return 'Good Morning';
                if (hour < 17) return 'Good Afternoon';
                return 'Good Evening';
             })()}, <br/><span className="text-blue-600">{profile?.company_name || 'Partner'}</span>
           </h1>
           <div className="flex flex-wrap items-center gap-8">
              <div className="flex items-center gap-3 group/stat">
                 <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover/stat:bg-blue-50 group-hover/stat:text-blue-600 transition-all">
                    <Users size={18} />
                 </div>
                 <div>
                    <p className="text-slate-900 font-black text-sm tracking-tight leading-none">{applicants.length}</p>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Active Pipeline</p>
                 </div>
              </div>
              <div className="w-px h-10 bg-slate-100 hidden md:block" />
              <div className="flex items-center gap-3 group/stat">
                 <div className="w-10 h-10 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover/stat:bg-blue-50 group-hover/stat:text-blue-600 transition-all">
                    <Briefcase size={18} />
                 </div>
                 <div>
                    <p className="text-slate-900 font-black text-sm tracking-tight leading-none">{companyJobs.length}</p>
                    <p className="text-slate-400 font-bold text-[9px] uppercase tracking-widest mt-1">Open Campaigns</p>
                 </div>
              </div>
              <div className="w-px h-10 bg-slate-100 hidden md:block" />
              <Link to="/company/analytics" className="flex items-center gap-4 px-6 py-3 bg-blue-50 text-blue-600 rounded-2xl group/link hover:bg-blue-600 hover:text-white transition-all duration-300">
                 <BarChart3 size={18} className="transition-transform group-hover/link:scale-110" />
                 <p className="font-black text-[10px] uppercase tracking-widest">Real-time Insights</p>
              </Link>
           </div>
        </div>
        <div className="flex gap-4 relative z-10 shrink-0">
           <Link 
              to="/company/jobs/new"
              className="group flex items-center gap-4 bg-slate-900 text-white px-10 py-6 rounded-[2rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-2xl shadow-slate-900/20 hover:bg-blue-600 hover:shadow-blue-500/40 hover:-translate-y-1 transition-all duration-500 active:scale-95"
           >
              <Plus size={24} strokeWidth={3} className="group-hover:rotate-90 transition-transform duration-500" /> 
              Post Global Role
           </Link>
        </div>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
         <AnalyticsCard 
            label="Active Jobs" 
            value={companyJobs.length} 
            trend="Current" 
            trendUp={true} 
            icon={<Briefcase size={22}/>} 
            color="blue"
         />
         <AnalyticsCard 
            label="Pipeline" 
            value={stats?.totalApps || 0} 
            trend="Current" 
            trendUp={true} 
            icon={<Users size={22}/>} 
            color="purple"
         />
         <AnalyticsCard 
            label="Shortlisted" 
            value={applicants.filter(a => a.status === 'SHORTLISTED' || a.status === 'TESTING' || a.status === 'INTERVIEW').length} 
            trend="Current" 
            trendUp={true} 
            icon={<Target size={22}/>} 
            color="blue"
         />
         <AnalyticsCard 
            label="Hired" 
            value={applicants.filter(a => a.status === 'SELECTED').length} 
            trend="Current" 
            trendUp={true} 
            icon={<Trophy size={22}/>} 
            color="emerald"
         />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
         {/* Main Column */}
         <div className="lg:col-span-8 space-y-12">
            {/* Selected Candidates Section */}
            {applicants.some(a => a.status === 'SELECTED') && (
              <section className="space-y-8">
                 <div className="flex justify-between items-center px-4">
                    <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-inner">
                          <Trophy size={20} />
                       </div>
                       <div>
                          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Recent Selections</h3>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Successful hires for your company</p>
                       </div>
                    </div>
                 </div>

                 <div className="bg-white rounded-[40px] border border-emerald-100 shadow-sm overflow-hidden">
                    <CandidateTable 
                       applicants={applicants.filter(a => a.status === 'SELECTED').slice(0, 5)} 
                       onViewCandidate={handleViewCandidate} 
                    />
                 </div>
              </section>
            )}

            {/* Active Jobs Section */}
            <section className="space-y-8">
               <div className="flex justify-between items-center px-4">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                        <Briefcase size={20} />
                     </div>
                     <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Active Campaigns</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage your live job postings</p>
                     </div>
                  </div>
                  <Link to="/company/jobs" className="group flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">
                    View All <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
               </div>

               <div className="grid grid-cols-1 gap-6">
                  {companyJobs.slice(0, 3).map((job) => (
                    <JobCard key={job.id} job={job} />
                  ))}
                  {companyJobs.length === 0 && (
                    <div className="p-16 text-center bg-slate-50 rounded-[40px] border-2 border-dashed border-slate-100">
                       <Briefcase size={48} className="mx-auto text-slate-200 mb-6" />
                       <h4 className="text-xl font-black text-slate-400 uppercase tracking-tight">No active campaigns</h4>
                       <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mt-2">Start hiring by posting your first job role.</p>
                    </div>
                  )}
               </div>
            </section>

            {/* Recent Applicants Section */}
            <section className="space-y-8">
               <div className="flex justify-between items-center px-4">
                  <div className="flex items-center gap-4">
                     <div className="w-10 h-10 bg-purple-50 rounded-2xl flex items-center justify-center text-purple-600 shadow-inner">
                        <Users size={20} />
                     </div>
                     <div>
                        <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Recent Talent</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Latest applications across all roles</p>
                     </div>
                  </div>
                  <Link to="/company/applicants" className="group flex items-center gap-2 text-[10px] font-black text-purple-600 uppercase tracking-widest hover:bg-purple-50 px-4 py-2 rounded-xl transition-all">
                    Pipeline <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </Link>
               </div>

               <div className="bg-white rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                  <CandidateTable 
                     applicants={applicants.slice(0, 5)} 
                     onViewCandidate={handleViewCandidate} 
                  />
               </div>
            </section>
         </div>

         {/* Sidebar Column */}
         <div className="lg:col-span-4 space-y-12">
            <div className="sticky top-32 space-y-10">
               <AIInsightsPanel jobs={companyJobs} />
               <HiringHealthPanel stats={stats} />
               
               <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[40px] text-white relative overflow-hidden shadow-2xl shadow-blue-500/20">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                  <h4 className="text-sm font-black uppercase tracking-[0.2em] mb-4">Talent Discovery</h4>
                  <p className="text-xs font-medium text-blue-100 leading-relaxed mb-8">
                    Our AI matched <span className="text-white font-black underline decoration-blue-400 underline-offset-4">several highly-qualified candidates</span> for your {companyJobs.length > 0 ? companyJobs[0].title : 'open'} role recently.
                  </p>
                  <Link to="/company/applicants" className="w-full py-4 bg-white text-blue-600 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-blue-50 transition-all shadow-xl block text-center">
                    Review Matches
                  </Link>
               </div>
            </div>
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
