'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { LogOut, Plane, Send, Loader2, RefreshCw, Shield } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import type { ChatMessage, A2AAuthChallenge } from '@/types';
import { useDebug } from '@/contexts/DebugContext';
import { DebugPane } from '@/components/DebugPane';
import { decodeJWT, formatJWTPayload } from '@/lib/jwt-utils';
import {
  generateCodeVerifier,
  generateState,
  storePKCESession,
  getPKCESession,
  clearPKCESession,
  buildAuthorizationUrl,
  type PKCESession
} from '@/lib/pkce';

// Session storage keys for persisting chat state
const CHAT_MESSAGES_KEY = 'chat_messages';
const CHAT_CONVERSATION_ID_KEY = 'chat_conversation_id';
const CHAT_SEARCH_RESULTS_KEY = 'chat_search_results';
const STEPUP_ACCESS_TOKEN_KEY = 'stepup_access_token';

// Helper to save messages to sessionStorage
function saveMessagesToStorage(messages: ChatMessage[]) {
  try {
    // Convert Date objects to ISO strings for serialization
    const serializable = messages.map(m => ({
      ...m,
      timestamp: m.timestamp instanceof Date ? m.timestamp.toISOString() : m.timestamp,
    }));
    sessionStorage.setItem(CHAT_MESSAGES_KEY, JSON.stringify(serializable));
  } catch (e) {
    console.error('[Chat] Failed to save messages to storage:', e);
  }
}

