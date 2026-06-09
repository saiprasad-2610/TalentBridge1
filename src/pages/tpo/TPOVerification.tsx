import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  FileText, 
  ShieldCheck,
  Search,
  ExternalLink,
  Eye,
  AlertCircle
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export default function TPOVerification() {
  const [activeTab, setActiveTab] = useState('PENDING');

  const handleAction = (action: string, name: string) => {
    toast.success(`${action} successful for ${name}`, {
      style: { borderRadius: '16px' }
    });
  };

  const pendingDocs = [
    { id: 1, student: 'Rahul Sharma', type: 'Resume', college: 'MIT Engineering', submittedAt: '2026-06-05' },
    { id: 2, student: 'Sneha Patil', type: 'Internship Certificate', college: 'COEP Engineering', submittedAt: '2026-06-07' },
    { id: 3, student: 'Amit Verma', type: 'Course Completion', college: 'MIT Engineering', submittedAt: '2026-06-08' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">
            Document <span className="text-blue-600">Verification</span>
          </h1>
          <p className="text-slate-500 font-medium">Review and verify student credentials for placement eligibility</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          {['PENDING', 'VERIFIED', 'REJECTED'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100 flex items-start gap-4">
        <ShieldCheck className="text-blue-600 shrink-0" size={24} />
        <div>
          <h4 className="font-black text-blue-900 text-sm uppercase tracking-tight">Trust Protocol</h4>
          <p className="text-xs text-blue-700 font-medium mt-1 leading-relaxed">
            Verified documents receive a special badge on the student's profile, making them 40% more likely to be shortlisted by top recruiters.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Student & College</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Document Type</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Submission Date</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pendingDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-bold text-slate-900">{doc.student}</p>
                    <p className="text-xs text-slate-400 font-bold uppercase">{doc.college}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-blue-500" />
                      <span className="text-sm font-bold text-slate-600">{doc.type}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-500">{doc.submittedAt}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => toast.info('Previewing document...')}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="View Document"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handleAction('Verification', doc.student)}
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all" title="Verify"
                      >
                        <CheckCircle2 size={18} />
                      </button>
                      <button 
                        onClick={() => handleAction('Rejection', doc.student)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Reject"
                      >
                        <XCircle size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
