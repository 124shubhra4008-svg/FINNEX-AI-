"use client";

import { useState, useRef, useEffect } from "react";
import { api } from "@/lib/api";

type Message = { role: "user" | "assistant"; text: string };

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", text: "Hi! I'm your AI financial coach. Ask me about your spending, budgets, or savings goals." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const question = input.trim();
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);
    try {
      const res = await api.chat(question);
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", text: `Sorry, something went wrong: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 btn-primary rounded-full w-14 h-14 text-xl shadow-xl"
        aria-label="Open AI chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 sm:w-96 h-[28rem] glass-card flex flex-col overflow-hidden shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/20">
        <p className="font-medium">🤖 FINNEX AI Coach</p>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 text-sm">
        {messages.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : "text-left"}>
            <span
              className={`inline-block rounded-xl px-3 py-2 max-w-[85%] ${
                m.role === "user" ? "bg-brand text-white" : "bg-slate-100 dark:bg-white/10"
              }`}
            >
              {m.text}
            </span>
          </div>
        ))}
        {loading && <p className="text-slate-400 text-xs">Thinking...</p>}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-white/20 flex gap-2">
        <input
          className="input-field text-sm"
          placeholder="Ask about your finances..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send} className="btn-primary text-sm" disabled={loading}>
          Send
        </button>
      </div>
    </div>
  );
}
