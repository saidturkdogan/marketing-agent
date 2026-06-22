import { useState, useEffect, useCallback } from "react";
import {
  getGmailStatus,
  getGmailAuthUrl,
  fetchGmailEmails,
  getGmailMessages,
  sendGmailEmail,
  draftGmailReply,
} from "../api";
import {
  Mail,
  Send,
  Sparkles,
  RefreshCw,
  Search,
  Inbox,
  AlertCircle,
  CheckCircle2,
  User,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Separator } from "./ui/separator";

type MailMessage = {
  id: number;
  messageId: string;
  from: string;
  to: string;
  subject: string;
  snippet: string;
  body?: string;
  receivedAt: string;
  agentStatus?: string;
  agentDraft?: string;
  agentLabel?: string;
  agentPriority?: string;
};

const isHtml = (text: string) => {
  const trimmed = text.trim();
  return (
    trimmed.startsWith("<") ||
    trimmed.includes("<!DOCTYPE") ||
    trimmed.includes("<html") ||
    trimmed.includes("<body") ||
    trimmed.includes("<p>") ||
    trimmed.includes("</div>") ||
    trimmed.includes("</td>")
  );
};

const isNoReply = (from: string) => {
  const email = from.toLowerCase();
  return email.includes("noreply") || email.includes("no-reply");
};

function SafeHtmlRenderer({ html }: { html: string }) {
  return (
    <iframe
      srcDoc={`<!DOCTYPE html><html><head><style>body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.5; color: #374151; margin: 0; padding: 12px; } img { max-width: 100%; height: auto; }</style></head><body>${html}</body></html>`}
      title="Email Content"
      className="w-full border border-gray-100 min-h-[450px] bg-white rounded-lg shadow-sm"
      sandbox="allow-popups allow-popups-to-escape-sandbox"
    />
  );
}

type Props = {
  companyId: string;
};

