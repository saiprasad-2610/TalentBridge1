import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Plus, Search, ClipboardCheck, Sparkles, AlertCircle, Loader2, Award, 
  Lightbulb, ShieldCheck, CheckCircle2, RefreshCw, Eye, BookOpen, ExternalLink
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

interface Assessment {
  id: number;
  title: string;
  type: string;
  duration_minutes: number;
  total_questions: number;
  passing_score: number;
  created_at: string;
  status: string;
  job_title?: string;
  applications_count?: number;
}

export function AssessmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const sampleAssessments: Assessment[] = [
    {
      id: 1,
      title: "Full-Stack Node.js Cognitive Fitment",
      type: "Technical Test",
      duration_minutes: 30,
      total_questions: 15,
      passing_score: 70,
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ACTIVE",
      job_title: "Graduate Engineer Trainee",
      applications_count: 12
    },
    {
      id: 2,
      title: "Data Structures & Array Complexities",
      type: "Coding fitment",
      duration_minutes: 45,
      total_questions: 10,
      passing_score: 65,
      created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
      status: "ACTIVE",
      job_title: "Product Software Developer",
      applications_count: 8
    },
    {
      id: 3,
      title: "System Design Essentials & Web Cache",
      type: "Architecture Fit",
      duration_minutes: 40,
      total_questions: 20,
      passing_score: 75,
      created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
      status: "DEVELOPMENT",
      job_title: "Senior Product Engineer",
      applications_count: 0
    }
  ];

  const fetchAssessments = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // In production we can list company-defined tests or fall back safely to sample evaluations
      const [recResp, testResp] = await Promise.all([
        api.get(`/analytics/employer/${user.id}`).catch(() => null),
        api.get(`/interviews/jobs`).catch(() => null)
      ]);

      const loadedList: Assessment[] = [];
      
      if (testResp && testResp.data?.success && testResp.data.data) {
        // Build assessments map
        testResp.data.data.forEach((job: any, idx: number) => {
          loadedList.push({
            id: job.id + 100,
            title: `${job.title} Fitment Round`,
            type: "Technical Round",
            duration_minutes: 30,
            total_questions: 15,
            passing_score: 70,
            created_at: new Date().toISOString(),
            status: "ACTIVE",
            job_title: job.title,
            applications_count: job.applicant_count || 0
          });
        });
      }

      setAssessments(loadedList.length > 0 ? loadedList : sampleAssessments);
    } catch (err) {
      console.error("Error retrieving assessments list:", err);
      setAssessments(sampleAssessments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, [user]);

  const filtered = assessments.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (a.job_title && a.job_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Compiling Assessments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Recruiting Assessments</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Design, monitor, and configure diagnostic test structures for candidates</p>
        </div>
        <button
          onClick={() => navigate("/company/jobs/new")}
          className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-2 cursor-pointer self-start sm:self-auto"
        >
          <Plus size={16} /> Create Custom Test
        </button>
      </div>

      {/* Query Bar */}
      <div className="flex items-center gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
          <input
            type="text"
            placeholder="Search test names, mapped job roles..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50/50 rounded-2xl pl-12 pr-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-500 transition-all placeholder:text-slate-350"
          />
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center gap-4 bg-white border border-slate-150 border-dashed rounded-3xl p-8">
          <ClipboardCheck className="text-slate-305" size={40} />
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm uppercase tracking-wider">No evaluations scheduled</h3>
            <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest leading-none">Your job posts will generate dynamic evaluations automatically.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((asm) => (
            <motion.div
              key={asm.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-100 rounded-3xl p-6 hover:shadow-xl hover:shadow-slate-104/40 transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                    asm.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-205"
                  }`}>
                    {asm.status}
                  </span>
                  
                  <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-bold font-mono">
                    {asm.type}
                  </span>
                </div>

                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-tight line-clamp-1">{asm.title}</h3>
                  {asm.job_title && (
                    <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-1">Mapped to: {asm.job_title}</p>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 py-3 bg-slate-50/50 rounded-2xl border border-slate-100 text-center">
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Mins</p>
                    <p className="font-black text-slate-800 text-xs mt-1.5">{asm.duration_minutes}m</p>
                  </div>
                  <div className="border-x border-slate-150">
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none">Qs</p>
                    <p className="font-black text-slate-800 text-xs mt-1.5">{asm.total_questions}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none font-mono">Pass %</p>
                    <p className="font-black text-slate-800 text-xs mt-1.5">{asm.passing_score}%</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-bold uppercase">{asm.applications_count || 0} Tested</span>
                <button
                  onClick={() => navigate(`/company/pipeline`)}
                  className="px-4.5 py-2 bg-slate-950 text-white hover:bg-slate-800 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center gap-1"
                >
                  View candidates <ExternalLink size={10} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

export default AssessmentsPage;
