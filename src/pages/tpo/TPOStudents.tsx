import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  ChevronRight, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  FileText,
  Eye,
  XCircle
} from 'lucide-react';
import api from '../../services/api';

import { toast } from 'react-hot-toast';

export default function TPOStudents() {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    dept: '',
    year: '',
    status: ''
  });

  const handleNotImplemented = (feature: string) => {
    toast.info(`${feature} feature is coming soon!`, {
      icon: '🚀',
      style: {
        borderRadius: '16px',
        background: '#333',
        color: '#fff',
      },
    });
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const response = await api.get('/tpo/students');
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReadinessBadge = (score: number) => {
    if (score >= 80) return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase">High Readiness</span>;
    if (score >= 50) return <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold uppercase">Medium Readiness</span>;
    return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold uppercase">At Risk</span>;
  };

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.college_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Parse education_json for dept/year
    let edu: any = {};
    try { edu = typeof s.education_json === 'string' ? JSON.parse(s.education_json) : s.education_json || {}; } catch(e) {}
    
    const matchesDept = !filters.dept || edu.department === filters.dept;
    const matchesYear = !filters.year || edu.year === filters.year;
    
    return matchesSearch && matchesDept && matchesYear;
  });

  return (
    <div className="space-y-8">
      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by name, email or college..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative group">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase tracking-widest text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 transition-all"
              value={filters.dept}
              onChange={(e) => setFilters({...filters, dept: e.target.value})}
            >
              <option value="">All Departments</option>
              <option value="CSE">CSE</option>
              <option value="ECE">ECE</option>
              <option value="Mechanical">Mechanical</option>
              <option value="Civil">Civil</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
               <ChevronRight className="rotate-90 text-slate-400" size={14} />
            </div>
          </div>

          <div className="relative group">
            <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase tracking-widest text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 transition-all"
              value={filters.year}
              onChange={(e) => setFilters({...filters, year: e.target.value})}
            >
              <option value="">All Years</option>
              <option value="First Year">First Year</option>
              <option value="Second Year">Second Year</option>
              <option value="Third Year">Third Year</option>
              <option value="Final Year">Final Year</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
               <ChevronRight className="rotate-90 text-slate-400" size={14} />
            </div>
          </div>

          <div className="relative group">
            <AlertTriangle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors" size={16} />
            <select 
              className="w-full pl-10 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-bold text-xs uppercase tracking-widest text-slate-600 appearance-none cursor-pointer hover:bg-slate-100 transition-all"
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
            >
              <option value="">All Risk Categories</option>
              <option value="high">High Readiness</option>
              <option value="medium">Medium Readiness</option>
              <option value="at-risk">At Risk</option>
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
               <ChevronRight className="rotate-90 text-slate-400" size={14} />
            </div>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">College</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Talent Score</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider">Placement Readiness</th>
                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-medium">No students found</td></tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                          {student.full_name?.[0] || 'S'}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{student.full_name || 'Incomplete Profile'}</p>
                          <p className="text-xs text-slate-500 font-medium">{student.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm font-bold text-slate-600">{student.college_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-blue-500" 
                            style={{width: `${student.talent_score || 0}%`}}
                          />
                        </div>
                        <span className="text-sm font-black text-slate-700">{student.talent_score || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getReadinessBadge(student.talent_score || 0)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => handleNotImplemented('Student Details View')}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Eye size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
