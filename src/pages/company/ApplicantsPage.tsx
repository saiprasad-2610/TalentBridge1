import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { Search, Filter, Download, Users } from 'lucide-react';
import { CandidateTable } from '../../components/company/CandidateTable.tsx';
import { CandidateDetailModal } from '../../components/company/CandidateDetailModal.tsx';
import { AnimatePresence } from 'motion/react';

export function ApplicantsPage() {
  const { user } = useAuth();
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const filteredApplicants = applicants.filter(app => 
    app.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.job_title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">All Applicants</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Review and manage all candidates who applied to your job postings.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-5 py-3 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, role, or skills..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-100 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all shadow-sm"
          />
        </div>
        <button className="flex items-center gap-2 px-6 py-3.5 bg-white border border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm">
          <Filter size={18} /> Filters
        </button>
      </div>

      <CandidateTable 
        applicants={filteredApplicants} 
        onViewCandidate={setSelectedCandidate} 
      />

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
