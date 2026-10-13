"""
RAG Campus Knowledge Assistant API Endpoints.
"""

from typing import List
from fastapi import APIRouter, Depends
from app.core.dependencies import get_current_user
from app.models.user import User
from app.schemas.rag import RAGQueryRequest, RAGQueryResponse, RAGDocumentInfo
from app.ai.rag import get_rag_engine

router = APIRouter()


@router.post("/query", response_model=RAGQueryResponse, summary="Query Campus Knowledge Base")
async def query_campus_knowledge(
    req: RAGQueryRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Queries the institutional knowledge base using vector semantic search
    and returns a cited, evidence-backed policy response.
    """
    rag = get_rag_engine()
    result = await rag.answer(query=req.query, role=current_user.role.value)
    return result


@router.get("/documents", response_model=List[RAGDocumentInfo], summary="List Indexed Policy Documents")
def list_knowledge_documents(
    current_user: User = Depends(get_current_user)
):
    """Lists verified institutional policy documents currently active in the knowledge base."""
    rag = get_rag_engine()
    return rag.list_indexed_documents()
