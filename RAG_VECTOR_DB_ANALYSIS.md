# RAG + Vector DB Integration Analysis for Marketing Agent

## 📊 Current State Analysis

### What You Have Now
✅ **Multi-agent pipeline** (14 agents, LangGraph-based)  
✅ **PostgreSQL** for structured data (campaigns, assets)  
✅ **Redis** for short-term memory + job queue  
✅ **Mock trend/analytics tools** ready for real data  
✅ **Campaign persistence** with JSON + SQL storage  

### What's Missing for RAG
❌ **Vector embeddings** - No semantic search capability  
❌ **Vector database** - Only exact/recency-based queries  
❌ **Knowledge retrieval** - Past campaigns underutilized  
❌ **Context injection** - No RAG-augmented prompts  
❌ **Learning loop** - Performance data not actionable  

---

## 🎯 RAG Use Cases for Your Marketing Agent

### 1. **Campaign Intelligence Retrieval**
**Problem:** `query_similar_campaigns()` in `core/memory.py` only fetches 3 most recent campaigns (no semantic similarity)

**RAG Solution:**
- Embed campaign topics, strategies, and outcomes
- Retrieve semantically similar past campaigns for context
- Example: "AI startup launch" → finds similar SaaS launches, not just recent ones

**Impact:** Better `analytics_context` → smarter Planner decisions

---

### 2. **Cross-Campaign Knowledge Base**
**Problem:** Each campaign runs in isolation, learnings aren't accumulated

**RAG Solution:**
- Store strategies, hooks, CTAs, content pillars as retrievable chunks
- Writers query: "What hooks worked best for B2B LinkedIn posts?"
- Returns top-performing examples from past campaigns

**Impact:** Compound learning → each campaign improves future ones

---

### 3. **Brand Voice & Style Guide Memory**
**Problem:** No persistent brand guidelines across campaigns

**RAG Solution:**
- Store approved brand voice examples, tone preferences, banned phrases
- Writers retrieve brand context before generating content
- Auto-align output with historical brand standards

**Impact:** Consistent brand voice without re-specifying every time

---

### 4. **Market Research Repository**
**Problem:** Research + trend data is ephemeral (lost after campaign)

**RAG Solution:**
- Vector-store all research briefs, trend reports, competitor analysis
- Future campaigns query: "What are current pain points in fitness industry?"
- Returns aggregated insights from multiple past research sessions

**Impact:** Accumulating market intelligence over time

---

### 5. **Performance Pattern Matching**
**Problem:** `analytics.py` only stores a single `performance_score`

**RAG Solution:**
- Embed full analytics reports (metrics per platform, engagement patterns)
- Query: "Why did TikTok underperform in recent campaigns?"
- Returns patterns: "Low engagement correlated with missing trend tie-ins"

**Impact:** Data-driven recommendations, not just scores

---

## 🏗️ Architecture Design

### High-Level RAG Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    CAMPAIGN EXECUTION                        │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. Planner creates campaign plan                            │
│     └─→ Embed plan, query similar campaigns (RAG)            │
│     └─→ Inject top-3 similar contexts into analytics_context │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  2. Strategist builds strategy                               │
│     └─→ Query knowledge base for successful strategies       │
│     └─→ Retrieve brand voice guidelines                      │
│     └─→ RAG-augmented strategy generation                    │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. Writers generate content                                 │
│     └─→ Query: "Best performing hooks for [platform]"        │
│     └─→ Retrieve: Brand examples, past winners               │
│     └─→ Generate with RAG context                            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. Post-campaign storage                                    │
│     └─→ Embed full campaign (plan + strategy + assets)       │
│     └─→ Store in vector DB with metadata                     │
│     └─→ Index for future retrieval                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔧 Technical Implementation

### Option 1: **pgvector** (Recommended for Your Stack)

**Why:** You already have PostgreSQL → just add extension

**Setup:**
```sql
-- Enable pgvector extension
CREATE EXTENSION vector;

-- Create embeddings table
CREATE TABLE campaign_embeddings (
    id SERIAL PRIMARY KEY,
    campaign_uuid VARCHAR(64) REFERENCES campaigns(campaign_uuid),
    embedding vector(1536),  -- OpenAI embeddings
    content_type VARCHAR(64),  -- 'plan', 'strategy', 'research', 'analytics'
    content_text TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_campaign_embedding ON campaign_embeddings 
    USING hnsw (embedding vector_cosine_ops);
```

