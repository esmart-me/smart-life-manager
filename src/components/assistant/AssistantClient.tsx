// src/components/assistant/AssistantClient.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Send,
  PlusCircle,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Car,
  FileText,
  Wallet,
  Calendar,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Info,
} from "lucide-react";
import { SessionUser } from "@/types";
import { AiStatusResponse, AiConversationSummaryDTO } from "@/lib/ai/types";
import { MarkdownView } from "./MarkdownView";

interface AssistantClientProps {
  initialStatus: AiStatusResponse;
  user: SessionUser;
}

interface MessageItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
}

const SUGGESTED_PROMPTS = [
  {
    icon: Wallet,
    text: "What bills or payments are due this month?",
  },
  {
    icon: FileText,
    text: "Do I have any expired documents or upcoming renewals?",
  },
  {
    icon: Car,
    text: "Summarize my vehicles, mileage, and insurance dates.",
  },
  {
    icon: Clock,
    text: "What are my high-priority reminders and upcoming tasks?",
  },
  {
    icon: Calendar,
    text: "Give me an overview of all my upcoming important dates and events.",
  },
];

export function AssistantClient({ initialStatus, user }: AssistantClientProps) {
  const [status, setStatus] = useState<AiStatusResponse>(initialStatus);
  const [conversations, setConversations] = useState<AiConversationSummaryDTO[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [activeTitle, setActiveTitle] = useState<string>("New Conversation");
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isGenerating]);

  // Load conversations list on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/ai/conversations");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setConversations(json.data);
          // If no active conversation and there is history, select the first one
          if (!activeConversationId && json.data.length > 0) {
            loadConversation(json.data[0].id);
          }
        }
      }
    } catch (err) {
      console.error("Failed to load conversations:", err);
    }
  };

  const loadConversation = async (id: string) => {
    setIsLoadingHistory(true);
    setErrorBanner(null);
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setActiveConversationId(json.data.id);
          setActiveTitle(json.data.title);
          setMessages(
            json.data.messages.map((m: any) => ({
              id: m.id,
              role: m.role,
              content: m.content,
              createdAt: m.createdAt,
            }))
          );
        }
      } else {
        setErrorBanner("Failed to load conversation details.");
      }
    } catch (err) {
      console.error("Error loading conversation:", err);
      setErrorBanner("Network error loading conversation.");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleStartNewChat = () => {
    setActiveConversationId(null);
    setActiveTitle("New Conversation");
    setMessages([]);
    setErrorBanner(null);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/ai/conversations/${id}`, { method: "DELETE" });
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (activeConversationId === id) {
          handleStartNewChat();
        }
      }
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isGenerating) return;

    setErrorBanner(null);
    setInputMessage("");

    // Optimistic user message
    const tempUserId = `user-${Date.now()}`;
    const optimisticMessage: MessageItem = {
      id: tempUserId,
      role: "user",
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          conversationId: activeConversationId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        const errorMsg =
          json?.error?.message || "Failed to generate AI response. Please try again.";
        setErrorBanner(errorMsg);

        // If unconfigured, update live status
        if (json?.error?.code === "AI_NOT_CONFIGURED") {
          setStatus((prev) => ({ ...prev, configured: false, message: errorMsg }));
        }
        return;
      }

      // Append assistant response
      const assistantMessage: MessageItem = {
        id: json.data.messageId || `asst-${Date.now()}`,
        role: "assistant",
        content: json.data.reply,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If this was a new conversation, set active ID and refresh list
      if (!activeConversationId && json.data.conversationId) {
        setActiveConversationId(json.data.conversationId);
        setActiveTitle(json.data.conversationTitle || "New Conversation");
        fetchConversations();
      }
    } catch (err: any) {
      console.error("Failed to send AI message:", err);
      setErrorBanner("A network error occurred while connecting to the AI Assistant.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-130px)] min-h-[550px] max-w-7xl mx-auto rounded-2xl border border-theme-border glass-card shadow-xl overflow-hidden animate-card-enter">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-theme-border glass-panel">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 rounded-lg text-theme-text-muted hover:text-theme-text-primary hover:bg-theme-glass-subtle transition-colors"
            title={sidebarOpen ? "Hide conversations" : "Show conversations"}
            aria-label="Toggle conversation sidebar"
          >
            {sidebarOpen ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>

          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl btn-theme-accent text-white shadow-theme-glow">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-theme-text-primary">
                  Smart AI Assistant
                </h1>
                <span className="hidden sm:inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-theme-accent-subtle text-theme-accent border border-theme-accent/30">
                  Read-Only Mode
                </span>
              </div>
              <p className="text-xs text-theme-text-muted truncate max-w-[240px] sm:max-w-md">
                {activeTitle}
              </p>
            </div>
          </div>
        </div>

        {/* Right Status Indicator */}
        <div className="flex items-center gap-2 sm:gap-3">
          {status.configured ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">AI Operational</span>
              <span className="sm:hidden">Online</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Configuration Required</span>
              <span className="sm:hidden">Awaiting Key</span>
            </div>
          )}

          <button
            onClick={handleStartNewChat}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl btn-theme-accent text-white text-xs font-bold shadow-theme-glow transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
          </button>
        </div>
      </div>

      {/* Main Split Area (Conversations Sidebar + Chat Thread) */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Left Conversations Sidebar */}
        {sidebarOpen && (
          <aside className="w-64 sm:w-72 flex flex-col border-r border-theme-border glass-subtle">
            <div className="p-3 border-b border-theme-border flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted">
                Conversations
              </span>
              <button
                onClick={fetchConversations}
                className="p-1 rounded text-theme-text-muted hover:text-theme-text-primary"
                title="Refresh list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {conversations.length === 0 ? (
                <div className="p-4 text-center text-xs text-theme-text-muted">
                  No conversation history yet. Start a new chat!
                </div>
              ) : (
                conversations.map((conv) => {
                  const isActive = conv.id === activeConversationId;
                  return (
                    <div
                      key={conv.id}
                      onClick={() => loadConversation(conv.id)}
                      className={`group flex items-center justify-between p-2.5 rounded-xl text-xs cursor-pointer transition-all ${
                        isActive
                          ? "bg-theme-accent-subtle text-theme-accent font-semibold shadow-xs border border-theme-accent/30"
                          : "text-theme-text-secondary hover:text-theme-text-primary hover:bg-theme-glass-subtle"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <MessageSquare className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="truncate">{conv.title}</span>
                      </div>
                      <button
                        onClick={(e) => handleDeleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-theme-text-muted hover:text-rose-500 transition-opacity"
                        title="Delete conversation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 border-t border-theme-border glass-panel">
              <div className="flex items-center gap-2 text-[11px] text-theme-text-muted">
                <Info className="w-3.5 h-3.5 flex-shrink-0 text-theme-accent" />
                <span>Isolated per user. Grounded in your account data.</span>
              </div>
            </div>
          </aside>
        )}

        {/* Center Chat View */}
        <div className="flex-1 flex flex-col min-w-0 bg-transparent">
          {/* Unconfigured Alert Banner */}
          {!status.configured && (
            <div className="m-4 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-500 mt-0.5" />
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-sm">
                    Smart AI is Currently Unavailable
                  </div>
                  <p>
                    Please verify your Google Gemini API key configuration in Admin Settings or check your internet connection.
                  </p>
                  {(user.role === "admin" || user.role === "super_admin") && (
                    <a
                      href="/admin/settings"
                      className="inline-block mt-1 text-xs font-semibold text-theme-accent underline hover:no-underline"
                    >
                      Configure Gemini API Key in Admin Settings &rarr;
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Error Banner */}
          {errorBanner && (
            <div className="mx-4 mt-3 p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{errorBanner}</span>
              </div>
              <button
                onClick={() => setErrorBanner(null)}
                className="text-rose-500 hover:text-rose-700 font-bold ml-2"
              >
                &times;
              </button>
            </div>
          )}

          {/* Scrollable Chat Message Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {isLoadingHistory ? (
              <div className="flex flex-col items-center justify-center h-full text-theme-text-muted text-xs space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-theme-accent" />
                <span>Loading conversation history...</span>
              </div>
            ) : messages.length === 0 ? (
              /* Empty State with Suggested Prompts */
              <div className="max-w-2xl mx-auto py-8 sm:py-12 text-center">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl btn-theme-accent flex items-center justify-center text-white shadow-theme-glow">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h2 className="text-lg font-bold text-theme-text-primary">
                  Hello, {user.displayName || user.firstName || "there"}!
                </h2>
                <p className="mt-1 text-xs sm:text-sm text-theme-text-muted max-w-md mx-auto">
                  I am your Smart Life Assistant. I can review your documents, reminders, vehicles, bills, and important dates, and answer your questions safely.
                </p>

                <div className="mt-8 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wider text-theme-text-muted mb-3 px-1">
                    Suggested questions to try:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {SUGGESTED_PROMPTS.map((prompt, idx) => {
                      const Icon = prompt.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(prompt.text)}
                          disabled={!status.configured}
                          className="flex items-start gap-3 p-3 text-left rounded-xl border border-theme-border glass-card glass-card-hover hover:border-theme-accent/50 hover:bg-theme-accent-subtle transition-all text-xs text-theme-text-primary disabled:opacity-50 disabled:cursor-not-allowed group shadow-2xs"
                        >
                          <div className="p-2 rounded-lg bg-theme-glass-subtle text-theme-text-secondary group-hover:text-theme-accent transition-colors">
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="mt-0.5 leading-snug">{prompt.text}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              /* Message Thread */
              messages.map((m) => {
                const isUser = m.role === "user";
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-3 ${
                      isUser ? "justify-end" : "justify-start"
                    }`}
                  >
                    {!isUser && (
                      <div className="w-8 h-8 rounded-xl btn-theme-accent flex items-center justify-center text-white flex-shrink-0 shadow-theme-glow mt-0.5">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs sm:text-sm leading-relaxed shadow-sm ${
                        isUser
                          ? "btn-theme-accent text-white rounded-tr-sm"
                          : "glass-card text-theme-text-primary rounded-tl-sm border border-theme-border"
                      }`}
                    >
                      {isUser ? (
                        <div className="whitespace-pre-wrap">{m.content}</div>
                      ) : (
                        <MarkdownView content={m.content} />
                      )}
                    </div>

                    {isUser && (
                      <div className="w-8 h-8 rounded-xl bg-theme-accent-subtle text-theme-accent flex items-center justify-center font-semibold text-xs flex-shrink-0 mt-0.5 border border-theme-accent/30">
                        {(user.displayName || user.firstName || user.email || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {/* Generating typing indicator */}
            {isGenerating && (
              <div className="flex items-start gap-3 justify-start">
                <div className="w-8 h-8 rounded-xl btn-theme-accent flex items-center justify-center text-white flex-shrink-0 shadow-theme-glow mt-0.5">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <div className="glass-card border border-theme-border rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5 text-xs text-theme-text-muted">
                  <span>Analyzing your account records</span>
                  <span className="flex gap-1 ml-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-theme-accent animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Bottom Chat Input Bar */}
          <div className="p-3 sm:p-4 border-t border-theme-border glass-panel">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-end gap-2 max-w-4xl mx-auto"
            >
              <div className="flex-1 relative">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={
                    status.configured
                      ? "Ask about your documents, bills, vehicles, reminders... (Enter to send)"
                      : "AI Assistant is awaiting GEMINI_API_KEY configuration..."
                  }
                  disabled={!status.configured || isGenerating}
                  rows={1}
                  className="w-full resize-none rounded-xl border border-theme-border glass-input px-3.5 py-2.5 text-xs sm:text-sm text-theme-text-primary placeholder:text-theme-text-muted focus:outline-none focus:ring-2 focus:ring-theme-accent/40 focus:border-theme-accent disabled:opacity-60 disabled:cursor-not-allowed max-h-32 transition-all shadow-inner"
                  style={{ minHeight: "42px" }}
                />
              </div>

              <button
                type="submit"
                disabled={!status.configured || !inputMessage.trim() || isGenerating}
                className="h-[42px] px-4 rounded-xl btn-theme-accent text-white font-medium text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-theme-glow flex-shrink-0 active:scale-95"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
                <span className="hidden sm:inline">Send</span>
              </button>
            </form>

            <div className="mt-2 text-center text-[10px] text-theme-text-muted">
              AI responses are strictly grounded in your authenticated account data and operate in read-only mode.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
