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
  Building2, 
  Settings,
  LogOut,
  Sparkles,
  Lock
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { motion } from 'motion/react';

export function CompanySidebar() {
  const { logout, profile } = useAuth();
  const isApproved = profile?.status === 'APPROVED';

  const navItems = [
    { to: '/company', icon: LayoutDashboard, label: 'Dashboard', end: true },
    { to: '/company/jobs', icon: Briefcase, label: 'Active Jobs' },
    { to: '/company/applicants', icon: Users, label: 'Applicants' },
    { to: '/company/pipeline', icon: GitBranch, label: 'Hiring Pipeline' },
    { to: '/company/assessments', icon: ClipboardCheck, label: 'Assessments' },
    { to: '/company/interviews', icon: MessageSquare, label: 'Interviews' },
    { to: '/company/analytics', icon: BarChart3, label: 'Analytics' },
  ];

  const secondaryNav = [
    { to: '/company/profile', icon: Building2, label: 'Company Profile' },
    { to: '/company/settings', icon: Settings, label: 'Settings' },
  ];

  return (
    <div className="w-72 bg-white min-h-screen flex flex-col fixed left-0 top-0 border-r border-slate-100/80 z-40 shadow-[1px_0_20px_rgba(0,0,0,0.02)]">
      <div className="p-8 pb-10">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 ring-4 ring-blue-50">
            <div className="w-5 h-5 bg-white rounded-md rotate-45" />
          </div>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">Talent<span className="text-blue-600">Bridge</span></span>
        </h1>
        <div className="mt-4 flex items-center gap-2 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Recruiter HQ • Online</p>
        </div>
      </div>

      <nav className="flex-1 px-5 space-y-1.5 overflow-y-auto scrollbar-hide">
        <div className="px-4 mb-4">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Main Navigation</p>
        </div>
        {navItems.map((item) => {
          if (!isApproved) {
            return (
              <div
                key={item.to}
                className="flex items-center gap-3.5 px-4 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest text-slate-400 cursor-not-allowed group relative bg-slate-50/50 border border-slate-100 opacity-60"
                title="Account verification required. Complete your profile to unlock."
              >
                <item.icon size={19} className="text-slate-450" />
                <span className="flex-1 text-left">{item.label}</span>
                <Lock size={13} className="text-slate-400" />
              </div>
            );
          }
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `
                flex items-center gap-3.5 px-4 py-4 rounded-[22px] text-[13px] font-black uppercase tracking-widest transition-all group relative
                ${isActive 
                  ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/25 border-b-2 border-blue-700' 
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
              `}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={19} className={`transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-900 group-hover:scale-110'}`} />
                  {item.label}
                  {isActive && (
                    <motion.div 
                      layoutId="sidebar-active"
                      className="ml-auto w-2 h-2 rounded-full bg-white shadow-sm"
                    />
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        <div className="px-4 mt-12 mb-4">
           <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">Administration</p>
        </div>
        {secondaryNav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `
              flex items-center gap-3.5 px-4 py-4 rounded-[22px] text-[13px] font-black uppercase tracking-widest transition-all group
              ${isActive 
                ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 border-b-2 border-slate-950' 
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
            `}
          >
            {({ isActive }) => (
              <>
                <item.icon size={19} className={`transition-all duration-300 ${isActive ? 'text-white scale-110' : 'text-slate-400 group-hover:text-slate-900 group-hover:scale-110'}`} />
                {item.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {isApproved && (
        <div className="px-6 py-8">
          <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[32px] border border-slate-700 relative overflow-hidden group shadow-2xl">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/20 rounded-full -mr-16 -mt-16 group-hover:scale-125 transition-transform duration-700" />
             <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                   <div className="w-9 h-9 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center text-blue-400 shadow-inner">
                      <Sparkles size={18} />
                   </div>
                   <span className="text-[10px] font-black text-white uppercase tracking-widest">AI Intelligence</span>
                </div>
                <p className="text-[11px] text-slate-300 font-bold leading-relaxed">
                  <span className="text-white">12 new matches</span> found for your high-priority roles.
                </p>
                <button className="mt-4 w-full py-2.5 bg-white text-slate-900 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-50 transition-colors">
                  View Insights
                </button>
             </div>
          </div>
        </div>
      )}

      <div className="px-6 pb-8">
        <button 
          onClick={logout}
          className="w-full flex items-center gap-3 px-4 py-4 rounded-[22px] text-[13px] font-black uppercase tracking-widest text-slate-400 hover:bg-red-50 hover:text-red-600 transition-all group"
        >
          <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center group-hover:bg-red-100 transition-colors shadow-sm">
            <LogOut size={20} className="group-hover:text-red-600" />
          </div>
          Logout
        </button>
      </div>
    </div>
  );
 }
