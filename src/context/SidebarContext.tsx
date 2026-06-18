import React, { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

interface SidebarContextType {
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  isSidebarCollapsed: boolean;
  toggleSidebarCollapse: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024;
    }
    return false;
  });

  const [isSidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('student_sidebar_collapsed');
        return saved ? saved === 'true' : false; // Default to expanded (visible labels) for pristine UX
      } catch (e) {
        console.error("Failed to read student_sidebar_collapsed from localStorage", e);
      }
    }
    return false;
  });

  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, [location.pathname]);

  const toggleSidebar = () => setSidebarOpen((prev) => !prev);
  
  const toggleSidebarCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('student_sidebar_collapsed', String(next));
      } catch (e) {
        console.error("Failed to save student_sidebar_collapsed to localStorage", e);
      }
      return next;
    });
  };

  return (
    <SidebarContext.Provider value={{ 
      isSidebarOpen, 
      toggleSidebar, 
      setSidebarOpen,
      isSidebarCollapsed,
      toggleSidebarCollapse,
      setSidebarCollapsed
    }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}
