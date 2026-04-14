"""
RAG (Retrieval-Augmented Generation) Module

Provides vector storage and semantic search for campaign intelligence.
Uses ChromaDB for local vector storage (no external dependencies).
Can be upgraded to pgvector for production PostgreSQL.

Usage:
    from core.rag import RAGManager
    
    rag = RAGManager()
    await rag.store_campaign(campaign_data)
    results = await rag.search_similar("AI marketing automation")
"""
import os
import json
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Optional
from datetime import datetime
import hashlib


class RAGManager:
    """Manage campaign vector storage and retrieval."""
    
    def __init__(self, persist_directory: str = "./chroma_data"):
        """
        Initialize RAG manager with ChromaDB.
        
        Args:
            persist_directory: Directory to store vector embeddings
        """
        self.persist_directory = persist_directory
        
        # Initialize ChromaDB client
        self.client = chromadb.PersistentClient(
            path=persist_directory,
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collections
        self.campaigns_collection = self.client.get_or_create_collection(
            name="campaigns",
            metadata={"hnsw:space": "cosine"}
        )
        
        self.strategies_collection = self.client.get_or_create_collection(
            name="strategies",
            metadata={"hnsw:space": "cosine"}
        )
        
        self.research_collection = self.client.get_or_create_collection(
            name="research",
            metadata={"hnsw:space": "cosine"}
        )
        
        print(f"[RAG] Initialized with ChromaDB at {persist_directory}")
    
    def _generate_id(self, text: str, prefix: str = "camp") -> str:
        """Generate a unique ID for vector storage."""
        hash_val = hashlib.md5(text.encode()).hexdigest()[:12]
        return f"{prefix}_{hash_val}_{int(datetime.now().timestamp())}"
    
    async def store_campaign(
        self,
        campaign_uuid: str,
        topic: str,
        plan: dict,
        strategy: dict,
        analytics: dict,
        platforms: List[str],
        performance_score: Optional[float] = None
    ):
        """
        Store campaign in vector database for future retrieval.
        
        Args:
            campaign_uuid: Unique campaign identifier
            topic: Campaign topic/title
            plan: Campaign plan dict
            strategy: Campaign strategy dict
            analytics: Analytics/report dict
            platforms: Target platforms list
            performance_score: Performance score (0.0-1.0)
        """
        # Create searchable text from campaign data
        campaign_text = self._format_campaign_for_embedding(
            topic, plan, strategy, analytics, platforms
        )
        
        # Generate unique ID
        doc_id = self._generate_id(campaign_uuid, "camp")
        
        # Create metadata
        metadata = {
            "campaign_uuid": campaign_uuid,
            "topic": topic[:500],  # Truncate for metadata limit
            "platforms": json.dumps(platforms),
            "performance_score": performance_score or 0.0,
            "created_at": datetime.now().isoformat(),
            "content_type": "campaign"
        }
        
        # Store in ChromaDB
        self.campaigns_collection.add(
            documents=[campaign_text],
            metadatas=[metadata],
            ids=[doc_id]
        )
        
        print(f"[RAG] Stored campaign: {topic[:50]}... (ID: {doc_id})")
        
        # Also store strategy separately for strategy-specific queries
        if strategy:
            await self.store_strategy(
                campaign_uuid=campaign_uuid,
                strategy=strategy,
                topic=topic,
                performance_score=performance_score
            )
    
    def _format_campaign_for_embedding(
        self,
        topic: str,
        plan: dict,
        strategy: dict,
        analytics: dict,
        platforms: List[str]
    ) -> str:
        """Format campaign data into searchable text."""
        parts = [
            f"Topic: {topic}",
            f"Platforms: {', '.join(platforms)}",
        ]
        
        if plan:
            plan_text = json.dumps(plan, ensure_ascii=False)
            parts.append(f"Plan: {plan_text}")
        
        if strategy:
            strategy_text = json.dumps(strategy, ensure_ascii=False)
            parts.append(f"Strategy: {strategy_text}")
        
        if analytics:
            analytics_text = json.dumps(analytics, ensure_ascii=False)
            parts.append(f"Results: {analytics_text}")
        
        return "\n".join(parts)
    
    async def store_strategy(
        self,
        campaign_uuid: str,
        strategy: dict,
        topic: str,
        performance_score: Optional[float] = None
    ):
        """Store strategy in separate collection for strategy-specific queries."""
        strategy_text = json.dumps(strategy, ensure_ascii=False)
        doc_id = self._generate_id(campaign_uuid, "strat")
        
        metadata = {
            "campaign_uuid": campaign_uuid,
            "topic": topic[:500],
            "performance_score": performance_score or 0.0,
            "created_at": datetime.now().isoformat(),
            "content_type": "strategy"
        }
        
        self.strategies_collection.add(
            documents=[strategy_text],
            metadatas=[metadata],
            ids=[doc_id]
        )
    
    async def store_research(
        self,
        topic: str,
        research_brief: str,
        trend_report: dict
    ):
        """Store research insights for future trend queries."""
        doc_id = self._generate_id(topic, "res")
        
        metadata = {
            "topic": topic[:500],
            "created_at": datetime.now().isoformat(),
            "content_type": "research"
        }
        
        self.research_collection.add(
            documents=[research_brief],
            metadatas=[metadata],
            ids=[doc_id]
        )
        
        print(f"[RAG] Stored research: {topic[:50]}...")
    
    async def search_similar_campaigns(
        self,
        query: str,
        limit: int = 3,
        min_score: Optional[float] = None,
        platforms: Optional[List[str]] = None
    ) -> List[Dict]:
        """
        Search for semantically similar past campaigns.
        
        Args:
            query: Search query (topic or description)
            limit: Number of results to return
            min_score: Minimum performance score filter
            platforms: Filter by platforms
        
        Returns:
            List of campaign dictionaries with relevance scores
        """
        # Build where clause for filtering
        where_filter = {}
        
        if min_score is not None:
            where_filter["performance_score"] = {"$gte": min_score}
        
        if platforms:
            # ChromaDB doesn't support array contains, so we'll filter after
            pass
        
        # Query ChromaDB
        results = self.campaigns_collection.query(
            query_texts=[query],
            n_results=limit * 2,  # Get more to filter
            where=where_filter if where_filter else None
        )
        
        # Process and filter results
        campaigns = []
        for i, (doc, metadata, distance) in enumerate(zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        )):
            # Skip if doesn't match platform filter
            if platforms:
                doc_platforms = json.loads(metadata.get("platforms", "[]"))
                if not any(p in doc_platforms for p in platforms):
                    continue
            
            # Calculate relevance score (distance -> similarity)
            relevance = max(0, 1 - distance)
            
            campaigns.append({
                "topic": metadata.get("topic", ""),
                "campaign_uuid": metadata.get("campaign_uuid", ""),
                "performance_score": metadata.get("performance_score", 0),
                "relevance": round(relevance, 3),
                "created_at": metadata.get("created_at", ""),
                "content_preview": doc[:200]
            })
        
        # Sort by relevance and limit
        campaigns.sort(key=lambda x: x["relevance"], reverse=True)
        return campaigns[:limit]
    
    async def search_strategies(
        self,
        query: str,
        limit: int = 5,
        min_score: Optional[float] = None
    ) -> List[Dict]:
        """Search for successful strategies."""
        where_filter = {}
        if min_score is not None:
            where_filter["performance_score"] = {"$gte": min_score}
        
        results = self.strategies_collection.query(
            query_texts=[query],
            n_results=limit,
            where=where_filter if where_filter else None
        )
        
        strategies = []
        for doc, metadata, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        ):
            relevance = max(0, 1 - distance)
            strategies.append({
                "topic": metadata.get("topic", ""),
                "campaign_uuid": metadata.get("campaign_uuid", ""),
                "performance_score": metadata.get("performance_score", 0),
                "relevance": round(relevance, 3),
                "strategy": json.loads(doc)
            })
        
        return strategies
    
    async def search_research(
        self,
        query: str,
        limit: int = 5
    ) -> List[Dict]:
        """Search past research insights."""
        results = self.research_collection.query(
            query_texts=[query],
            n_results=limit
        )
        
        research = []
        for doc, metadata, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0]
        ):
            relevance = max(0, 1 - distance)
            research.append({
                "topic": metadata.get("topic", ""),
                "relevance": round(relevance, 3),
                "created_at": metadata.get("created_at", ""),
                "content": doc
            })
        
        return research
    
    async def get_campaign_stats(self) -> Dict:
        """Get statistics about stored campaigns."""
        return {
            "total_campaigns": self.campaigns_collection.count(),
            "total_strategies": self.strategies_collection.count(),
            "total_research": self.research_collection.count(),
            "persist_directory": self.persist_directory
        }
    
    def clear_all(self):
        """Clear all stored data (for testing)."""
        self.client.delete_collection("campaigns")
        self.client.delete_collection("strategies")
        self.client.delete_collection("research")
        
        # Recreate
        self.campaigns_collection = self.client.get_or_create_collection(
            name="campaigns",
            metadata={"hnsw:space": "cosine"}
        )
        self.strategies_collection = self.client.get_or_create_collection(
            name="strategies",
            metadata={"hnsw:space": "cosine"}
        )
        self.research_collection = self.client.get_or_create_collection(
            name="research",
            metadata={"hnsw:space": "cosine"}
        )
        
        print("[RAG] Cleared all data")


# ── Global Instance (Singleton) ──────────────────────────────────────────────

_rag_manager: Optional[RAGManager] = None


def get_rag_manager() -> RAGManager:
    """Get or create global RAG manager instance."""
    global _rag_manager
    if _rag_manager is None:
        _rag_manager = RAGManager()
    return _rag_manager


# ── Convenience Functions ────────────────────────────────────────────────────

async def store_campaign_vector(
    campaign_uuid: str,
    topic: str,
    plan: dict,
    strategy: dict,
    analytics: dict,
    platforms: List[str],
    performance_score: Optional[float] = None
):
    """Store campaign in vector DB (convenience function)."""
    rag = get_rag_manager()
    await rag.store_campaign(
        campaign_uuid, topic, plan, strategy, analytics, platforms, performance_score
    )


async def search_similar_campaigns(
    query: str,
    limit: int = 3,
    min_score: Optional[float] = None
) -> List[Dict]:
    """Search similar campaigns (convenience function)."""
    rag = get_rag_manager()
    return await rag.search_similar_campaigns(query, limit, min_score)