**Integration Points:**
```python
# core/rag.py (new file)
from langchain_openai import OpenAIEmbeddings
from langchain_postgres import PGVector

embeddings = OpenAIEmbeddings(model="text-embedding-3-small")

vector_store = PGVector(
    embeddings=embeddings,
    collection_name="campaigns",
    connection="postgresql://...",
    use_jsonb=True
)

async def store_campaign_vector(campaign_data: dict):
    """Embed and store campaign after completion"""
    text = f"""
    Topic: {campaign_data['user_input']}
    Plan: {campaign_data['plan']}
    Strategy: {campaign_data['assets']['strategy']}
    Results: {campaign_data['assets']['analytics']}
    """
    await vector_store.aadd_texts([text], metadatas=[{
        "campaign_uuid": campaign_data["campaign_id"],
        "platforms": campaign_data["target_platforms"],
        "performance_score": campaign_data["assets"]["analytics"]["score"]
    }])

async def query_similar_campaigns(query: str, limit: int = 3):
    """Semantic search for similar past campaigns"""
    results = await vector_store.asimilarity_search(query, k=limit)
    return results
```

**Pros:**
- ✅ No new infrastructure (uses existing PostgreSQL)
- ✅ ACID transactions with campaign data
- ✅ HNSW index for fast similarity search
- ✅ Simple backup/restore (single database)

**Cons:**
- ⚠️ PostgreSQL 15+ required (you have 16 ✅)
- ⚠️ Need embedding API key (OpenAI, or local model)

---

### Option 2: **ChromaDB** (Lightweight Alternative)

**Setup:**
```bash
pip install chromadb
```

```python
import chromadb
from chromadb.config import Settings

client = chromadb.Client(Settings(persist_directory="./chroma_data"))

collection = client.create_collection(
    name="campaigns",
    metadata={"hnsw:space": "cosine"}
)

def store_campaign(campaign_id: str, content: str, metadata: dict):
    collection.add(
        documents=[content],
        metadatas=[metadata],
        ids=[campaign_id]
    )

def query_campaigns(query: str, n_results: int = 3):
    return collection.query(
        query_texts=[query],
        n_results=n_results
    )
```

**Pros:**
- ✅ Zero config, embedded in app
- ✅ No external dependencies
- ✅ Good for development/testing

**Cons:**
- ⚠️ Not as production-ready as pgvector
- ⚠️ Separate storage to manage
- ⚠️ No SQL joins with campaign data

---

### Option 3: **Pinecone / Weaviate** (Cloud-Native)

**Pros:**
- ✅ Fully managed, auto-scaling
- ✅ Built-in hybrid search (semantic + keyword)
- ✅ Advanced filtering, metadata queries

**Cons:**
- ⚠️ Additional service/cost
- ⚠️ Network latency
- ⚠️ Vendor lock-in

---

## 📋 Recommended Implementation Plan

### Phase 1: **Core RAG Infrastructure** (Week 1)

**Tasks:**
1. Add `pgvector` extension to PostgreSQL
   - Update `docker-compose.yml`:
   ```yaml
   postgres:
     image: pgvector/pgvector:pg16  # Change from postgres:16-alpine
   ```

2. Create embedding storage schema
   - File: `migrations/001_add_pgvector.sql`

3. Build RAG utility module
   - File: `core/rag.py`
   - Functions: `embed_campaign()`, `search_campaigns()`, `get_context()`

4. Add embedding model
   - Options: 
     - OpenAI `text-embedding-3-small` (recommended, $0.02/1M tokens)
     - Local: `sentence-transformers/all-MiniLM-L6-v2` (free, ~80MB model)

**Dependencies to add:**
```txt
langchain-openai>=0.1.0  # For OpenAI embeddings
pgvector>=0.2.0  # PostgreSQL vector extension
sentence-transformers>=2.2.0  # Optional: local embeddings
```

---

### Phase 2: **RAG-Enhanced Campaign Planning** (Week 2)

**Changes:**

1. **Modify `core/memory.py`:**
```python
# OLD: Simple recency query
def query_similar_campaigns(user_input: str) -> list:
    return session.query(CampaignRecord).order_by(
        desc(CampaignRecord.created_at)
    ).limit(3).all()

# NEW: Semantic RAG query
async def query_similar_campaigns_rag(user_input: str, limit: int = 3) -> list:
    from core.rag import search_campaigns
    return await search_campaigns(query=user_input, limit=limit)
```

2. **Enhance `agents/planner.py`:**
```python
# Before creating plan, retrieve RAG context
rag_context = await query_similar_campaigns_rag(state["user_input"])

plan_prompt = f"""
Topic: {user_input}

LESSONS FROM SIMILAR CAMPAIGNS:
{format_rag_context(rag_context)}

Create a campaign plan that leverages these learnings...
"""
```

