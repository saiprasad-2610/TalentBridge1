import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { Search, Plus, Briefcase, Filter } from 'lucide-react';
import { JobCard } from '../../components/company/JobCard.tsx';
import { Link } from 'react-router-dom';

export function ActiveJobsPage() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/jobs`);
      const filteredJobs = (res.data.data || []).filter((j: any) => j.company_id === profile?.id);
      setJobs(filteredJobs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Active Postings</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Manage your open roles and track recruitment progress.</p>
        </div>
        <Link 
          to="/company/jobs/new"
          className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
        >
          <Plus size={18} strokeWidth={3} /> Post New Role
        </Link>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search roles..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
          <Filter size={18} /> Filters
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {filteredJobs.map(job => (
          <JobCard key={job.id} job={job} />
        ))}
        
        {filteredJobs.length === 0 && !loading && (
          <div className="py-20 text-center bg-white rounded-[40px] border border-slate-100 border-dashed">
            <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
               <Briefcase size={40} />
            </div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">No active roles found</h3>
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2">Try adjusting your search or post a new position.</p>
          </div>
        )}
      </div>
    </div>
  );
}
