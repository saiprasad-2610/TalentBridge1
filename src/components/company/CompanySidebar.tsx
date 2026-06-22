import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  GitBranch, 
  ClipboardCheck, 
  MessageSquare, 
  BarChart3, 
  Sparkles,
  Search,
  GraduationCap,
  MessageCircle,
  FileText,
  Settings,
  MoreVertical,
  Lock,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';

export function CompanySidebar() {
  const { user, profile, logout } = useAuth();
  const isApproved = profile?.status === 'APPROVED';

  const navItems = [
    { to: '/company', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/company/jobs', icon: Briefcase, label: 'Jobs' },
    { to: '/company/applicants', icon: Users, label: 'Applicants' },
    { to: '/company/pipeline', icon: GitBranch, label: 'Pipeline' },
    { to: '/company/interviews', icon: MessageSquare, label: 'Interviews' },
    { to: '/company/assessments', icon: ClipboardCheck, label: 'Assessments' },
    { to: '/company/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/company/ai-recruiter', icon: Sparkles, label: 'AI Recruiter', isNew: true },
    { to: '/company/talent-search', icon: Search, label: 'Talent Search' },
    { to: '/company/campus', icon: GraduationCap, label: 'Campus Hiring' },
    { to: '/company/messages', icon: MessageCircle, label: 'Messages', badgeCount: 8 },
    { to: '/company/reports', icon: FileText, label: 'Reports' },
    { to: '/company/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-72 bg-[#090b21] text-white min-h-screen flex flex-col fixed left-0 top-0 border-r border-[#151939] z-40 shadow-[4px_0_30px_rgba(0,0,0,0.3)]">
      {/* Dynamic Branding Header */}
      <div className="p-6 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 via-indigo-600 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/15">
            <span className="font-sans font-black text-white text-xl tracking-tight">T</span>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white block">
              Talent<span className="text-indigo-400 font-extrabold">Bridge</span>
            </span>
          </div>
        </div>
      </div>

      {/* Navigation list */}
      <nav className="flex-1 px-4 py-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {navItems.map((item) => {
          const IconComponent = item.icon;
          if (!isApproved && item.to !== '/company/profile') {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 cursor-not-allowed text-[13px] font-semibold opacity-50 bg-[#0e1131]/20 border border-[#161a3e]/30"
                title="Account verification required."
              >
                <IconComponent size={18} className="shrink-0" />
                <span className="flex-1 text-left">{item.label}</span>
                <Lock size={12} />
              </div>
            );
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all group relative
                ${isActive 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/10 font-bold' 
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'}
              `}
            >
              {({ isActive }) => (
                <>
                  <IconComponent 
                    size={18} 
                    className={`shrink-0 transition-transform group-hover:scale-105 duration-200 ${
                      isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
                    }`} 
                  />
                  <span className="flex-1">{item.label}</span>
                  
                  {item.isNew && (
                    <span className="px-2 py-0.5 text-[9px] font-black tracking-wider text-white bg-indigo-550 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-md shadow-sm shadow-indigo-500/30">
                      New
                    </span>
                  )}
                  
                  {item.badgeCount && (
                    <span className="w-5 h-5 flex items-center justify-center text-[10px] font-black text-rose-100 bg-[#3519c1] rounded-full">
                      {item.badgeCount}
                    </span>
                  )}

                  {isActive && (
                    <motion.div 
                      layoutId="company-sidebar-active"
                      className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/80"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Floating AI Hiring Copilot Widgets Area */}
      <div className="px-4 py-4 border-t border-[#161a3e]">
        <div className="relative bg-gradient-to-b from-[#14183e] to-[#0c0e2a] border border-[#23295c] rounded-2xl p-4 overflow-hidden group shadow-xl">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-black tracking-wide text-white uppercase flex items-center gap-1">
              AI Hiring Copilot
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-600 text-white rounded uppercase tracking-wider">
              Beta
            </span>
          </div>
          
          <p className="text-[11px] text-slate-305 text-slate-300 font-medium leading-relaxed mb-3">
            Find, assess and hire the best talent with the power of AI.
          </p>

          <button className="w-full py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-lg text-[10px] font-extrabold uppercase tracking-widest transition-all duration-300 shadow-md flex items-center justify-center gap-1">
            Start Copilot <span className="font-serif">→</span>
          </button>
          
          {/* Neon Bot Drawing element */}
          <div className="absolute -bottom-6 -right-6 w-16 h-16 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-indigo-400 w-full h-full">
              <rect x="3" y="11" width="18" height="10" rx="2" />
              <circle cx="8" cy="12" r="1" />
              <path d="M12 2v4M8 5h8M9 15h.01M15 15h.01" />
            </svg>
          </div>
        </div>
      </div>

      {/* Bottom Profile Block */}
      <div className="p-4 bg-[#07081a] border-t border-[#121636] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-full bg-slate-850 flex items-center justify-center border-2 border-indigo-500/30 overflow-hidden flex-shrink-0">
            {profile?.logo_url ? (
              <img src={profile.logo_url} className="w-full h-full object-cover" alt="Company Logo" referrerPolicy="no-referrer" />
            ) : (
              <img 
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120"
                className="w-full h-full object-cover" 
                alt="Profile Avatar"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
          <div className="text-left overflow-hidden min-w-0">
            <h5 className="text-xs font-black text-white truncate leading-none">
              Saiprasad G
            </h5>
            <span className="text-[10px] text-slate-400 block truncate font-medium mt-1">
              Recruiter Admin
            </span>
          </div>
        </div>
        <button 
          onClick={logout}
          title="Logout"
          className="text-slate-400 hover:text-rose-500 p-2 hover:bg-white/5 rounded-lg transition-colors"
        >
          <LogOut size={16} />
        </button>
      </div>
    </div>
  );
}
