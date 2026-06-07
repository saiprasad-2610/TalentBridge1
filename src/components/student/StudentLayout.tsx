import React from 'react';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { StudentSidebar } from './StudentSidebar.tsx';
import { useSidebar } from '../../context/SidebarContext.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

export function StudentLayout() {
  const { isSidebarCollapsed } = useSidebar();
  const { profile } = useAuth();
  const location = useLocation();

  // If onboarding is not completed, redirect to /onboarding
  if (profile && (profile.onboarding_completed === 0 || !profile.onboarding_completed)) {
    if (location.pathname !== '/onboarding') {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return (
    <div className="flex bg-[#F8FAFC] min-h-screen">
      <StudentSidebar />
      <main className={`flex-1 p-4 lg:p-6 pb-12 overflow-x-hidden transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Outlet />
      </main>
    </div>
  );
}
