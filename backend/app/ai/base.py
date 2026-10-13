"""
Abstract Base Class for AI Providers.
Provides the contract for Google Gemini, OpenAI-compatible, and Local Mock AI services.
Implementation of concrete providers is scheduled for Phase 9 and Phase 10.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class BaseAIProvider(ABC):
    """
    Abstract interface for AI Providers supporting conversational queries,
    academic recommendations, and knowledge base RAG retrieval.
    """

    @abstractmethod
    async def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Generate a contextual response based on the provided prompt and context."""
        pass

    @abstractmethod
    async def generate_student_recommendations(
        self,
        student_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate personalized recommendations for an authorized student."""
        pass

    @abstractmethod
    async def answer_rag_query(
        self,
        query: str,
        retrieved_documents: List[Dict[str, Any]],
        role: str
    ) -> Dict[str, Any]:
        """Generate an evidence-backed answer citing verified campus knowledge base documents."""
        pass
