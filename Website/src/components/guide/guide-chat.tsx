"use client";

import { useState, useRef, useEffect } from "react";
import { Panel } from "@/components/ui/panel";
import { Bot, Send, Loader2, User } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function GuideChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to get response");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: error instanceof Error ? error.message : "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Panel className="flex flex-col overflow-hidden">
      {/* Header */}
      <div className="border-b border-white/[0.08] bg-arc-violet/[0.03] p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-arc-violet/40 bg-arc-violet/10">
            <Bot className="h-5 w-5 text-arc-violet" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-slate-100">Ask The Guide</h3>
            <p className="text-xs text-slate-400">AI assistant powered by your data</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4" style={{ maxHeight: "500px", minHeight: "300px" }}>
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <Bot className="mb-3 h-12 w-12 text-slate-600" />
            <p className="mb-2 text-sm font-medium text-slate-400">Start a conversation</p>
            <p className="text-xs text-slate-500">
              Ask about your stats, get advice on improving, or learn how to use the system.
            </p>
            <div className="mt-4 grid gap-2">
              <button
                onClick={() => setInput("How can I improve my weakest attribute?")}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition hover:border-arc-violet/30 hover:bg-white/[0.04]"
              >
                How can I improve my weakest attribute?
              </button>
              <button
                onClick={() => setInput("What should I focus on this week?")}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition hover:border-arc-violet/30 hover:bg-white/[0.04]"
              >
                What should I focus on this week?
              </button>
              <button
                onClick={() => setInput("How do streaks and shields work?")}
                className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-3 py-2 text-xs text-slate-300 transition hover:border-arc-violet/30 hover:bg-white/[0.04]"
              >
                How do streaks and shields work?
              </button>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                    msg.role === "user"
                      ? "border border-arc-blue/40 bg-arc-blue/10"
                      : "border border-arc-violet/40 bg-arc-violet/10"
                  }`}
                >
                  {msg.role === "user" ? (
                    <User className="h-4 w-4 text-arc-blue" />
                  ) : (
                    <Bot className="h-4 w-4 text-arc-violet" />
                  )}
                </div>
                <div
                  className={`flex-1 rounded-lg border border-white/[0.08] p-3 ${
                    msg.role === "user"
                      ? "bg-arc-blue/[0.05]"
                      : "bg-white/[0.02]"
                  }`}
                >
                  <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">
                    {msg.content}
                  </p>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-arc-violet/40 bg-arc-violet/10">
                  <Bot className="h-4 w-4 text-arc-violet" />
                </div>
                <div className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] p-3">
                  <Loader2 className="h-4 w-4 animate-spin text-arc-violet" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="border-t border-white/[0.08] p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask The Guide anything..."
            disabled={isLoading}
            className="flex-1 rounded-lg border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-arc-violet/40 focus:bg-white/[0.04] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="flex items-center gap-2 rounded-lg border border-arc-violet/40 bg-arc-violet/10 px-4 py-2 text-sm font-medium text-arc-violet transition hover:bg-arc-violet/20 disabled:opacity-50 disabled:hover:bg-arc-violet/10"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Send</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Panel>
  );
}
