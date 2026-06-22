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
        <header className="h-20 bg-white border-b border-slate-100 px-12 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4 flex-1">
             <div className="relative w-[380px] group">
                <div className="absolute inset-0 bg-[#f4f7fc]/70 rounded-full group-focus-within:bg-white group-focus-within:ring-2 group-focus-within:ring-blue-600/10 transition-all duration-300 border border-slate-100" />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 z-10" size={16} />
                <input 
                  type="text" 
                  placeholder="Search candidates, jobs, skills..." 
                  className="w-full bg-transparent border-none pl-11 pr-14 py-2.5 text-xs font-bold outline-none relative z-10 placeholder:text-slate-400 text-slate-800"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
                   <kbd className="px-1.5 py-0.5 bg-white text-[10px] font-bold text-slate-400 rounded border border-slate-200">⌘</kbd>
                   <kbd className="px-1.5 py-0.5 bg-white text-[10px] font-bold text-slate-400 rounded border border-slate-200">K</kbd>
                </div>
             </div>
             
             {/* Circular plus button next to the search */}
             <button title="Quick Action" className="w-9 h-9 rounded-full bg-[#1e40af] hover:bg-blue-800 text-white flex items-center justify-center font-bold shadow-md transition-all active:scale-95 shrink-0 cursor-pointer">
               <Plus size={16} />
             </button>
          </div>

          <div className="flex items-center gap-6">
             <div className="flex items-center gap-4">
                {/* Notification Badge with 12 */}
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-500 hover:text-blue-600 transition-colors"
                >
                   <Bell size={20} />
                   <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-[9px] font-black text-white flex items-center justify-center shadow-sm">
                     12
                   </span>
                </button>
                
                {/* Messages Badge with 9 */}
                <button className="relative p-2 text-slate-500 hover:text-blue-600 transition-colors">
                   <MessageSquare size={19} />
                   <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-[9px] font-black text-white flex items-center justify-center shadow-sm">
                     9
                   </span>
                </button>
             </div>

             <AnimatePresence>
                {showNotifications && (
                  <NotificationPanel onClose={() => setShowNotifications(false)} />
                )}
             </AnimatePresence>

             <div className="h-6 w-px bg-slate-200" />

             {/* Company Profile pill */}
             <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-[#4f46e5] to-[#312e81] rounded-full overflow-hidden flex items-center justify-center text-white text-xs font-black shadow-inner border border-indigo-200">
                   {profile?.logo_url ? (
                     <img src={profile.logo_url} className="w-full h-full object-cover" alt="logo" referrerPolicy="no-referrer" />
                   ) : (
                     "TN"
                   )}
                </div>
                <div className="text-left hidden lg:block">
                   <p className="text-xs font-black text-slate-900 tracking-tight leading-none">
                     {profile?.company_name || 'TechNova Solutions'}
                   </p>
                   <p className="text-[10px] font-semibold text-slate-400 mt-1">
                     Premium Plan
                   </p>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
             </div>
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