export function MailsView({ companyId }: Props) {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [selectedMail, setSelectedMail] = useState<MailMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [authUrl, setAuthUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [sending, setSending] = useState(false);
  const [drafting, setDrafting] = useState(false);

  const [replyText, setReplyText] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Load Status & Auth Url
  const loadConnectionStatus = useCallback(async () => {
    try {
      const status = await getGmailStatus(companyId);
      setIsConnected(status.connected);
      if (!status.connected) {
        const urlRes = await getGmailAuthUrl(companyId);
        setAuthUrl(urlRes.url);
      }
    } catch (err) {
      console.error("Failed to check Gmail status", err);
    }
  }, [companyId]);

  // Load Messages
  const loadMessages = useCallback(async (showLoadingState = true) => {
    if (showLoadingState) setLoading(true);
    try {
      const msgs = await getGmailMessages(companyId);
      setMessages(msgs);
      
      // If we already have a selected mail, update its reference from the new list
      setSelectedMail((prev) => {
        if (!prev) return null;
        const updated = msgs.find(m => m.messageId === prev.messageId || m.id === prev.id);
        return updated || prev;
      });
      return msgs;
    } catch (err) {
      console.error("Failed to load messages", err);
      return [];
    } finally {
      if (showLoadingState) setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    const init = async () => {
      await loadConnectionStatus();
    };
    init();
  }, [companyId, loadConnectionStatus]);

  // Sync / Fetch emails action
  async function handleFetchEmails() {
    setSyncing(true);
    setErrorMsg("");
    try {
      await fetchGmailEmails(companyId);
      await loadMessages(false);
      setSuccessMsg("Inbox synced successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to sync emails. Please try again.");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    loadMessages(true).then((msgs) => {
      if (isConnected && msgs && msgs.length === 0) {
        handleFetchEmails();
      }
    });
  }, [companyId, isConnected, loadMessages]);

  useEffect(() => {
    if (!selectedMail) return;
    if (selectedMail.agentDraft && selectedMail.agentStatus === "pending_approval") {
      setReplyText(selectedMail.agentDraft);
    }
  }, [selectedMail?.messageId, selectedMail?.agentDraft, selectedMail?.agentStatus]);

  // Draft response with AI
  const handleAiDraft = async () => {
    if (!selectedMail) return;
    setDrafting(true);
    setErrorMsg("");
    try {
      const sender = selectedMail.from.split("<")[0].trim() || selectedMail.from;
      const res = await draftGmailReply(
        companyId,
        selectedMail.subject,
        selectedMail.body || selectedMail.snippet,
        sender
      );
      setReplyText(res.draft);
    } catch (err) {
      setErrorMsg("Failed to draft AI response. Please try again.");
    } finally {
      setDrafting(false);
    }
  };

  // Send email response
  const handleSendEmail = async () => {
    if (!selectedMail || !replyText.trim()) return;
    setSending(true);
    setErrorMsg("");
    try {
      let recipient = selectedMail.from;
      if (selectedMail.from === "me" || selectedMail.from.includes("<me>")) {
        recipient = selectedMail.to;
      }
      
      const emailRegex = /<([^>]+)>/;
      const match = recipient.match(emailRegex);
      const toEmail = match ? match[1] : recipient;

      let replySubject = selectedMail.subject;
      if (!replySubject.toLowerCase().startsWith("re:")) {
        replySubject = "Re: " + replySubject;
      }

      await sendGmailEmail(companyId, toEmail, replySubject, replyText, selectedMail.messageId);
      setReplyText("");
      setSuccessMsg("Email sent successfully!");
      
      await loadMessages(false);
      
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setErrorMsg("Failed to send email. Please try again.");
    } finally {
      setSending(false);
    }
  };

  // Filter messages based on search
  const filteredMessages = messages.filter(
    (msg) =>
      msg.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      msg.snippet.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group messages client-side into a conversation thread based on subject
  const getThreadMessages = () => {
    if (!selectedMail) return [];
    
    const normalizeSubject = (sub: string) => {
      return sub
        .toLowerCase()
        .replace(/^(re|fwd|reply):\s*/i, "")
        .trim();
    };

    const targetSubject = normalizeSubject(selectedMail.subject);
    
    return messages
      .filter((m) => normalizeSubject(m.subject) === targetSubject)
      .sort((a, b) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());
  };

  const threadMessages = getThreadMessages();

  // Helper to format date
  const formatMsgDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Demo inbox when Gmail not connected; full inbox when connected
  const showDemoInbox = !isConnected;

  if (showDemoInbox && loading && messages.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 gap-2">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        <span className="text-sm">Loading demo inbox...</span>
      </div>
    );
  }

  if (showDemoInbox && !loading && messages.length === 0) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center text-center p-8 bg-slate-50">
        <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 shadow-inner">
          <Mail className="h-8 w-8 text-blue-500" />
        </div>
        <h3 className="text-base font-bold text-gray-900">Connect your Gmail Account</h3>
        <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
          Connect Gmail for a live inbox, or run the Marketing Agent to populate the demo mailbox with AI-drafted replies.
        </p>
        {authUrl ? (
          <a href={authUrl} className="mt-4">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-md">
              Connect Google Account
            </Button>
          </a>
        ) : (
          <div className="mt-4 text-xs text-gray-400 flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Preparing connection link...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      {showDemoInbox && (
        <div className="px-4 py-2 bg-sky-50 border-b border-sky-100 text-xs text-sky-800 text-center flex-shrink-0">
          Demo inbox — run the Marketing Agent to auto-draft replies, or connect Gmail for live mail.
        </div>
      )}
      <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* LEFT PANEL: Email List */}
      <div className="w-[380px] border-r border-gray-200 bg-white flex flex-col flex-shrink-0">
        {/* Search and Action Bar */}
        <div className="p-4 border-b border-gray-100 space-y-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-800">Inbox</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={handleFetchEmails}
              disabled={syncing}
              className="h-8 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin text-blue-500" : ""}`} />
              {syncing ? "Syncing..." : "Sync"}
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search mails..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-4 rounded-md border border-gray-300 bg-gray-50 text-gray-900 text-sm focus:border-blue-500 focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        {/* Message list scroll */}
        <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
              <span className="text-xs">Loading inbox...</span>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400 px-4 text-center">
              <Inbox className="h-10 w-10 text-gray-300 mb-2" />
              <p className="text-sm font-medium">No emails found</p>
              <p className="text-xs text-gray-400 mt-1">Sync your inbox or adjust search keywords</p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isSelected = selectedMail?.messageId === msg.messageId;
              const isSentByMe = msg.from === "me" || msg.from.includes("<me>");
              return (
                <button
                  key={msg.id}
                  onClick={() => setSelectedMail(msg)}
                  className={`w-full text-left p-4 transition-colors flex flex-col gap-1 border-l-4 ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-500"
                      : isSentByMe
                      ? "bg-gray-50/30 border-gray-300 hover:bg-gray-100/50"
                      : "bg-white border-transparent hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className={`text-xs font-semibold truncate ${isSentByMe ? "text-gray-500" : "text-gray-900"}`}>
                        {isSentByMe ? "Outgoing (Reply)" : msg.from.split("<")[0].trim() || msg.from}
                      </span>
                      {!isSentByMe && msg.agentStatus === "pending_approval" && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-violet-50 text-violet-700 border border-violet-100 flex-shrink-0">
                          Agent draft
                        </span>
                      )}
                      {!isSentByMe && isNoReply(msg.from) && (
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-red-50 text-red-600 border border-red-100 flex-shrink-0">
                          No Reply
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">
                      {formatMsgDate(msg.receivedAt)}
                    </span>
                  </div>
                  <span className={`text-xs truncate font-medium ${isSelected ? "text-blue-900" : "text-gray-800"}`}>
                    {msg.subject}
                  </span>
                  <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5 leading-relaxed">
                    {msg.snippet}
                  </p>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT PANEL: Email Reader and Composer */}
      <div className="flex-1 bg-white flex flex-col min-w-0">
        {selectedMail ? (
          <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
            {/* Thread header */}
            <div className="p-6 border-b border-gray-200 flex-shrink-0 flex items-center justify-between bg-white z-10">
              <div className="min-w-0">
                <h1 className="text-lg font-bold text-gray-900 truncate">
                  {selectedMail.subject}
                </h1>
                <p className="text-xs text-gray-500 mt-1">
                  Thread with <span className="font-semibold text-gray-700">{selectedMail.from.split("<")[0].trim() || selectedMail.from}</span>
                </p>
              </div>
            </div>

            {/* Scrollable Conversation Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {threadMessages.map((msg, idx) => {
                const isSentByMe = msg.from === "me" || msg.from.includes("<me>");
                return (
                  <Card
                    key={msg.id}
                    className={`border border-gray-200 shadow-sm overflow-hidden ${
                      isSentByMe 
                        ? "bg-blue-50/20 max-w-[85%] ml-auto border-blue-100" 
                        : isHtml(msg.body || msg.snippet)
                          ? "bg-white w-full mr-auto"
                          : "bg-white max-w-[85%] mr-auto"
                    }`}
                  >
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                          <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                            isSentByMe ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-700"
                          }`}>
                            {isSentByMe ? <Send className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                          </div>
                           <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-gray-800 font-sans">
                                {isSentByMe ? "Plinth AI Assistant" : msg.from}
                              </p>
                              {!isSentByMe && isNoReply(msg.from) && (
                                <span className="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-medium bg-red-50 text-red-600 border border-red-100">
                                  No Reply
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-gray-400">
                              To: {msg.to}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-gray-400">
                          {formatMsgDate(msg.receivedAt)}
                        </span>
                      </div>

                      <Separator className="bg-gray-100" />

                      {isHtml(msg.body || msg.snippet) ? (
                        <SafeHtmlRenderer html={msg.body || msg.snippet} />
                      ) : (
                        <div className="text-xs text-gray-700 whitespace-pre-line leading-relaxed font-sans">
                          {msg.body || msg.snippet}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Success and Error Indicators */}
            {successMsg && (
              <div className="px-6 py-2 bg-emerald-50 border-y border-emerald-100 text-xs text-emerald-800 flex items-center gap-2 font-medium flex-shrink-0">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="px-6 py-2 bg-red-50 border-y border-red-100 text-xs text-red-800 flex items-center gap-2 font-medium flex-shrink-0">
                <AlertCircle className="h-4 w-4 text-red-600" />
                {errorMsg}
              </div>
            )}

            {/* Composer Footer */}
            <div className="p-4 border-t border-gray-200 bg-white flex-shrink-0">
              {selectedMail.agentStatus === "pending_approval" && selectedMail.agentDraft && (
                <div className="mb-3 p-2.5 bg-violet-50 border border-violet-200 rounded-lg text-xs text-violet-900 flex items-start gap-2">
                  <Sparkles className="h-4 w-4 text-violet-600 flex-shrink-0 mt-0.5" />
                  <span>
                    <strong>Email agent draft</strong>
                    {selectedMail.agentLabel ? ` · ${selectedMail.agentLabel}` : ""}
                    {selectedMail.agentPriority ? ` · ${selectedMail.agentPriority} priority` : ""}
                    . Review below, then send or edit before replying.
                  </span>
                </div>
              )}
              {isNoReply(selectedMail.from) && (
                <div className="mb-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2 font-medium">
                  <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <span>This is a no-reply address. Sending a response might fail or be rejected.</span>
                </div>
              )}
              <div className="flex items-center gap-2 mb-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAiDraft}
                  disabled={drafting || sending}
                  className="h-8 text-xs border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 hover:border-indigo-300 flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${drafting ? "animate-pulse" : "text-indigo-600"}`} />
                  {drafting ? "Drafting Response..." : "AI Response Draft"}
                </Button>
              </div>

              <div className="relative">
                <textarea
                  rows={8}
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Write a reply with Plinth to ${selectedMail.from.split("<")[0].trim() || selectedMail.from}...`}
                  disabled={sending}
                  className="w-full p-3 pb-14 text-xs text-gray-900 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none resize-none bg-gray-50/50 focus:bg-white disabled:opacity-50"
                />

                <div className="absolute right-3 bottom-3">
                  <Button
                    size="sm"
                    onClick={handleSendEmail}
                    disabled={sending || !replyText.trim()}
                    className="h-8 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5 font-semibold text-xs shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Send className="h-3.5 w-3.5" />
                    {sending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-slate-50/30">
            <div className="h-16 w-16 rounded-full bg-blue-50 flex items-center justify-center mb-4 shadow-inner">
              <Mail className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-base font-bold text-gray-900">Select an email conversation</h3>
            <p className="text-xs text-gray-500 max-w-sm mt-1.5 leading-relaxed">
              Choose an email from the left list to review detailed conversation history, generate response drafts with AI support, and send replies.
            </p>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
