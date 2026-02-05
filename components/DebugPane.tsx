'use client';

import { useDebug, type DebugLogEntry } from '@/contexts/DebugContext';
import { X, ChevronDown, ChevronRight, Trash2, Search, ShoppingCart, LogIn, AlertCircle, Info } from 'lucide-react';
import { useState } from 'react';

export function DebugPane() {
  const { logs, clearLogs, latestLog } = useDebug();
  const [isOpen, setIsOpen] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set([latestLog?.id || '']));

  const toggleExpand = (logId: string) => {
    setExpandedLogs((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const getIcon = (type: DebugLogEntry['type']) => {
    switch (type) {
      case 'login':
        return <LogIn className="w-4 h-4" />;
      case 'search':
        return <Search className="w-4 h-4" />;
      case 'booking':
        return <ShoppingCart className="w-4 h-4" />;
      case 'error':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: DebugLogEntry['type']) => {
    switch (type) {
      case 'login':
        return 'text-blue-600 bg-blue-50';
      case 'search':
        return 'text-green-600 bg-green-50';
      case 'booking':
        return 'text-orange-600 bg-orange-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-20 right-0 bg-easyjet-orange text-white px-3 py-2 rounded-l-lg shadow-lg hover:bg-easyjet-orange-dark transition-colors z-50"
      >
        <span className="text-sm font-semibold">Debug</span>
      </button>
    );
  }

  return (
    <div className="fixed top-16 right-0 h-[calc(100vh-4rem)] w-96 bg-white border-l border-gray-200 shadow-2xl flex flex-col z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h3 className="font-semibold text-gray-900">Debug Console</h3>
          <span className="text-xs text-gray-500">({logs.length})</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={clearLogs}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Clear logs"
          >
            <Trash2 className="w-4 h-4 text-gray-600" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 hover:bg-gray-200 rounded transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Logs */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Info className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No debug logs yet</p>
            <p className="text-xs mt-1">Actions will appear here</p>
          </div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className={`border rounded-lg overflow-hidden ${
                log.id === latestLog?.id ? 'ring-2 ring-easyjet-orange' : 'border-gray-200'
              }`}
            >
              {/* Log Header */}
              <button
                onClick={() => toggleExpand(log.id)}
                className="w-full flex items-start p-3 hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0 mr-3">
                  {expandedLogs.has(log.id) ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                </div>
                
                <div className={`flex-shrink-0 mr-3 p-2 rounded ${getTypeColor(log.type)}`}>
                  {getIcon(log.type)}
                </div>

                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm text-gray-900 truncate">
                      {log.action}
                    </h4>
                    <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {log.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  {log.details.userQuery && (
                    <p className="text-xs text-gray-600 truncate">
                      Query: "{log.details.userQuery}"
                    </p>
                  )}
                </div>
              </button>

              {/* Expanded Details */}
              {expandedLogs.has(log.id) && (
                <div className="border-t border-gray-200 bg-gray-50 p-3 space-y-2">
                  <div className="text-xs space-y-2">
                    {/* Timestamp */}
                    <div>
                      <span className="font-semibold text-gray-700">Time:</span>
                      <span className="ml-2 text-gray-600">
                        {log.timestamp.toLocaleString()}
                      </span>
                    </div>

                    {/* Type */}
                    <div>
                      <span className="font-semibold text-gray-700">Type:</span>
                      <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${getTypeColor(log.type)}`}>
                        {log.type.toUpperCase()}
                      </span>
                    </div>

                    {/* User Query */}
                    {log.details.userQuery && (
                      <div>
                        <span className="font-semibold text-gray-700">User Query:</span>
                        <p className="ml-2 text-gray-600 mt-1 p-2 bg-white rounded border border-gray-200 break-words">
                          "{log.details.userQuery}"
                        </p>
                      </div>
                    )}

                    {/* Detected Intent */}
                    {log.details.detectedIntent && (
                      <div>
                        <span className="font-semibold text-gray-700">Detected Intent:</span>
                        <span className="ml-2 px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                          {log.details.detectedIntent}
                        </span>
                      </div>
                    )}

                    {/* Agent Type */}
                    {log.details.agentType && (
                      <div>
                        <span className="font-semibold text-gray-700">Routed to:</span>
                        <span className="ml-2 text-gray-600">
                          {log.details.agentType === 'search' ? '🔍 Search Agent' : '🎫 Booking Agent'}
                        </span>
                      </div>
                    )}

                    {/* User Info */}
                    {log.details.user && (
                      <div>
                        <span className="font-semibold text-gray-700">User:</span>
                        <div className="ml-2 text-gray-600 mt-1">
                          {log.details.user.name && <div>Name: {log.details.user.name}</div>}
                          {log.details.user.email && <div>Email: {log.details.user.email}</div>}
                        </div>
                      </div>
                    )}

                    {/* Response */}
                    {log.details.response && (
                      <div>
                        <span className="font-semibold text-gray-700">Response:</span>
                        <p className="ml-2 text-gray-600 mt-1 p-2 bg-white rounded border border-gray-200 break-words max-h-32 overflow-y-auto">
                          {log.details.response}
                        </p>
                      </div>
                    )}

                    {/* Error */}
                    {log.details.error && (
                      <div>
                        <span className="font-semibold text-red-700">Error:</span>
                        <p className="ml-2 text-red-600 mt-1 p-2 bg-red-50 rounded border border-red-200 break-words">
                          {log.details.error}
                        </p>
                      </div>
                    )}

                    {/* Other Details */}
                    {Object.entries(log.details).map(([key, value]) => {
                      if (['userQuery', 'detectedIntent', 'agentType', 'response', 'error', 'user'].includes(key)) {
                        return null;
                      }
                      return (
                        <div key={key}>
                          <span className="font-semibold text-gray-700">{key}:</span>
                          <span className="ml-2 text-gray-600">
                            {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-200 p-2 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Latest action at top • Click to expand
        </p>
      </div>
    </div>
  );
}