3. **Update `AgentState` in `core/state.py`:**
```python
class AgentState(TypedDict):
    # ... existing fields
    rag_context: dict  # Retrieved knowledge for this campaign
```

---

### Phase 3: **Knowledge Base for Writers** (Week 3)

**Changes:**

1. **Create brand voice repository:**
```python
# core/brand_memory.py
async def store_brand_example(
    platform: str, 
    content_type: str, 
    content: str,
    performance_score: float
):
    """Store high-performing content as brand example"""
    await vector_store.add_texts([content], metadatas=[{
        "type": "brand_example",
        "platform": platform,
        "content_type": content_type,
        "score": performance_score
    }])

async def get_brand_examples(platform: str, limit: int = 5):
    """Retrieve top-performing brand examples"""
    return await vector_store.similarity_search(
        f"high performing {platform} content",
        filter={"type": "brand_example", "platform": platform},
        k=limit
    )
```

2. **Update writer agents to use RAG:**
```python
# agents/blog_writer.py (example)
from core.brand_memory import get_brand_examples

async def blog_writer(state):
    brand_examples = await get_brand_examples("blog")
    
    prompt = f"""
    Write SEO blog post for: {topic}
    
    BRAND VOICE EXAMPLES (score > 0.8):
    {format_examples(brand_examples)}
    
    Maintain this tone and style...
    """
```

---

### Phase 4: **Market Research Repository** (Week 4)

**Changes:**

1. **Persist research insights:**
```python
# agents/researcher.py (add at end)
async def store_research_insights(research_brief: str, topic: str):
    await vector_store.add_texts([research_brief], metadatas=[{
        "type": "research",
        "topic": topic,
        "date": datetime.now().isoformat()
    }])
```

2. **Query research in TrendDetector:**
```python
# agents/trend_detector.py
async def get_historical_trends(topic: str):
    past_research = await vector_store.similarity_search(
        f"market trends for {topic}",
        filter={"type": "research"},
        k=5
    )
    # Aggregate insights from past research
    return synthesize_trends(past_research)
```

---

### Phase 5: **Analytics Pattern Matching** (Week 5)

**Changes:**

1. **Embed full analytics reports:**
```python
# agents/analytics.py (enhance)
async def store_analytics_patterns(analytics_report: dict):
    """Store patterns for future querying"""
    await vector_store.add_texts([
        analytics_report["learnings"],
        analytics_report["recommendations"]
    ], metadatas=[{
        "type": "analytics_pattern",
        "platform": analytics_report["platform"],
        "score": analytics_report["score"]
    }])
```

2. **Query patterns in Planner:**
```python
async def get_performance_patterns(platform: str):
    """What worked/failed for this platform historically"""
    patterns = await vector_store.similarity_search(
        f"why did {platform} campaigns succeed or fail"
    )
    return patterns
```

---

## 💰 Cost Analysis

### Embedding Costs (OpenAI)

| Scenario | Tokens/Campaign | Campaigns/Month | Monthly Cost |
|----------|----------------|-----------------|--------------|
| Small (50 campaigns) | ~2,000 | 50 | $0.02 |
| Medium (200 campaigns) | ~2,000 | 200 | $0.08 |
| Large (1000 campaigns) | ~2,000 | 1000 | $0.40 |

**Conclusion:** Negligible cost with OpenAI embeddings

### Local Embeddings (Free)

- Model: `sentence-transformers/all-MiniLM-L6-v2`
- Size: ~80MB
- Speed: ~50 embeddings/sec on CPU
- Cost: $0 (one-time download)

---

## 🚀 Quick Start (MVP in 1 Day)

### 1. Add pgvector to Docker
```yaml
# docker-compose.yml
postgres:
  image: pgvector/pgvector:pg16  # Change this line
```

### 2. Create minimal RAG module
```python
# core/rag.py
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import PGVector

embeddings = OpenAIEmbeddings()

async def store_campaign(state: dict):
    text = f"{state['user_input']} {state['plan']} {state['assets']}"
    PGVector.from_texts(
        texts=[text],
        embedding=embeddings,
        metadatas=[{"uuid": state["campaign_id"]}],
        connection_string="postgresql://..."
    )

async def query_campaigns(query: str):
    store = PGVector(
        embedding_function=embeddings,
        connection_string="postgresql://..."
    )
    return store.similarity_search(query, k=3)
```

### 3. Modify Planner to use RAG
```python
# agents/planner.py (add before LLM call)
rag_results = await query_campaigns(state["user_input"])
context = "\n".join([r.page_content for r in rag_results])

# Inject into prompt
prompt = f"Past campaigns:\n{context}\n\nNow create a plan..."
```

