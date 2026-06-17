import React, { useState } from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar.tsx';
import { useSidebar } from '../../context/SidebarContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { AlertCircle, X } from 'lucide-react';

export function StudentLayout() {
  const { isSidebarCollapsed } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(true);

  // If onboarding is not completed, redirect to /onboarding
  if (profile && (profile.onboarding_completed === 0 || !profile.onboarding_completed)) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  const score = profile?.completeness_score || 0;

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen">
      <StudentSidebar />
      <main className={`flex-1 p-4 lg:p-6 pb-12 overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {showWarning && score < 70 && location.pathname !== '/profile' && (
          <div className="mb-6 flex items-start justify-between p-4 bg-amber-50 border border-amber-200 rounded-2xl shadow-sm text-amber-800 text-xs sm:text-sm font-medium">
            <div className="flex gap-2.5 items-center">
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
              <div>
                <span className="font-extrabold text-amber-900">Profile Incomplete ({score}%)</span>. Please complete missing fields in your profile to obtain at least 70% completeness to enable job applications and unlock full AI features.
              </div>
            </div>
            <button 
              onClick={() => setShowWarning(false)}
              className="p-1 hover:bg-amber-100 rounded-lg text-amber-500 hover:text-amber-700 transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
