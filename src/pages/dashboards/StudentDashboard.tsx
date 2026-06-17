import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Video, 
  Briefcase, 
  FileText, 
  Sparkles, 
  UserCircle, 
  ArrowRight,
  TrendingUp,
  Award
} from "lucide-react";
import { motion } from "motion/react";

export function StudentDashboard() {
  const navigate = useNavigate();

  const cards = [
    {
      title: "Video Interviews",
      description: "Join on-platform video screenings, complete developer evaluations, and view specialized recruiter reports and feedback.",
      action: "Take Interview",
      to: "/student/interviews",
      icon: Video,
      color: "from-blue-500 to-indigo-600",
      accent: "text-blue-600 bg-blue-50"
    },
    {
      title: "Browse Jobs",
      description: "Explore dozens of verified full-time roles, developer positions, and internships optimized for your skill index and career path.",
      action: "Explore Roles",
      to: "/jobs",
      icon: Briefcase,
      color: "from-emerald-500 to-teal-600",
      accent: "text-emerald-500 bg-emerald-50"
    },
    {
      title: "AI Mock Interviews",
      description: "Practice real-time interactive face-to-face and technical chat simulations with customized AI feedback to build high-level confidence.",
      action: "Start Prep Round",
      to: "/interview",
      icon: Sparkles,
      color: "from-purple-500 to-pink-600",
      accent: "text-purple-600 bg-purple-50"
    },
    {
      title: "My Applications",
      description: "Track your active recruiting pipelines, verify cognitive score status, and follow real-time hiring updates.",
      action: "Track Status",
      to: "/applied-jobs",
      icon: FileText,
      color: "from-slate-700 to-slate-900",
      accent: "text-slate-700 bg-slate-100"
    }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* Welcome Hero Panel */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative bg-gradient-to-r from-[#0d1635] to-[#162a63] rounded-3xl p-8 md:p-10 text-white overflow-hidden shadow-xl"
      >
        <div className="absolute top-1/10 right-1/10 w-96 h-96 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none select-none" />
        <div className="absolute -bottom-1/5 -left-10 w-72 h-72 bg-blue-500/15 rounded-full blur-[80px] pointer-events-none select-none" />

        <div className="max-w-2xl space-y-4 relative z-10">
          <span className="p-1 px-3 bg-indigo-500/20 text-indigo-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-indigo-500/30">
            Candidate Hub
          </span>
          <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight">
            Elevate Your Career Trajectory
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold">
            Welcome to TalentBridge. Access smart evaluation systems, track live corporate job openings, practice with advanced automated mock interviews, and build technical resume excellence.
          </p>
        </div>
      </motion.div>

      {/* Analytics Overview Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {[
          { label: "Active Pipelines", val: "03 Roles", icon: TrendingUp, text: "Ongoing recruitment status" },
          { label: "XP Cumulative Score", val: "2,250 XP", icon: Award, text: "Acquired developer merit" },
          { label: "AI Match Score", val: "High Match", icon: Sparkles, text: "Optimized profile balance" },
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-100 p-5 rounded-2.5xl shadow-sm flex items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">{stat.label}</div>
              <div className="text-xl font-bold font-black text-slate-850 mt-1">{stat.val}</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-0.5">{stat.text}</div>
            </div>
            <div className="p-3 bg-indigo-50/50 rounded-2xl text-indigo-600">
              <stat.icon size={20} />
            </div>
          </div>
        ))}
      </div>

      {/* QUICK ACCESS ACTION CARDS GRID */}
      <div className="space-y-4">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">Workspace Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {cards.map((card, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.05 }}
              className="bg-white rounded-3xl border border-slate-100 p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className={`p-3.5 rounded-2.5xl ${card.accent}`}>
                    <card.icon size={22} />
                  </div>
                  <span className="opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 text-slate-350 transition-all">
                    <ArrowRight size={18} />
                  </span>
                </div>
                
                <div className="space-y-1.5">
                  <h3 className="font-extrabold text-lg text-slate-900 group-hover:text-indigo-650 transition-colors uppercase tracking-tight">
                    {card.title}
                  </h3>
                  <p className="text-slate-500 font-medium text-xs leading-relaxed">
                    {card.description}
                  </p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-50">
                <button 
                  onClick={() => navigate(card.to)}
                  className="w-full bg-slate-50 hover:bg-slate-100 group-hover:bg-indigo-600 group-hover:text-white text-slate-700 font-black py-3 rounded-xl text-center uppercase tracking-wider text-[10px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {card.action}
                  <ArrowRight size={12} />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;
