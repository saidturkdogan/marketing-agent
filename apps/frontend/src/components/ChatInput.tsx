import { useState, useRef, useEffect } from "react";
import { Send, Paperclip, ChevronDown, Search, TrendingUp, Shield, BarChart3, PenTool } from "lucide-react";

type Tool = {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
};

const TOOLS: Tool[] = [
  { id: "seo", name: "SEO Analysis", icon: <Search className="h-4 w-4" />, description: "Keyword research and on-page recommendations" },
  { id: "trends", name: "Trend Research", icon: <TrendingUp className="h-4 w-4" />, description: "Current market and industry trends" },
  { id: "policy", name: "Platform Policies", icon: <Shield className="h-4 w-4" />, description: "Social media policy compliance check" },
  { id: "competitor", name: "Competitor Analysis", icon: <BarChart3 className="h-4 w-4" />, description: "Research competitor positioning" },
  { id: "content", name: "Content Generation", icon: <PenTool className="h-4 w-4" />, description: "Generate platform-optimized content" },
];

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const [toolsOpen, setToolsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const toolsRef = useRef<HTMLDivElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [text]);

  // Close tools on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (toolsRef.current && !toolsRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    setToolsOpen(false);
    // Reset textarea height
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  function selectTool(tool: Tool) {
    setText((prev) => `${prev}[Use ${tool.name}] `);
    setToolsOpen(false);
    textareaRef.current?.focus();
  }

  return (
    <div className="typing-box">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about marketing strategy, content, campaigns..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none disabled:opacity-50 max-h-[200px]"
          style={{ lineHeight: "1.5" }}
        />

        <div className="flex items-center gap-1">
          {/* Tools dropdown */}
          <div className="relative" ref={toolsRef}>
            <button
              type="button"
              onClick={() => setToolsOpen(!toolsOpen)}
              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Tools
              <ChevronDown className={`h-3 w-3 transition-transform ${toolsOpen ? "rotate-180" : ""}`} />
            </button>

            {toolsOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-64 rounded-xl border border-slate-200 bg-white shadow-2xl z-50 py-1">
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => selectTool(tool)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                      {tool.icon}
                    </span>
                    <div>
                      <p className="font-medium text-xs">{tool.name}</p>
                      <p className="text-[11px] text-slate-400">{tool.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            type="submit"
            disabled={!text.trim() || disabled}
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}