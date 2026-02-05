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
    accessToken?: {
      raw: string;
      decoded: any;
      issuedAt: string;
      expiresAt: string;
      subject?: string;
      issuer?: string;
      audience?: string | string[];
      scopes?: string;
    } | string;
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
  const [logs, setLogs] = useState<DebugLogEntry[]>(() => {
    // Load logs from localStorage on mount
    if (typeof window !== 'undefined') {
      try {
        const savedLogs = localStorage.getItem('debugLogs');
        if (savedLogs) {
          const parsed = JSON.parse(savedLogs);
          // Convert timestamp strings back to Date objects
          return parsed.map((log: any) => ({
            ...log,
            timestamp: new Date(log.timestamp),
          }));
        }
      } catch (error) {
        console.error('[DebugContext] Error loading logs:', error);
      }
    }
    return [];
  });

  const addLog = (entry: Omit<DebugLogEntry, 'id' | 'timestamp'>) => {
    console.log('[DebugContext] addLog called with:', entry);
    
    const newLog: DebugLogEntry = {
      ...entry,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    console.log('[DebugContext] New log created:', newLog);

    setLogs((prev) => {
      const updated = [newLog, ...prev]; // Add to beginning for latest first
      
      // Persist to localStorage
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('debugLogs', JSON.stringify(updated.slice(0, 50))); // Keep last 50
        } catch (error) {
          console.error('[DebugContext] Error saving logs:', error);
        }
      }
      
      return updated;
    });
    
    // Also log to console for development
    console.log('[Debug Log Added]', newLog);
  };

  const clearLogs = () => {
    console.log('[DebugContext] Clearing all logs');
    setLogs([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('debugLogs');
    }
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
