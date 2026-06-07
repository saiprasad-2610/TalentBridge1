import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../services/api.ts";
import { BrainCircuit, Briefcase, Code2, ArrowRight, Activity, TrendingUp, History } from "lucide-react";
import { useAuth } from "../../context/AuthContext.tsx";

export function QuizConfigPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [historyCount, setHistoryCount] = useState<number | null>(null);

  useEffect(() => {
    if (user?.id) {
      api.get(`/quiz/history/${user.id}`).then(res => {
        if (res.data?.success && Array.isArray(res.data.quizzes)) {
          setHistoryCount(res.data.quizzes.length);
        }
      }).catch(err => {
        console.error("Error fetching quiz history:", err);
      });
    }
  }, [user]);
  
  const [config, setConfig] = useState({
    type: "Technical Quiz",
    role: "Full Stack Developer",
    skills: "React, Node.js, SQL",
    difficulty: "Medium",
    amount: "10"
  });

  const generateQuiz = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        alert("Please login first");
        setLoading(false);
        return;
      }
      
      const response = await api.post("/quiz/generate", {
        userId: user.id,
        type: config.type,
        role: config.role,
        skills: config.skills.split(",").map(s => s.trim()),
        difficulty: config.difficulty,
        amount: parseInt(config.amount)
      });
      
      if (response.data?.success && response.data?.quizId) {
        navigate(`/ai-quiz/session/${response.data.quizId}`);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate quiz");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="mb-10 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
          <BrainCircuit size={32} />
        </div>
        <h1 className="text-4xl font-black text-slate-800 tracking-tight">AI Assessment Engine</h1>
        <p className="text-slate-500 mt-2 font-medium">Generate dynamic, anti-cheat assessments powered by Gemini AI.</p>
        
        <button 
          onClick={() => navigate("/ai-quiz/history")}
          className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98]"
        >
          <History size={14} className="text-emerald-600 animate-pulse shrink-0" />
          View Assessment History {historyCount !== null ? `(${historyCount})` : ""} <ArrowRight size={14} className="text-emerald-500" />
        </button>
      </div>

      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-xl">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Quiz Type</label>
                <select 
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 font-semibold text-slate-700 outline-none focus:border-emerald-500"
                  value={config.type} onChange={(e) => setConfig({...config, type: e.target.value})}
                >
                  <option>Technical Quiz</option>
                  <option>Aptitude Test</option>
                  <option>Logical Reasoning</option>
                  <option>Verbal Ability</option>
                  <option>Mixed Assessment</option>
                </select>
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Target Role</label>
                <div className="relative">
                  <Briefcase size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    value={config.role} onChange={(e) => setConfig({...config, role: e.target.value})}
                    placeholder="e.g. Data Scientist"
                    className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-semibold text-slate-700 outline-none focus:border-emerald-500"
                  />
                </div>
             </div>
          </div>

          <div>
             <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Key Skills (Comma Separated)</label>
             <div className="relative">
               <Code2 size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
               <input 
                 type="text" 
                 value={config.skills} onChange={(e) => setConfig({...config, skills: e.target.value})}
                 placeholder="e.g. Python, Machine Learning, SQL"
                 className="w-full bg-slate-50 border-2 border-slate-200 rounded-xl pl-12 pr-4 py-3 font-semibold text-slate-700 outline-none focus:border-emerald-500"
               />
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Difficulty Level</label>
                <div className="flex gap-2">
                  {["Easy", "Medium", "Hard", "Company-Level"].map(diff => (
                    <button 
                      key={diff}
                      onClick={() => setConfig({...config, difficulty: diff})}
                      className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold border-2 transition-all ${config.difficulty === diff ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {diff}
                    </button>
                  ))}
                </div>
             </div>
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Number of Questions</label>
                <div className="flex gap-2">
                  {["5", "10", "15", "20"].map(num => (
                    <button 
                      key={num}
                      onClick={() => setConfig({...config, amount: num})}
                      className={`flex-1 py-3 px-2 rounded-xl text-sm font-bold border-2 transition-all ${config.amount === num ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>
             </div>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button 
              type="button"
              onClick={() => navigate("/ai-quiz/history")}
              className="w-full sm:w-auto flex items-center justify-center gap-2 border-2 border-slate-200 hover:border-slate-350 bg-white hover:bg-slate-50 text-slate-705 font-bold uppercase tracking-wider text-xs px-6 py-4 rounded-2xl transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <History size={14} className="text-slate-500" />
              AI Quiz History {historyCount !== null ? `(${historyCount})` : ""}
            </button>
            <button 
              onClick={generateQuiz} 
              disabled={loading}
              className="w-full sm:w-auto flex items-center justify-center gap-3 bg-slate-900 hover:bg-slate-800 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-xl shadow-slate-200 disabled:opacity-50"
            >
              {loading ? "Synthesizing AI Quiz (Takes ~10s)..." : "Generate & Start Assessment"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
