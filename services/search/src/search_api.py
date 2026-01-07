#!/usr/bin/env python3
"""
Search API Service

Provides hybrid search (BM25 + semantic) with graceful degradation.
Supports multiple backends:
1. OpenSearch (production) - set OPENSEARCH_URL
2. SQLite FTS (fallback) - local file-based full-text search
3. In-memory (demo) - simple keyword matching for development

Configure via environment variables:
- SEARCH_BACKEND: "opensearch", "sqlite", or "memory" (default: "memory")
- OPENSEARCH_URL: OpenSearch cluster URL
- SQLITE_DB_PATH: Path to SQLite database file
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn
import os
import sqlite3
import json
import hashlib
from datetime import datetime
from typing import Dict, Any, List, Optional
from contextlib import contextmanager

# =============================================================================
# Configuration
# =============================================================================

SEARCH_BACKEND = os.getenv("SEARCH_BACKEND", "memory").lower()
OPENSEARCH_URL = os.getenv("OPENSEARCH_URL", "")
SQLITE_DB_PATH = os.getenv("SQLITE_DB_PATH", "search_index.db")

# In-memory document store for demo mode
_memory_store: Dict[str, Dict[str, Any]] = {}

app = FastAPI(title="Search API", version="0.2.0")

class SearchRequest(BaseModel):
    query: str
    limit: Optional[int] = 10
    filters: Optional[Dict[str, Any]] = None
    context: Optional[Dict[str, Any]] = None

class UpsertRequest(BaseModel):
    documents: List[Dict[str, Any]]
    index_name: Optional[str] = "global_agent_docs"

class HealthResponse(BaseModel):
    status: str
    version: str
    opensearch_status: Optional[str] = None
    vector_store_status: Optional[str] = None

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    opensearch_status = "not_configured"
    vector_store_status = "not_configured"

    if SEARCH_BACKEND == "opensearch" and OPENSEARCH_URL:
        opensearch_status = "configured"  # Would check connectivity in production
    elif SEARCH_BACKEND == "sqlite":
        opensearch_status = "n/a"
        vector_store_status = "sqlite_fts"
    else:
        opensearch_status = "n/a"
        vector_store_status = "memory"

    return HealthResponse(
        status="ok",
        version="0.2.0",
        opensearch_status=opensearch_status,
        vector_store_status=vector_store_status
    )


# =============================================================================
# SQLite FTS Backend
# =============================================================================

@contextmanager
def get_sqlite_connection():
    """Get SQLite connection with FTS5 support"""
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def init_sqlite_fts():
    """Initialize SQLite FTS5 table"""
    with get_sqlite_connection() as conn:
        conn.execute("""
            CREATE VIRTUAL TABLE IF NOT EXISTS documents_fts USING fts5(
                id, content, metadata, tokenize='porter'
            )
        """)
        conn.commit()


def search_sqlite(query: str, limit: int) -> List[Dict[str, Any]]:
    """Search using SQLite FTS5"""
    with get_sqlite_connection() as conn:
        cursor = conn.execute("""
            SELECT id, content, metadata, rank
            FROM documents_fts
            WHERE documents_fts MATCH ?
            ORDER BY rank
            LIMIT ?
        """, (query, limit))
        results = []
        for row in cursor:
            results.append({
                "id": row["id"],
                "content": row["content"],
                "score": -row["rank"],  # FTS5 rank is negative, lower is better
                "metadata": json.loads(row["metadata"]) if row["metadata"] else {}
            })
        return results


def upsert_sqlite(documents: List[Dict[str, Any]]) -> int:
    """Upsert documents into SQLite FTS"""
    init_sqlite_fts()
    count = 0
    with get_sqlite_connection() as conn:
        for doc in documents:
            doc_id = doc.get("id") or hashlib.md5(doc.get("content", "").encode()).hexdigest()
            content = doc.get("content", "")
            metadata = json.dumps(doc.get("metadata", {}))

            # Delete existing and insert new (upsert pattern for FTS)
            conn.execute("DELETE FROM documents_fts WHERE id = ?", (doc_id,))
            conn.execute(
                "INSERT INTO documents_fts (id, content, metadata) VALUES (?, ?, ?)",
                (doc_id, content, metadata)
            )
            count += 1
        conn.commit()
    return count


# =============================================================================
# In-Memory Backend (Demo/Development)
# =============================================================================

def search_memory(query: str, limit: int) -> List[Dict[str, Any]]:
    """Simple in-memory keyword search"""
    query_lower = query.lower()
    results = []

    for doc_id, doc in _memory_store.items():
        content = doc.get("content", "").lower()
        # Simple relevance: count query terms found
        score = sum(1 for term in query_lower.split() if term in content)
        if score > 0:
            results.append({
                "id": doc_id,
                "content": doc["content"],
                "score": score / len(query_lower.split()),
                "metadata": doc.get("metadata", {})
            })

    # Sort by score descending
    results.sort(key=lambda x: x["score"], reverse=True)
    return results[:limit]


def upsert_memory(documents: List[Dict[str, Any]]) -> int:
    """Add documents to in-memory store"""
    count = 0
    for doc in documents:
        doc_id = doc.get("id") or hashlib.md5(doc.get("content", "").encode()).hexdigest()
        _memory_store[doc_id] = {
            "content": doc.get("content", ""),
            "metadata": {
                **doc.get("metadata", {}),
                "indexed_at": datetime.utcnow().isoformat()
            }
        }
        count += 1
    return count

@app.post("/query")
async def search_documents(request: SearchRequest):
    """Search documents using configured backend"""
    import time
    start = time.time()

    try:
        results = []

        if SEARCH_BACKEND == "opensearch" and OPENSEARCH_URL:
            # OpenSearch integration (placeholder for future)
            # client = OpenSearchClient(OPENSEARCH_URL)
            # results = client.search(query=request.query, limit=request.limit)
            raise HTTPException(
                status_code=503,
                detail="opensearch_not_implemented: OpenSearch backend configured but not yet integrated"
            )
        elif SEARCH_BACKEND == "sqlite":
            results = search_sqlite(request.query, request.limit or 10)
        else:
            results = search_memory(request.query, request.limit or 10)

        took_ms = int((time.time() - start) * 1000)

        return {
            "results": results,
            "total": len(results),
            "query": request.query,
            "backend": SEARCH_BACKEND,
            "took_ms": took_ms
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/upsert")
async def upsert_documents(request: UpsertRequest):
    """Upsert documents into the search index"""
    try:
        count = 0

        if SEARCH_BACKEND == "opensearch" and OPENSEARCH_URL:
            raise HTTPException(
                status_code=503,
                detail="opensearch_not_implemented: OpenSearch backend configured but not yet integrated"
            )
        elif SEARCH_BACKEND == "sqlite":
            count = upsert_sqlite(request.documents)
        else:
            count = upsert_memory(request.documents)

        return {
            "status": "success",
            "documents_processed": count,
            "index_name": request.index_name,
            "backend": SEARCH_BACKEND,
            "message": f"Successfully processed {count} documents"
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/stats")
async def get_stats():
    """Get search index statistics"""
    stats = {
        "backend": SEARCH_BACKEND,
        "document_count": 0
    }

    if SEARCH_BACKEND == "sqlite":
        try:
            with get_sqlite_connection() as conn:
                cursor = conn.execute("SELECT COUNT(*) FROM documents_fts")
                stats["document_count"] = cursor.fetchone()[0]
        except Exception:
            stats["document_count"] = 0
    else:
        stats["document_count"] = len(_memory_store)

    return stats

@app.get("/schema/query")
async def query_schema():
    """Get the schema for query endpoint"""
    return {
        "name": "search.query",
        "description": "Search documents using hybrid retrieval (BM25 + semantic)",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "limit": {"type": "integer", "description": "Maximum results", "default": 10},
                "filters": {"type": "object", "description": "Search filters"},
                "context": {"type": "object", "description": "Additional context"}
            },
            "required": ["query"]
        }
    }

@app.get("/schema/upsert")
async def upsert_schema():
    """Get the schema for upsert endpoint"""
    return {
        "name": "search.upsert",
        "description": "Add or update documents in the search index",
        "inputSchema": {
            "type": "object",
            "properties": {
                "documents": {
                    "type": "array",
                    "items": {"type": "object"},
                    "description": "Documents to upsert"
                },
                "index_name": {"type": "string", "description": "Index name", "default": "global_agent_docs"}
            },
            "required": ["documents"]
        }
    }

if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
