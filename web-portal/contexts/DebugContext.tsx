'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

export interface DebugLogEntry {
  id: string;
  timestamp: Date;
  action: string;
  type: 'login' | 'search' | 'booking' | 'error' | 'info';
  details: {
    userQuery?: string;
    detectedIntent?: 'SEARCHING' | 'BOOKING';
    agentType?: 'search' | 'booking';
    response?: string;
    error?: string;
    user?: {
      name?: string;
      email?: string;
    };
    [key: string]: any;
  };
}

interface DebugContextType {
  logs: DebugLogEntry[];
  addLog: (entry: Omit<DebugLogEntry, 'id' | 'timestamp'>) => void;
  clearLogs: () => void;
  latestLog: DebugLogEntry | null;
}

const DebugContext = createContext<DebugContextType | undefined>(undefined);

export function DebugProvider({ children }: { children: ReactNode }) {
  const [logs, setLogs] = useState<DebugLogEntry[]>([]);

  const addLog = (entry: Omit<DebugLogEntry, 'id' | 'timestamp'>) => {
    const newLog: DebugLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    setLogs((prev) => [newLog, ...prev]); // Add to beginning for latest first
    
    // Also log to console for development
    console.log('[Debug Log]', newLog);
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const latestLog = logs.length > 0 ? logs[0] : null;

  return (
    <DebugContext.Provider value={{ logs, addLog, clearLogs, latestLog }}>
      {children}
    </DebugContext.Provider>
  );
}

export function useDebug() {
  const context = useContext(DebugContext);
  if (context === undefined) {
    throw new Error('useDebug must be used within a DebugProvider');
  }
  return context;
}
