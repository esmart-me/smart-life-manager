// src/components/assistant/FloatingAiAssistant.tsx
// Premium Floating AI Assistant for Smart Life Manager.
// Features:
// - Subtle pulsing floating button with sparkle animation
// - Respects prefers-reduced-motion
// - Desktop: Floating card panel (400px) above button
// - Mobile: Full-width bottom drawer with safe area awareness
// - Connects directly to existing secure /api/ai/chat endpoint
// - Strictly read-only, zero-mock, grounded customer data access

"use client";

import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  X,
  Send,
  RotateCcw,
  Bot,
  Bell,
  FileText,
  Car,
  CreditCard,
  DollarSign,
  Calendar,
  ShieldCheck,
  Maximize2,
  Minimize2,
  ChevronDown,
} from "lucide-react";
import { MarkdownView } from "./MarkdownView";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

const QUICK_SUGGESTIONS = [
  {
    icon: Bell,
    label: "My Reminders",
    query: "My upcoming reminders",
    color: "text-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60",
  },
  {
    icon: FileText,
    label: "Expiring Documents",
    query: "Do I have any expired documents or upcoming renewals?",
    color: "text-blue-500 bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900/60",
  },
  {
    icon: Car,
    label: "My Vehicles",
    query: "What vehicles do I have?",
    color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60",
  },
  {
    icon: CreditCard,
    label: "Upcoming Payments",
    query: "What payments are coming up?",
    color: "text-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900/60",
  },
  {
    icon: DollarSign,
    label: "This Month’s Expenses",
    query: "How much have I spent this month?",
    color: "text-rose-500 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60",
  },
  {
    icon: Calendar,
    label: "Important Dates",
    query: "What important dates are coming up?",
    color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900/60",
  },
];

