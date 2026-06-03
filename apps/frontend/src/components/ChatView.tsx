import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatMessage } from "../types";
import { ChatInput } from "./ChatInput";

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

  function addMessage(role: "user" | "assistant", content: string): ChatMessage {
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
    // Add user message
    addMessage("user", text);

    // Placeholder assistant message for streaming
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, assistantMsg]);

    setIsStreaming(true);

    try {
      // For now, simulate streaming with a mock response
      // In the next iteration, this will use SSE from backend
      const response = await generateMockResponse(companyId, text);

      // Stream response character by character simulation
      let streamed = "";
      for (let i = 0; i < response.length; i++) {
        streamed += response[i];
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsg.id ? { ...msg, content: streamed } : msg
          )
        );
        await sleep(15 + Math.random() * 10);
      }
    } catch {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMsg.id
            ? { ...msg, content: "Sorry, something went wrong. Please try again." }
            : msg
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Company header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-700">Marketing AI Chat</h2>
        <p className="text-xs text-slate-400">
          Ask anything about marketing strategy, content creation, or campaign planning
        </p>
      </div>

      {/* Messages area */}
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
                I can help you with marketing plans, content creation, SEO strategy,
                social media posts, and more. Just type your request below.
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
                      Thinking...
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
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

async function generateMockResponse(companyId: string, prompt: string): Promise<string> {
  // This will be replaced with actual backend SSE streaming
  await sleep(500);

  const lower = prompt.toLowerCase();

  if (lower.includes("instagram") || lower.includes("social media")) {
    return `# 📱 Instagram Content Plan

Here's a tailored 30-day Instagram content strategy:

## Week 1: Brand Introduction
| Day | Content Type | Description |
|-----|-------------|-------------|
| Mon | Carousel | "Our Story" - brand origin + values |
| Tue | Reel | Behind the scenes of your team |
| Wed | Static Post | Product highlight with customer quote |
| Thu | Story | Poll: What do you want to see more? |
| Fri | Reel | Quick tutorial/tips video |
| Sat | Carousel | Customer success stories |
| Sun | Static Post | Weekly inspiration quote |

## Week 2: Engagement Focus
- **Monday**: User-generated content showcase
- **Tuesday**: Industry trend analysis carousel
- **Wednesday**: Product comparison reel
- **Thursday**: Live Q&A announcement
- **Friday**: Team introduction spotlight
- **Weekend**: Community poll + engagement stories

## Recommended Hashtags
\`\`\`
#brandname #industry #marketingtips 
#contentstrategy #growth #engagement
\`\`\`

> 💡 **Pro tip:** Post at 11 AM and 7 PM for maximum engagement based on current algorithm data.`;
  }

  if (lower.includes("linkedin") || lower.includes("post")) {
    return `# 📝 LinkedIn Posts for Brand Awareness

Here are 3 professional LinkedIn posts optimized for engagement:

---

## Post 1: Thought Leadership
**Format:** Text + Image

> "We asked 500 [industry] professionals what keeps them up at night. The #1 answer wasn't competition — it was [pain point]."

**Caption:** Share key findings from your market research. Position your brand as the solution.

**CTA:** "What's your biggest challenge with [topic]? Let's discuss in the comments."

---

## Post 2: Educational Carousel
**Format:** PDF Carousel (7-10 slides)

**Topic:** "5 Things Nobody Tells You About [Industry Trend]"

- Slide 1: Hook with surprising stat
- Slides 2-6: One tip per slide with data
- Slide 7: Summary + CTA

**Estimated reach:** 3-5x higher engagement than text posts

---

## Post 3: Team/Culture Post
**Format:** Photo + Short Text

Showcase your team working on a recent project. Highlight company culture and values. This humanizes your brand and attracts top talent.

> **Best posting times:** Tuesday-Thursday, 8-10 AM or 12-2 PM`;
  }

  if (lower.includes("seo") || lower.includes("keyword")) {
    return `# 🔍 SEO Keyword Analysis

## Top Keywords for Your Industry

| Keyword | Volume | Difficulty | Intent |
|---------|--------|-----------|--------|
| best [product] 2024 | 12,000/mo | Medium | Commercial |
| how to [action] | 8,500/mo | Low | Informational |
| [industry] trends | 6,200/mo | High | Informational |
| buy [product] online | 15,000/mo | High | Transactional |
| [product] reviews | 9,800/mo | Medium | Commercial |

## Recommendations

1. **Target low-difficulty informational keywords** first with blog content
2. **Use long-tail keywords** in product pages (e.g., "best [product] for small business")
3. **Create pillar pages** for high-volume terms and cluster related content

### On-Page SEO Checklist
- ✅ Title tags under 60 characters
- ✅ Meta descriptions with CTAs
- ✅ Alt text on all images
- ✅ Internal linking structure
- ✅ Mobile-first design

\`\`\`html
<!-- Example structured data -->
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Your Brand"
}
</script>
\`\`\``;
  }

  if (lower.includes("campaign") || lower.includes("plan")) {
    return `# 📊 Weekly Marketing Campaign Plan

## Campaign: [Campaign Name]
**Duration:** 7 Days  
**Goal:** Increase brand awareness + lead generation

---

### Day 1-2: Teaser Phase
- **Email:** "Something big is coming" to subscriber list
- **Social:** Countdown stories on Instagram + LinkedIn
- **Blog:** Related educational content

### Day 3-4: Launch Phase
- **Email blast:** Full announcement with offer
- **Social:** Product demo reels, testimonial posts
- **Paid:** Retargeting ads on Meta + LinkedIn

### Day 5-6: Amplify Phase
- **Influencer:** Partner posts go live
- **Community:** Live webinar or AMA
- **PR:** Press release distribution

### Day 7: Convert + Analyze
- **Email:** Last chance / urgency message
- **Social:** Results + social proof
- **Analytics:** Campaign performance review

---

## Budget Allocation
| Channel | Budget | Expected ROI |
|---------|--------|-------------|
| Meta Ads | 40% | 3.2x |
| LinkedIn | 25% | 2.8x |
| Google Ads | 20% | 4.1x |
| Influencer | 15% | 2.5x |

> 📈 **Projected:** 15,000 impressions, 450 clicks, 35 conversions`;
  }

  return `# 🤖 Marketing AI Response

Thanks for your request about: **"${prompt}"**

I can help you with:

1. **Content Strategy** — Plan content calendars across platforms
2. **Social Media Posts** — Generate platform-optimized posts
3. **SEO Optimization** — Keyword research and on-page recommendations
4. **Campaign Planning** — End-to-end campaign workflows
5. **Competitor Analysis** — Research and positioning insights
6. **Brand Voice Development** — Tone and messaging refinement

Please be more specific about what you'd like me to help with, or select one of the quick prompts below to get started!`;
}