'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { LogOut, Plane, Send, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@/types';
import { useDebug } from '@/contexts/DebugContext';
import { DebugPane } from '@/components/DebugPane';

export default function ChatPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { addLog } = useDebug();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Add welcome message
  useEffect(() => {
    if (session && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: `Hello ${session.user?.name || 'there'}! 👋 Welcome to EasyJetlag. I'm your AI travel assistant. How can I help you today?`,
          timestamp: new Date(),
        },
      ]);
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
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          conversationId,
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

      // Log the action with intent detection
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
          },
        });
      }

      // Add intent detection indicator if available
      if (data.data.intent) {
        const intentIcon = data.data.intent === 'BOOKING' ? '🎫' : '🔍';
        const intentText = data.data.intent === 'BOOKING' ? 'Booking' : 'Searching';
        const intentMessage: ChatMessage = {
          id: Date.now().toString() + '-intent',
          role: 'system',
          content: `${intentIcon} Intent detected: ${intentText}`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, intentMessage]);
      }

      // Add assistant response
      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-assistant',
        role: 'assistant',
        content: data.data.message,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

  const handleSignOut = () => {
    signOut({ callbackUrl: '/' });
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
                  EasyJetlag
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
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 flex flex-col mr-96">
        {/* Messages Area */}
        <div className="flex-1 bg-white rounded-lg shadow-lg mb-4 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                } animate-fade-in`}
              >
                <div
                  className={`chat-message ${
                    message.role === 'user'
                      ? 'chat-message-user'
                      : message.role === 'system'
                      ? 'bg-blue-50 text-blue-700 mr-auto text-sm italic'
                      : 'chat-message-assistant'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
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
            '🔍 Show me flights to Paris',
            '🎫 Book the 10am flight',
            '✈️ What flights are available?',
            '📅 Reserve a seat for tomorrow',
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
