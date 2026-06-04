import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "../types";
import { ChatInput } from "./ChatInput";
import { sendChatMessage } from "../api";

type Props = {
  companyId: string;
  conversationId: string | null;
};

export function ChatView({ companyId }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isStreaming]);

  function addMessage(
    role: "user" | "assistant",
    content: string,
  ): ChatMessage {
    const msg: ChatMessage = {
      id: crypto.randomUUID(),
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }

  async function handleSend(text: string) {
    addMessage("user", text);

    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsStreaming(true);

    try {
      const data = await sendChatMessage(companyId, text);
      const response = data.response || "No response received.";

      // Stream response character by character for visual effect
      let streamed = "";
      for (let i = 0; i < response.length; i++) {
        streamed += response[i];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsg.id ? { ...msg, content: streamed } : msg,
          ),
        );
        await sleep(15 + Math.random() * 10);
      }
    } catch (err) {
      const errorMsg =
        err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, content: `⚠️ ${errorMsg}. Please try again.` }
            : msg,
        ),
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-700">
          Marketing AI Chat
        </h2>
        <p className="text-xs text-slate-400">
          AI automatically selects and runs tools (SEO, Trends, Platform Specs,
          Policy Check) based on your query
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50">
                <svg
                  className="h-8 w-8 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-slate-800 mb-1">
                Start a conversation
              </h3>
              <p className="text-sm text-slate-400 max-w-md">
                AI automatically uses SEO, trends, platform specs, and policy
                tools as needed. Just describe what you need — no manual tool
                selection required.
              </p>

              {/* Quick prompts */}
              <div className="mt-6 grid gap-2 w-full max-w-sm">
                {[
                  "Create a 30-day Instagram content plan",
                  "Write 3 LinkedIn posts for brand awareness",
                  "Analyze SEO keywords for my industry",
                  "Generate a weekly marketing campaign plan",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSend(prompt)}
                    className="rounded-xl border border-slate-200 px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="message-user text-sm text-slate-700 whitespace-pre-wrap">
                  {msg.content}
                </div>
              ) : (
                <div className="message-assistant">
                  {msg.content ? (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:0ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:150ms]" />
                        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:300ms]" />
                      </span>
                      AI is analyzing and selecting tools...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="mx-auto max-w-3xl">
          <ChatInput onSend={handleSend} disabled={isStreaming} />
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
