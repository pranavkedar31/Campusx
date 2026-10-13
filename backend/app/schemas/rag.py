"""
Pydantic schemas for RAG Campus Knowledge Assistant.
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class RAGQueryRequest(BaseModel):
    query: str = Field(..., min_length=2, max_length=1000)


class RAGSource(BaseModel):
    title: str
    section: Optional[str] = "General"


class RAGChunk(BaseModel):
    title: str
    section: str
    content: str
    relevance_score: float


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    sources: List[RAGSource]
    confidence: str
    retrieved_chunks: List[RAGChunk]


class RAGDocumentInfo(BaseModel):
    filename: str
    title: str
    sections_count: int
    sections: List[str]
