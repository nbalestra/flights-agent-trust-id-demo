'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useDebug, type DebugLogEntry } from '@/contexts/DebugContext';
import { X, ChevronDown, ChevronRight, Trash2, Search, ShoppingCart, LogIn, AlertCircle, Info, Copy, Check, GripVertical } from 'lucide-react';

const DEFAULT_WIDTH = 550;
const MIN_WIDTH = 350;
const MAX_WIDTH = 900;

// Copy button component with feedback
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center space-x-1 px-2 py-1 text-xs rounded transition-colors ${
        copied
          ? 'bg-green-100 text-green-700'
          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
      }`}
      title={`Copy ${label}`}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3" />
          <span>Copied!</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3" />
          <span>Copy {label}</span>
        </>
      )}
    </button>
  );
}

export function DebugPane() {
  const { logs, clearLogs, latestLog, addLog } = useDebug();
  const [isOpen, setIsOpen] = useState(true);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<HTMLDivElement>(null);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(() => {
    // Auto-expand the latest log
    return latestLog?.id ? new Set([latestLog.id]) : new Set();
  });

  // Handle resize drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return;
    const newWidth = window.innerWidth - e.clientX;
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, newWidth)));
  }, [isResizing]);

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Auto-expand the latest log when it changes
  React.useEffect(() => {
    if (latestLog?.id) {
      setExpandedLogs((prev) => {
        const newSet = new Set(prev);
        newSet.add(latestLog.id);
        return newSet;
      });
    }
  }, [latestLog?.id]);

  // Log when logs change
  React.useEffect(() => {
    console.log('[DebugPane] Logs updated, count:', logs.length);
  }, [logs.length]);

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
    <div
      ref={resizeRef}
      className="fixed top-16 right-0 h-[calc(100vh-4rem)] bg-white border-l border-gray-200 shadow-2xl flex flex-col z-40"
      style={{ width: `${width}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={`absolute left-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-easyjet-orange/20 transition-colors flex items-center justify-center group ${isResizing ? 'bg-easyjet-orange/30' : ''}`}
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <GripVertical className="w-3 h-3 text-gray-400" />
        </div>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h3 className="font-semibold text-gray-900">Debug Console</h3>
          <span className="text-xs text-gray-500">({logs.length})</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              addLog({
                action: 'Test log entry',
                type: 'info',
                details: {
                  test: true,
                  timestamp: new Date().toISOString(),
                  message: 'This is a test to verify debug pane is working',
                },
              });
            }}
            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            title="Add test log"
          >
            Test
          </button>
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
                      Query: &quot;{log.details.userQuery}&quot;
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
                          &quot;{log.details.userQuery}&quot;
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

                    {/* Session Info */}
                    {log.details.sessionInfo && (
                      <div>
                        <span className="font-semibold text-gray-700">Session Info:</span>
                        <div className="ml-2 mt-1 p-2 bg-white rounded border border-gray-200 text-xs">
                          <div>Has Access Token: {log.details.sessionInfo.hasAccessToken ? '✅ Yes' : '❌ No'}</div>
                          <div>Has ID Token: {log.details.sessionInfo.hasIdToken ? '✅ Yes' : '❌ No'}</div>
                          <div>Has Refresh Token: {log.details.sessionInfo.hasRefreshToken ? '✅ Yes' : '❌ No'}</div>
                        </div>
                      </div>
                    )}

                    {/* Access Token (special handling) */}
                    {log.details.accessToken && (
                      <div>
                        <span className="font-semibold text-gray-700">Access Token:</span>
                        <div className="ml-2 mt-1 space-y-2">
                          {typeof log.details.accessToken === 'object' && log.details.accessToken.decoded ? (
                            <>
                              {/* Key Token Fields */}
                              <div className="p-2 bg-white rounded border border-gray-200 text-xs space-y-1">
                                {log.details.accessToken.subject && (
                                  <div><span className="font-semibold">Subject:</span> {log.details.accessToken.subject}</div>
                                )}
                                {log.details.accessToken.issuer && (
                                  <div><span className="font-semibold">Issuer:</span> {log.details.accessToken.issuer}</div>
                                )}
                                {log.details.accessToken.issuedAt && (
                                  <div><span className="font-semibold">Issued:</span> {log.details.accessToken.issuedAt}</div>
                                )}
                                {log.details.accessToken.expiresAt && (
                                  <div><span className="font-semibold">Expires:</span> {log.details.accessToken.expiresAt}</div>
                                )}
                                {log.details.accessToken.scopes && (
                                  <div><span className="font-semibold">Scopes:</span> {log.details.accessToken.scopes}</div>
                                )}
                              </div>
                              
                              {/* Full Decoded Token (collapsible) */}
                              <details className="cursor-pointer">
                                <summary className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                                  View Full Decoded Token
                                </summary>
                                <div className="mt-2">
                                  <div className="flex justify-end mb-1">
                                    <CopyButton
                                      text={JSON.stringify(log.details.accessToken.decoded, null, 2)}
                                      label="Decoded"
                                    />
                                  </div>
                                  <pre className="p-2 bg-white rounded border border-gray-200 text-xs overflow-x-auto">
                                    {JSON.stringify(log.details.accessToken.decoded, null, 2)}
                                  </pre>
                                </div>
                              </details>

                              {/* Raw Token (collapsible) */}
                              <details className="cursor-pointer">
                                <summary className="text-xs font-semibold text-blue-600 hover:text-blue-800">
                                  View Raw Token
                                </summary>
                                <div className="mt-2">
                                  <div className="flex justify-end mb-1">
                                    <CopyButton
                                      text={log.details.accessToken.raw}
                                      label="Raw Token"
                                    />
                                  </div>
                                  <pre className="p-2 bg-white rounded border border-gray-200 text-xs overflow-x-auto break-all">
                                    {log.details.accessToken.raw}
                                  </pre>
                                </div>
                              </details>
                            </>
                          ) : (
                            <div className="text-gray-500 text-xs">
                              {String(log.details.accessToken)}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Raw Session (for debugging) */}
                    {log.details.rawSession && (
                      <details className="cursor-pointer">
                        <summary className="text-xs font-semibold text-purple-600 hover:text-purple-800">
                          View Raw Session Object
                        </summary>
                        <pre className="mt-2 p-2 bg-white rounded border border-gray-200 text-xs overflow-x-auto">
                          {log.details.rawSession}
                        </pre>
                      </details>
                    )}

                    {/* A2A Request */}
                    {log.details.a2aRequest && (
                      <div>
                        <details className="cursor-pointer">
                          <summary className="font-semibold text-blue-700 hover:text-blue-900">
                            📤 A2A Request
                          </summary>
                          <div className="mt-2">
                            <div className="flex justify-end mb-1">
                              <CopyButton
                                text={JSON.stringify(log.details.a2aRequest, null, 2)}
                                label="Request"
                              />
                            </div>
                            <pre className="p-2 bg-blue-50 rounded border border-blue-200 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                              {JSON.stringify(log.details.a2aRequest, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* A2A Response */}
                    {log.details.a2aResponse && (
                      <div>
                        <details className="cursor-pointer">
                          <summary className="font-semibold text-green-700 hover:text-green-900">
                            📥 A2A Response
                          </summary>
                          <div className="mt-2">
                            <div className="flex justify-end mb-1">
                              <CopyButton
                                text={JSON.stringify(log.details.a2aResponse, null, 2)}
                                label="Response"
                              />
                            </div>
                            <pre className="p-2 bg-green-50 rounded border border-green-200 text-xs overflow-x-auto max-h-64 overflow-y-auto">
                              {JSON.stringify(log.details.a2aResponse, null, 2)}
                            </pre>
                          </div>
                        </details>
                      </div>
                    )}

                    {/* Other Details */}
                    {Object.entries(log.details).map(([key, value]) => {
                      if (['userQuery', 'detectedIntent', 'agentType', 'response', 'error', 'user', 'accessToken', 'sessionInfo', 'rawSession', 'a2aRequest', 'a2aResponse'].includes(key)) {
                        return null;
                      }
                      return (
                        <div key={key}>
                          <span className="font-semibold text-gray-700">{key}:</span>
                          <div className="ml-2 text-gray-600 mt-1">
                            {typeof value === 'object' ? (
                              <pre className="p-2 bg-white rounded border border-gray-200 text-xs overflow-x-auto">
                                {JSON.stringify(value, null, 2)}
                              </pre>
                            ) : (
                              <span>{String(value)}</span>
                            )}
                          </div>
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