// Helper to restore messages from sessionStorage
function restoreMessagesFromStorage(): ChatMessage[] | null {
  try {
    const stored = sessionStorage.getItem(CHAT_MESSAGES_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    // Convert ISO strings back to Date objects
    return parsed.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch (e) {
    console.error('[Chat] Failed to restore messages from storage:', e);
    return null;
  }
}

// Helper to save conversation ID
function saveConversationIdToStorage(id: string | null) {
  try {
    if (id) {
      sessionStorage.setItem(CHAT_CONVERSATION_ID_KEY, id);
    } else {
      sessionStorage.removeItem(CHAT_CONVERSATION_ID_KEY);
    }
  } catch (e) {
    console.error('[Chat] Failed to save conversation ID:', e);
  }
}

// Helper to restore conversation ID
function restoreConversationIdFromStorage(): string | null {
  try {
    return sessionStorage.getItem(CHAT_CONVERSATION_ID_KEY);
  } catch (e) {
    return null;
  }
}

// Helper to save search results
function saveSearchResultsToStorage(results: string | null) {
  try {
    if (results) {
      sessionStorage.setItem(CHAT_SEARCH_RESULTS_KEY, results);
    } else {
      sessionStorage.removeItem(CHAT_SEARCH_RESULTS_KEY);
    }
  } catch (e) {
    console.error('[Chat] Failed to save search results:', e);
  }
}

// Helper to restore search results
function restoreSearchResultsFromStorage(): string | null {
  try {
    return sessionStorage.getItem(CHAT_SEARCH_RESULTS_KEY);
  } catch (e) {
    return null;
  }
}

// Helper to save step-up access token
function saveStepUpTokenToStorage(token: string | null) {
  try {
    if (token) {
      sessionStorage.setItem(STEPUP_ACCESS_TOKEN_KEY, token);
    } else {
      sessionStorage.removeItem(STEPUP_ACCESS_TOKEN_KEY);
    }
  } catch (e) {
    console.error('[Chat] Failed to save step-up token:', e);
  }
}

// Helper to restore step-up access token
function restoreStepUpTokenFromStorage(): string | null {
  try {
    return sessionStorage.getItem(STEPUP_ACCESS_TOKEN_KEY);
  } catch (e) {
    return null;
  }
}

// Helper to clean markdown content before rendering
// Removes code block formatting that agents sometimes wrap responses in
function cleanMarkdownContent(text: string): string {
  let cleaned = text.trim();

  // Remove fenced code blocks (triple backticks) wrapping the entire content
  const fencedCodeBlockRegex = /^```[\w]*\n?([\s\S]*?)\n?```$/;
  const match = cleaned.match(fencedCodeBlockRegex);
  if (match) {
    cleaned = match[1];
  }

  // Also handle case where content starts/ends with just triple backticks
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```[\w]*\n?/, '');
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.replace(/\n?```$/, '');
  }

  // Process each line to remove leading whitespace and inline code backticks
  return cleaned
    .split('\n')
    .map(line => {
      let lineCleaned = line.trim();
      // Remove wrapping backticks (inline code)
      if (lineCleaned.startsWith('`') && lineCleaned.endsWith('`') && lineCleaned.length > 2) {
        lineCleaned = lineCleaned.slice(1, -1);
      }
      return lineCleaned;
    })
    .join('\n')
    .trim();
}

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addLog } = useDebug();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [pendingAuth, setPendingAuth] = useState<{
    challenge: A2AAuthChallenge;
    taskId?: string;
    contextId?: string;
    agentType: 'booking' | 'search';
    originalMessage: string;
    agentUrl?: string;
  } | null>(null);
  // Store last flight search results for booking context
  const [lastSearchResults, setLastSearchResults] = useState<string | null>(null);
  // Store step-up access token for subsequent booking requests
  const [stepUpAccessToken, setStepUpAccessToken] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasRestoredState = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  // Handle token refresh errors - force re-authentication
  useEffect(() => {
    if (session?.error === 'RefreshAccessTokenError') {
      console.log('[Chat] Token refresh failed, forcing re-authentication');
      addLog({
        action: 'Session expired',
        type: 'error',
        details: {
          message: 'Access token expired and refresh failed. Re-authenticating...',
        },
      });
      // Force sign out and redirect to login to get fresh tokens
      signOut({ callbackUrl: '/' });
    }
  }, [session?.error, addLog]);

  // Log session info when chat page loads (for SSO scenarios where login page is skipped)
  const [hasLoggedSession, setHasLoggedSession] = useState(false);
  useEffect(() => {
    if (session && !hasLoggedSession) {
      console.log('[Chat] Session loaded:', {
        hasAccessToken: !!session.accessToken,
        accessTokenLength: session.accessToken?.length,
        user: session.user?.email,
      });

      // Decode access token if available
      let tokenPayload = null;
      let formattedToken = null;

      if (session.accessToken) {
        tokenPayload = decodeJWT(session.accessToken);
        if (tokenPayload) {
          formattedToken = formatJWTPayload(tokenPayload);
        }
      }

      const logDetails: Record<string, unknown> = {
        user: {
          name: session.user?.name || undefined,
          email: session.user?.email || undefined,
        },
        sessionInfo: {
          hasAccessToken: !!session.accessToken,
          hasIdToken: !!session.idToken,
          hasRefreshToken: !!session.refreshToken,
        },
      };

      if (session.accessToken && tokenPayload) {
        logDetails.accessToken = {
          raw: session.accessToken,
          decoded: formattedToken,
          issuedAt: formattedToken?.iat_readable || 'Unknown',
          expiresAt: formattedToken?.exp_readable || 'Unknown',
          subject: tokenPayload?.sub,
          issuer: tokenPayload?.iss,
          scopes: tokenPayload?.scope,
        };
      } else {
        logDetails.accessTokenStatus = 'No access token in session';
      }

      addLog({
        action: 'Session loaded on chat page',
        type: 'info',
        details: logDetails,
      });

      setHasLoggedSession(true);
    }
  }, [session, hasLoggedSession, addLog]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (messages.length > 0 && hasRestoredState.current) {
      saveMessagesToStorage(messages);
    }
  }, [messages]);

  // Save conversation ID whenever it changes
  useEffect(() => {
    if (hasRestoredState.current) {
      saveConversationIdToStorage(conversationId);
    }
  }, [conversationId]);

  // Restore chat state on initial load
  useEffect(() => {
    if (hasRestoredState.current) return;
    hasRestoredState.current = true;

    const restoredMessages = restoreMessagesFromStorage();
    const restoredConversationId = restoreConversationIdFromStorage();
    const restoredSearchResults = restoreSearchResultsFromStorage();
    const restoredStepUpToken = restoreStepUpTokenFromStorage();

    if (restoredMessages && restoredMessages.length > 0) {
      console.log('[Chat] Restored messages from storage:', restoredMessages.length);
      setMessages(restoredMessages);
    }

    if (restoredConversationId) {
      console.log('[Chat] Restored conversation ID:', restoredConversationId);
      setConversationId(restoredConversationId);
    }

    if (restoredSearchResults) {
      console.log('[Chat] Restored search results from storage');
      setLastSearchResults(restoredSearchResults);
    }

    if (restoredStepUpToken) {
      console.log('[Chat] Restored step-up access token from storage');
      setStepUpAccessToken(restoredStepUpToken);
    }
  }, []);

  // Check for step-up auth result on page load
  useEffect(() => {
    console.log('[Chat] Checking for step-up auth result in sessionStorage...');
    const stepupResult = sessionStorage.getItem('stepup_auth_result');
    console.log('[Chat] stepup_auth_result value:', stepupResult ? 'EXISTS' : 'NOT FOUND');
    if (stepupResult) {
      try {
        const result = JSON.parse(stepupResult);
        console.log('[Chat] Step-up auth result found:', result);
        console.log('[Chat] Step-up auth a2aRequest:', result.a2aRequest);
        console.log('[Chat] Step-up auth agentResponse:', result.agentResponse);

        // Clear the result from storage
        sessionStorage.removeItem('stepup_auth_result');

        // Clear any pending auth state
        setPendingAuth(null);

        // Store the Auth0 step-up token for subsequent booking requests
        if (result.stepUpTokens?.accessToken) {
          console.log('[Chat] Storing step-up access token for subsequent requests');
          setStepUpAccessToken(result.stepUpTokens.accessToken);
          saveStepUpTokenToStorage(result.stepUpTokens.accessToken);
        }

        // Add success message
        const successMessage: ChatMessage = {
          id: Date.now().toString() + '-auth-success',
          role: 'system',
          content: `Authentication successful. Your booking request has been authorized.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, successMessage]);

        // If we have an agent response, display it
        if (result.agentResponse?.result) {
          const agentResult = result.agentResponse.result;
          const task = agentResult.task || agentResult;

          // Extract response text from the task
          let responseText = '';
          if (task.artifacts?.length > 0) {
            for (const artifact of task.artifacts) {
              for (const part of artifact.parts) {
                if (part.kind === 'text' && part.text) {
                  responseText += part.text + '\n';
                }
              }
            }
          } else if (task.status?.message?.parts) {
            for (const part of task.status.message.parts) {
              if (part.kind === 'text' && part.text) {
                responseText += part.text + '\n';
              }
            }
          }

          if (responseText) {
            // Clean response text by removing code block formatting
            let cleanedResponse = responseText.trim();

            // Remove fenced code blocks (triple backticks) wrapping the entire content
            const fencedCodeBlockRegex = /^```[\w]*\n?([\s\S]*?)\n?```$/;
            const match = cleanedResponse.match(fencedCodeBlockRegex);
            if (match) {
              cleanedResponse = match[1];
            }

            // Also handle case where content starts/ends with just triple backticks
            if (cleanedResponse.startsWith('```')) {
              cleanedResponse = cleanedResponse.replace(/^```[\w]*\n?/, '');
            }
            if (cleanedResponse.endsWith('```')) {
              cleanedResponse = cleanedResponse.replace(/\n?```$/, '');
            }

            // Process each line
            cleanedResponse = cleanedResponse
              .split('\n')
              .map(line => {
                let lineCleaned = line.trim();
                // Remove wrapping backticks (inline code)
                if (lineCleaned.startsWith('`') && lineCleaned.endsWith('`') && lineCleaned.length > 2) {
                  lineCleaned = lineCleaned.slice(1, -1);
                }
                return lineCleaned;
              })
              .join('\n')
              .trim();

            const agentMessage: ChatMessage = {
              id: Date.now().toString() + '-agent-response',
              role: 'assistant',
              content: cleanedResponse,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, agentMessage]);
          }

          // Update context/conversation IDs
          if (task.contextId) {
            setConversationId(task.contextId);
          }
        }

        addLog({
          action: 'Returned from step-up authentication',
          type: 'info',
          details: {
            success: result.success,
            taskId: result.taskId,
            hasAgentResponse: !!result.agentResponse,
            a2aRequest: result.a2aRequest,
            a2aResponse: result.agentResponse,
          },
        });

      } catch (error) {
        console.error('[Chat] Error processing step-up auth result:', error);
      }
    } else {
      console.log('[Chat] No step-up auth result found in sessionStorage');
    }
  }, [addLog]);

  // Add welcome message only if no messages were restored
  useEffect(() => {
    // Only add welcome message if:
    // 1. We have a session
    // 2. No messages exist
    // 3. State restoration has completed (to avoid race condition)
    if (session && messages.length === 0 && hasRestoredState.current) {
      // Double-check storage is empty (no messages to restore)
      const storedMessages = restoreMessagesFromStorage();
      if (!storedMessages || storedMessages.length === 0) {
        setMessages([
          {
            id: 'welcome',
            role: 'assistant',
            content: `Hello ${session.user?.name || 'there'}! 👋 Welcome to Jetlag Airlines. I'm your AI travel assistant. How can I help you today?`,
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [session, messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date(),
      status: 'sending',
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Get search results from state or sessionStorage (fallback)
      const searchResults = lastSearchResults || restoreSearchResultsFromStorage();

      // Get step-up token from state or sessionStorage (fallback)
      const currentStepUpToken = stepUpAccessToken || restoreStepUpTokenFromStorage();

      console.log('[Chat] Sending message with search results:', {
        hasSearchResultsFromState: !!lastSearchResults,
        hasSearchResultsFromStorage: !!restoreSearchResultsFromStorage(),
        usingSearchResults: !!searchResults,
        searchResultsLength: searchResults?.length,
        hasStepUpToken: !!currentStepUpToken,
      });

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversationId,
          // Include last search results for booking context
          flightSearchResults: searchResults,
          // Include step-up token for booking requests
          stepUpAccessToken: currentStepUpToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Update user message status
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: 'sent' } : msg
        )
      );

      // Update conversation ID
      if (data.data.conversationId) {
        setConversationId(data.data.conversationId);
      }

      // Log the action with intent detection, A2A state, and raw payloads
      if (data.data.intent) {
        addLog({
          action: `Query processed - ${data.data.intent === 'BOOKING' ? 'Booking' : 'Search'} intent detected`,
          type: data.data.intent === 'BOOKING' ? 'booking' : 'search',
          details: {
            userQuery: inputMessage,
            detectedIntent: data.data.intent,
            agentType: data.data.agentType,
            response: data.data.message,
            conversationId: data.data.conversationId,
            a2aState: data.data.a2aState,
            needsInput: data.data.needsInput,
            isMock: data.data.isMock,
            // Include raw A2A payloads for debugging
            a2aRequest: data.data.a2aRequest,
            a2aResponse: data.data.a2aResponse,
          },
        });
      }

      // Add intent detection indicator if available
      if (data.data.intent) {
        const intentIcon = data.data.intent === 'BOOKING' ? '🎫' : '🔍';
        const intentText = data.data.intent === 'BOOKING' ? 'Booking' : 'Searching';
        const sourceText = data.data.isMock ? '(Mock)' : '(A2A)';
        const stateText = data.data.a2aState ? ` | State: ${data.data.a2aState}` : '';
        const intentMessage: ChatMessage = {
          id: Date.now().toString() + '-intent',
          role: 'system',
          content: `${intentIcon} Intent: ${intentText} → ${data.data.agentType} agent ${sourceText}${stateText}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, intentMessage]);
      }

      // Check for A2A errors in the response
      if (data.data.error) {
        console.error('[Chat] A2A error received:', data.data.error);

        // Log the error
        addLog({
          action: 'A2A Agent Error',
          type: 'error',
          details: {
            userQuery: inputMessage,
            agentType: data.data.agentType,
            error: data.data.error,
            errorDetails: data.data.data?.errorDetails,
          },
        });

        // Display error in chat
        const errorMessage: ChatMessage = {
          id: Date.now().toString() + '-a2a-error',
          role: 'system',
          content: `⚠️ **Agent Error** (${data.data.agentType || 'unknown'}): ${data.data.error}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, errorMessage]);

        // Update user message status
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
          )
        );
        return;
      }

      // Check if step-up authentication is required
      if (data.data.needsAuth && data.data.authChallenge) {
        console.log('[Chat] Step-up authentication required:', data.data.authChallenge);

        // Clear any existing step-up token since we need fresh authentication
        if (data.data.clearStepUpToken || data.data.needsAuth) {
          console.log('[Chat] Clearing existing step-up token due to new auth challenge');
          setStepUpAccessToken(null);
          saveStepUpTokenToStorage(null);
        }

        // Store the pending auth context
        setPendingAuth({
          challenge: data.data.authChallenge,
          taskId: data.data.taskId,
          contextId: data.data.contextId,
          agentType: data.data.agentType,
          originalMessage: inputMessage,
          agentUrl: data.data.agentUrl,
        });

        // Log the auth challenge
        addLog({
          action: 'Step-up authentication required',
          type: 'info',
          details: {
            provider: data.data.authChallenge.secondaryAuthProvider,
            scopes: data.data.authChallenge.scopes,
            taskId: data.data.taskId,
            contextId: data.data.contextId,
          },
        });

        // Add a system message about the auth requirement
        const authMessage: ChatMessage = {
          id: Date.now().toString() + '-auth',
          role: 'system',
          content: `🔐 Additional authorization required from ${data.data.authChallenge.secondaryAuthProvider}. Click the button below to authenticate.`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, authMessage]);
        return;
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Store search results if this was a search query (for later booking context)
      if (data.data.agentType === 'search' && data.data.message) {
        console.log('[Chat] Storing search results for booking context:', {
          messageLength: data.data.message.length,
          preview: data.data.message.substring(0, 100),
        });
        setLastSearchResults(data.data.message);
        saveSearchResultsToStorage(data.data.message);
      } else {
        console.log('[Chat] Not storing search results:', {
          agentType: data.data.agentType,
          hasMessage: !!data.data.message,
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);

      // Log the error
      addLog({
        action: 'Error processing query',
        type: 'error',
        details: {
          userQuery: inputMessage,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });

      // Update user message to error state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id ? { ...msg, status: 'error' } : msg
        )
      );

      // Add error message
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Handle step-up authentication
  const handleStepUpAuth = async () => {
    if (!pendingAuth) return;

    try {
      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const state = generateState();

      // Store session for callback
      const pkceSession: PKCESession = {
        codeVerifier,
        state,
        taskId: pendingAuth.taskId,
        contextId: pendingAuth.contextId,
        agentType: pendingAuth.agentType,
        originalMessage: pendingAuth.originalMessage,
        agentUrl: pendingAuth.agentUrl,
        tokenEndpoint: pendingAuth.challenge.tokenEndpoint,
        redirectUri: pendingAuth.challenge.redirectUri,
      };
      storePKCESession(pkceSession);

      console.log('[Chat] Initiating step-up auth with PKCE:', {
        state,
        taskId: pendingAuth.taskId,
        agentType: pendingAuth.agentType,
      });

      // Log the auth initiation
      addLog({
        action: 'Initiating step-up authentication',
        type: 'info',
        details: {
          provider: pendingAuth.challenge.secondaryAuthProvider,
          scopes: pendingAuth.challenge.scopes,
          authorizationEndpoint: pendingAuth.challenge.authorizationEndpoint,
          state,
        },
      });

      // Build and redirect to authorization URL
      const authUrl = await buildAuthorizationUrl(
        pendingAuth.challenge,
        codeVerifier,
        state
      );

      console.log('[Chat] Redirecting to authorization URL:', authUrl);
      window.location.href = authUrl;
    } catch (error) {
      console.error('[Chat] Error initiating step-up auth:', error);
      addLog({
        action: 'Step-up authentication failed',
        type: 'error',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  };

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
  };

  const handleNewChat = () => {
    // Reset conversation state
    setConversationId(null);
    setPendingAuth(null);
    clearPKCESession();

    // Clear stored chat state
    sessionStorage.removeItem(CHAT_MESSAGES_KEY);
    sessionStorage.removeItem(CHAT_CONVERSATION_ID_KEY);
    sessionStorage.removeItem(CHAT_SEARCH_RESULTS_KEY);
    setLastSearchResults(null);

    // Clear step-up token
    setStepUpAccessToken(null);
    saveStepUpTokenToStorage(null);

    const welcomeMessages: ChatMessage[] = [
      {
        id: 'welcome',
        role: 'assistant',
        content: `Hello ${session?.user?.name || 'there'}! 👋 Welcome to Jetlag Airlines. I'm your AI travel assistant. How can I help you today?`,
        timestamp: new Date(),
      },
    ];
    setMessages(welcomeMessages);
    setInputMessage('');

    // Save the welcome message to storage
    saveMessagesToStorage(welcomeMessages);

    // Log the action
    addLog({
      action: 'New chat started',
      type: 'info',
      details: {
        previousConversationId: conversationId,
        message: 'Context cleared, starting fresh conversation',
      },
    });
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-easyjet-orange to-easyjet-orange-dark">
        <Loader2 className="w-12 h-12 text-white animate-spin" />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <DebugPane />
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="bg-easyjet-orange rounded-lg p-2">
                <Plane className="w-6 h-6 text-white transform -rotate-45" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-easyjet-gray">
                  Jetlag Airlines
                </h1>
                <p className="text-xs text-gray-500">AI Travel Assistant</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-700">
                  {session.user?.name}
                </p>
                <p className="text-xs text-gray-500">{session.user?.email}</p>
              </div>
              <button
                onClick={handleNewChat}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-easyjet-orange transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Start a new conversation"
              >
                <RefreshCw className="w-4 h-4" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-easyjet-orange transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Chat Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col mr-[550px]">
        {/* Messages Area */}
        <div className="flex-1 bg-white rounded-lg shadow-lg mb-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'
                  } animate-fade-in`}
              >
                <div
                  className={`chat-message ${message.role === 'user'
                    ? 'chat-message-user'
                    : message.role === 'system'
                      ? 'bg-blue-50 text-blue-700 mr-auto text-sm italic'
                      : 'chat-message-assistant'
                    }`}
                >
                  {message.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-ol:my-1 prose-li:my-0 prose-headings:my-2 prose-pre:my-2 prose-pre:bg-gray-800 prose-pre:text-gray-100 prose-code:text-easyjet-orange prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded">
                      <ReactMarkdown>{cleanMarkdownContent(message.content)}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.status === 'error' && (
                    <p className="text-xs mt-1 opacity-70">Failed to send</p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start animate-fade-in">
                <div className="chat-message chat-message-assistant flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            {/* Step-up Authentication Button */}
            {pendingAuth && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 max-w-md">
                  <div className="flex items-start space-x-3">
                    <Shield className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-amber-800">
                        Authorization Required
                      </h4>
                      <p className="text-sm text-amber-700 mt-1">
                        To complete your booking, you need to authenticate with{' '}
                        <strong>{pendingAuth.challenge.secondaryAuthProvider}</strong>.
                      </p>
                      <p className="text-xs text-amber-600 mt-1">
                        Required scope: {pendingAuth.challenge.scopes.join(', ')}
                      </p>
                      <button
                        onClick={handleStepUpAuth}
                        className="mt-3 inline-flex items-center space-x-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
                      >
                        <Shield className="w-4 h-4" />
                        <span>Authenticate Now</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-gray-50">
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="input-field"
                disabled={isLoading}
              />
              <button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="btn-primary px-6 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">Send</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            '🔍 Show me flights from London to Paris',
            '🎫 Book the 10am flight from London to Paris',
            '✈️ What flights are available?'
          ].map((action) => (
            <button
              key={action}
              onClick={() => setInputMessage(action)}
              className="btn-secondary text-sm py-2 px-3"
              disabled={isLoading}
            >
              {action}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