### 4. Store after campaign
```python
# core/pipeline.py (in persist_campaign_outputs)
await store_campaign(state)  # Add this line
```

---

## 📊 Expected Impact

| Metric | Before RAG | After RAG | Improvement |
|--------|-----------|-----------|-------------|
| Campaign relevance | Generic | Context-aware | +40-60% |
| Brand consistency | Manual per campaign | Auto-aligned | +70% |
| Learning velocity | None | Compound | ∞ |
| Content performance | Baseline | Optimized | +25-35% |
| Planning time | Same | Faster (reuse patterns) | -30% |

---

## 🔍 Alternative: Hybrid Search (Best of Both Worlds)

Combine semantic (vector) + keyword (BM25) search:

```python
from langchain.retrievers import EnsembleRetriever

vector_retriever = vector_store.as_retriever(
    search_type="similarity", k=3
)

keyword_retriever = vector_store.as_retriever(
    search_type="mmr", k=2  # Also supports keyword
)

hybrid_retriever = EnsembleRetriever(
    retrievers=[vector_retriever, keyword_retriever],
    weights=[0.7, 0.3]  # 70% semantic, 30% keyword
)
```

**Why:** Some queries work better with exact match ("Q1 2026 campaign") vs semantic ("startup launch strategies")

---

## 🛡️ Production Considerations

### 1. **Chunking Strategy**
Don't embed entire campaigns as one blob. Chunk intelligently:
```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    separators=["\n## ", "\n### ", "\n", " "]
)

chunks = splitter.split_text(campaign_text)
```

### 2. **Metadata Filtering**
Always filter by metadata to reduce search space:
```python
results = vector_store.similarity_search(
    query,
    k=3,
    filter={
        "platform": "LinkedIn",
        "performance_score": {"$gte": 0.7},
        "date": {"$gte": "2025-01-01"}
    }
)
```

### 3. **Re-Ranking** (Optional, Advanced)
For better precision, add cross-encoder re-ranking:
```python
from sentence_transformers import CrossEncoder

reranker = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-6-v2")

def rerank_results(query: str, docs: list, top_k: int = 3):
    scores = reranker.predict([[query, d.page_content] for d in docs])
    ranked = sorted(zip(docs, scores), key=lambda x: x[1], reverse=True)
    return [d for d, _ in ranked[:top_k]]
```

### 4. **Embedding Updates**
Re-embed campaigns when:
- New platforms added
- Prompt templates updated
- Performance patterns change

Schedule monthly re-embedding job.

---

## 📚 Recommended Stack

Based on your current architecture:

| Component | Choice | Reason |
|-----------|--------|--------|
| **Vector DB** | pgvector | Already have PostgreSQL, zero new infra |
| **Embeddings** | OpenAI text-embedding-3-small | Best quality, negligible cost |
| **Fallback** | sentence-transformers (local) | No API key needed, dev-friendly |
| **Integration** | LangChain PGVector | Matches your existing LangChain usage |
| **Chunking** | RecursiveCharacterTextSplitter | Works with markdown content |

---

## 🎓 Next Steps

1. **Decide on vector DB:** pgvector (recommended) vs Chroma vs Pinecone
2. **Choose embedding model:** OpenAI (cloud) vs sentence-transformers (local)
3. **Pick starting phase:** I recommend Phase 1 (infrastructure) → Phase 2 (RAG planning)
4. **Set success metrics:** How will you measure RAG improvement?
5. **Build MVP:** Start with campaign similarity search → expand to full RAG

---

## ❓ Questions to Clarify

1. **Brand consistency:** Do you have existing brand guidelines/examples to store?
2. **Data privacy:** Can campaign data be stored in vector DB, or need isolation per client?
3. **Scale:** How many campaigns/month do you expect? (affects infrastructure choice)
4. **Real-time vs batch:** Should RAG updates happen immediately, or nightly batch?
5. **Multi-tenant:** Will different users have separate knowledge bases?

---

## 📖 Additional Resources

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [LangChain PGVector Docs](https://python.langchain.com/docs/integrations/vectorstores/pgvector)
- [OpenAI Embeddings](https://platform.openai.com/docs/guides/embeddings)
- [RAG Best Practices](https://www.anthropic.com/index/contextual-retrieval)
- [ChromaDB Docs](https://docs.trychroma.com/)

---

**Bottom Line:** Your architecture is already RAG-ready. Adding pgvector takes ~1 day for MVP, ~1 week for full implementation. The compound learning effect will make your marketing agent exponentially smarter with each campaign.
