import { useState, useRef, useEffect } from "react";
import { Send } from "lucide-react";

type Props = {
  onSend: (text: string) => void;
  disabled?: boolean;
};

export function ChatInput({ onSend, disabled }: Props) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 200) + "px";
    }
  }, [text]);

  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    const el = textareaRef.current;
    if (el) el.style.height = "auto";
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <div className="typing-box">
      <form onSubmit={handleSubmit} className="flex items-end gap-2 p-3">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about marketing strategy, content, campaigns... AI will automatically use the right tools"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none disabled:opacity-50 max-h-[200px]"
          style={{ lineHeight: "1.5" }}
        />

        <div className="flex items-center gap-1">
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
