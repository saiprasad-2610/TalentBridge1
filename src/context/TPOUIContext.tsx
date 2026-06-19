import React, { createContext, useContext, useState, useEffect } from 'react';

interface TPOUIContextType {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
}

const TPOUIContext = createContext<TPOUIContextType | undefined>(undefined);

export function TPOUIProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('tpo_sidebar_collapsed');
      return saved === 'true';
    } catch (e) {
      console.warn("localStorage is blocked:", e);
      return false;
    }
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const newState = !prev;
      try {
        localStorage.setItem('tpo_sidebar_collapsed', String(newState));
      } catch (e) {
        console.warn("Storage access is blocked:", e);
      }
      return newState;
    });
  };

  return (
    <TPOUIContext.Provider value={{ isSidebarCollapsed, toggleSidebar }}>
      {children}
    </TPOUIContext.Provider>
  );
}

export function useTPOUI() {
  const context = useContext(TPOUIContext);
  if (context === undefined) {
    throw new Error('useTPOUI must be used within a TPOUIProvider');
  }
  return context;
}