export function FloatingAiAssistant() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // If user is already on the dedicated /assistant page, hide the floating widget
  const isDedicatedPage = pathname.startsWith("/assistant");

  // Scroll to bottom whenever messages or loading state changes
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isGenerating, isOpen]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        textareaRef.current?.focus();
      }, 150);
    }
  }, [isOpen]);

  // Handle Escape key to close panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  if (isDedicatedPage) {
    return null;
  }

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || isGenerating) return;

    setInput("");
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsGenerating(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          conversationId: conversationId || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        // Safe, sanitized error message without technical leak
        setErrorMessage("Sorry, I couldn't process that right now. Please try again.");
        return;
      }

      if (json.data?.conversationId && !conversationId) {
        setConversationId(json.data.conversationId);
      }

      const assistantMessage: ChatMessage = {
        id: json.data?.messageId || `ai-${Date.now()}`,
        role: "assistant",
        content: json.data?.reply || "I checked your account records, but no details were returned.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      setErrorMessage("Sorry, I couldn't process that right now. Please try again.");
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

  const handleResetChat = () => {
    setMessages([]);
    setConversationId(null);
    setErrorMessage(null);
    setInput("");
    textareaRef.current?.focus();
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. Mobile Backdrop Overlay (only on mobile viewports when open)            */}
      {/* ========================================================================= */}
      {isOpen && (
        <div
          aria-hidden="true"
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-[2px] md:hidden transition-opacity duration-200"
        />
      )}

      {/* ========================================================================= */}
      {/* 2. Floating AI Assistant Panel                                             */}
      {/* ========================================================================= */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Smart Life AI Assistant"
        className={`fixed z-50 transition-all duration-300 ease-out motion-reduce:transition-none
          /* Mobile: Bottom Sheet Drawer */
          inset-x-0 bottom-0 top-16 md:top-auto md:inset-x-auto
          /* Desktop: Floating Window positioned above floating button */
          md:bottom-24 md:right-6 md:w-[410px] md:h-[600px] md:max-h-[82vh]
          ${
            isOpen
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto"
              : "opacity-0 translate-y-6 scale-95 pointer-events-none"
          }
        `}
      >
        <div className="flex flex-col h-full bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 shadow-2xl rounded-t-3xl md:rounded-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3.5 bg-gradient-to-r from-slate-900 via-brand-950 to-slate-900 text-white border-b border-slate-800 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 shadow-md shadow-brand-500/30">
                <Sparkles className="w-4 h-4 text-white" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm tracking-tight text-white">Smart Life AI</span>
                  <span className="text-[10px] font-medium text-emerald-400 bg-emerald-950/70 border border-emerald-800/60 px-1.5 py-0.2 rounded-full">
                    Ready
                  </span>
                </div>
                <p className="text-[11px] text-slate-300/80 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-brand-400" />
                  Private Account Data • Read-Only
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Start fresh conversation"
                  aria-label="Start fresh conversation"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                title="Close AI Assistant (Esc)"
                aria-label="Close AI Assistant"
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/80 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
              >
                <ChevronDown className="w-4 h-4 md:hidden" />
                <X className="w-4 h-4 hidden md:block" />
              </button>
            </div>
          </div>

          {/* Messages & Content Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 text-sm bg-slate-50/50 dark:bg-slate-950/40">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-4 space-y-4 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-500/20 to-indigo-500/20 dark:from-brand-500/10 dark:to-indigo-500/10 flex items-center justify-center text-brand-600 dark:text-brand-400 border border-brand-200/50 dark:border-brand-900/40 shadow-inner">
                  <Bot className="w-6 h-6" />
                </div>

                <div className="space-y-1 max-w-xs">
                  <h3 className="font-semibold text-base text-slate-900 dark:text-slate-100">
                    Hi! I’m your Smart Life Assistant 👋
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    I can help you find and summarize information from your Smart Life Manager.
                  </p>
                </div>

                {/* Data Trust Indicator */}
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-800 shadow-2xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Using your private account data (Read-Only)</span>
                </div>

                {/* Quick Action Suggestion Chips */}
                <div className="w-full pt-2">
                  <p className="text-[11px] font-semibold tracking-wider text-slate-400 dark:text-slate-500 uppercase mb-2 text-left px-1">
                    Quick Suggestions
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                    {QUICK_SUGGESTIONS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => handleSendMessage(item.query)}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-medium transition-all hover:scale-[1.02] active:scale-[0.98] shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 ${item.color}`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex flex-col ${
                      m.role === "user" ? "items-end" : "items-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-2xs ${
                        m.role === "user"
                          ? "bg-brand-600 text-white rounded-br-xs"
                          : "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-xs border border-slate-200/80 dark:border-slate-700/80"
                      }`}
                    >
                      {m.role === "user" ? (
                        <p className="whitespace-pre-wrap leading-relaxed text-sm">{m.content}</p>
                      ) : (
                        <div className="prose-xs">
                          <MarkdownView content={m.content} />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 px-1">
                      {m.role === "assistant" ? "Smart Life AI • " : ""}{m.timestamp}
                    </span>
                  </div>
                ))}

                {/* Thinking / Loading State */}
                {isGenerating && (
                  <div className="flex flex-col items-start">
                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-2xl rounded-bl-xs px-4 py-3 shadow-2xs">
                      <Sparkles className="w-4 h-4 text-brand-500 animate-spin motion-reduce:animate-none" />
                      <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                        Thinking
                      </span>
                      <span className="inline-flex gap-1 items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce motion-reduce:animate-none [animation-delay:-0.3s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce motion-reduce:animate-none [animation-delay:-0.15s]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-bounce motion-reduce:animate-none" />
                      </span>
                    </div>
                  </div>
                )}

                {/* Error Banner */}
                {errorMessage && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                    <span>{errorMessage}</span>
                    <button
                      type="button"
                      onClick={() => handleSendMessage()}
                      className="ml-2 font-semibold underline hover:no-underline"
                    >
                      Retry
                    </button>
                  </div>
                )}
              </>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 rounded-2xl p-1.5 border border-slate-200 dark:border-slate-700 focus-within:border-brand-500 dark:focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-500/20 transition-all"
            >
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about your life data..."
                disabled={isGenerating}
                className="flex-1 bg-transparent px-2.5 py-1 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none focus:outline-none max-h-24 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!input.trim() || isGenerating}
                title="Send message (Enter)"
                aria-label="Send message"
                className="p-2 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-600 text-white disabled:opacity-30 disabled:pointer-events-none hover:shadow-md hover:shadow-brand-500/25 active:scale-95 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-400 dark:text-slate-500">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500" />
                Based on your Smart Life Manager data
              </span>
              <span>Enter to send</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. Floating AI Assistant Action Button                                      */}
      {/* ========================================================================= */}
      <div
        className={`fixed z-40 transition-all duration-300
          /* Mobile: Positioned cleanly above mobile bottom navigation (h-16 + spacing) */
          bottom-20 right-4
          /* Desktop: Positioned in bottom-right corner */
          md:bottom-6 md:right-6
          ${isOpen ? "scale-90 opacity-0 pointer-events-none md:scale-100 md:opacity-100 md:pointer-events-auto" : "scale-100 opacity-100"}
        `}
      >
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-label={isOpen ? "Close AI Assistant" : "Open Smart Life AI Assistant"}
          className="group relative flex items-center gap-2 px-4 py-3 rounded-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white font-medium text-xs sm:text-sm shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-105 active:scale-95 transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-brand-400/50 cursor-pointer select-none"
        >
          {/* Subtle Ambient Pulse Ring (Respects reduced motion) */}
          <span
            aria-hidden="true"
            className="absolute -inset-1 rounded-full bg-gradient-to-r from-brand-500 to-purple-500 opacity-40 blur-sm group-hover:opacity-75 animate-pulse motion-reduce:animate-none pointer-events-none"
          />

          {/* Button Content */}
          <span className="relative flex items-center justify-center w-5 h-5 rounded-full bg-white/20 backdrop-blur-xs">
            <Sparkles className="w-3.5 h-3.5 text-white animate-spin-slow motion-reduce:animate-none" />
          </span>

          <span className="relative tracking-tight font-semibold">
            {isOpen ? "Close AI" : "Ask Smart Life"}
          </span>

          {/* Online green indicator */}
          <span
            aria-hidden="true"
            className="relative w-2 h-2 rounded-full bg-emerald-400 shadow-sm"
          />
        </button>
      </div>
    </>
  );
}
