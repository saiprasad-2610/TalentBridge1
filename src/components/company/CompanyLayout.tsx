import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { CompanySidebar } from './CompanySidebar.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { 
  Bell, 
  Search, 
  Plus, 
  ChevronDown, 
  LayoutDashboard,
  Calendar,
  MessageSquare,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { NotificationPanel } from './NotificationPanel.tsx';

export function CompanyLayout() {
  const { user, profile, loading } = useAuth();
  const [showNotifications, setShowNotifications] = React.useState(false);
  const location = useLocation();

  if (loading) return null;
  
  if (!user || user.role !== 'COMPANY') {
    return <Navigate to="/login" replace />;
  }

  // Lock out and force redirect to /company/profile if not approved
  const isApproved = profile?.status === 'APPROVED';
  if (!isApproved && location.pathname !== '/company/profile') {
    return <Navigate to="/company/profile" replace />;
  }

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen font-sans selection:bg-blue-100 selection:text-blue-600">
      <CompanySidebar />
      
      <div className="flex-1 ml-72 flex flex-col min-h-screen max-w-[calc(100vw-288px)] overflow-x-hidden">
        {/* Top Navigation */}
        <header className="h-24 bg-white/70 backdrop-blur-xl border-b border-slate-100/50 px-12 flex items-center justify-between sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-8 flex-1">
             <div className="relative w-[450px] group">
                <div className="absolute inset-0 bg-slate-100/50 rounded-2xl group-focus-within:bg-white group-focus-within:ring-4 group-focus-within:ring-blue-500/10 transition-all duration-300" />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors z-10" size={20} />
                <input 
                  type="text" 
                  placeholder="Quick search talent, jobs, or market reports..." 
                  className="w-full bg-transparent border-none rounded-2xl pl-14 pr-6 py-3.5 text-sm font-black uppercase tracking-widest outline-none transition-all relative z-10 placeholder:text-slate-300"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10 opacity-0 group-focus-within:opacity-100 transition-opacity">
                   <kbd className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-md border border-slate-200">⌘</kbd>
                   <kbd className="px-1.5 py-0.5 bg-slate-100 text-[10px] font-black text-slate-400 rounded-md border border-slate-200">K</kbd>
                </div>
             </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-3 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-100/50">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center relative transition-all duration-300 hover:scale-105 active:scale-95 ${
                    showNotifications ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-white text-slate-500 hover:text-blue-600 shadow-sm'
                  }`}
                >
                   <Bell size={20} />
                   {!showNotifications && <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white animate-bounce" />}
                </button>
                <button className="w-11 h-11 rounded-xl bg-white text-slate-500 hover:text-blue-600 hover:scale-105 active:scale-95 shadow-sm transition-all duration-300 flex items-center justify-center">
                   <Calendar size={20} />
                </button>
                <button className="w-11 h-11 rounded-xl bg-white text-slate-500 hover:text-blue-600 hover:scale-105 active:scale-95 shadow-sm transition-all duration-300 flex items-center justify-center">
                   <MessageSquare size={20} />
                </button>
             </div>

             <AnimatePresence>
                {showNotifications && (
                  <NotificationPanel onClose={() => setShowNotifications(false)} />
                )}
             </AnimatePresence>

             <div className="h-10 w-px bg-slate-100 mx-2" />

             <button className="flex items-center gap-4 pl-2 pr-4 py-2 bg-slate-50/50 hover:bg-white rounded-[24px] border border-transparent hover:border-slate-100 hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-500 group">
                <div className="w-11 h-11 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform duration-500">
                   {profile?.logo_url ? <img src={profile.logo_url} className="w-full h-full object-cover" /> : profile?.company_name?.[0]}
                </div>
                <div className="text-left hidden lg:block">
                   <p className="text-[11px] font-black text-slate-900 uppercase tracking-tighter leading-none">{profile?.company_name || 'My Company'}</p>
                   <div className="flex items-center gap-1.5 mt-1.5">
                      <div className="w-1 h-1 rounded-full bg-blue-500" />
                      <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em] leading-none">Premium Workspace</p>
                   </div>
                </div>
                <ChevronDown size={16} className="text-slate-400 group-hover:text-blue-600 group-hover:translate-y-0.5 transition-all" />
             </button>
          </div>
        </header>

        {/* Main Dashboard Content */}
        <main className="p-12 max-w-[1600px] mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
