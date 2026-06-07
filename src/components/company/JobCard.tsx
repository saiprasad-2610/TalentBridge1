import React from 'react';
import { Briefcase, MapPin, Users, Calendar, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface JobCardProps {
  job: any;
}

export function JobCard({ job }: JobCardProps) {
  return (
    <div className="bg-white rounded-[32px] border border-slate-100 p-8 flex flex-col md:flex-row justify-between items-center group hover:border-blue-200 transition-all shadow-sm hover:shadow-xl hover:shadow-blue-500/5">
      <div className="flex gap-6 items-center flex-1 w-full">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 shadow-sm group-hover:scale-110 transition-transform">
          <Briefcase size={28} strokeWidth={2.5} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight">{job.title}</h4>
            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[9px] font-black uppercase rounded-lg border border-emerald-100">Active</span>
          </div>
          <div className="flex flex-wrap gap-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><MapPin size={14} /> {job.location || 'Remote'}</span>
            <span className="flex items-center gap-1.5"><Users size={14} /> {job.applicant_count || Math.floor(Math.random() * 50) + 5} Applicants</span>
            <span className="flex items-center gap-1.5"><Calendar size={14} /> Exp: {new Date(job.deadline).toLocaleDateString()}</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 md:mt-0 flex gap-3 w-full md:w-auto">
        <Link 
          to={`/company/jobs/tracking/${job.id}`}
          className="flex-1 md:flex-none px-8 py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-xl shadow-slate-900/10"
        >
          Track Pipeline <ChevronRight size={16} strokeWidth={3} />
        </Link>
      </div>
    </div>
  );
}
