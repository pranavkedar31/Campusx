"""
Google Gemini AI Provider for CampusX.
"""

from typing import Any, Dict, List, Optional
import json
from app.ai.base import BaseAIProvider
from app.ai.providers.mock import MockAIProvider
from app.core.config import settings


class GeminiAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.fallback = MockAIProvider()

    async def generate_response(
        self,
        prompt: str,
        system_instruction: Optional[str] = None,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        if not self.api_key:
            return await self.fallback.generate_response(prompt, system_instruction, context)

        try:
            # Attempt to use google-genai or google.generativeai if installed
            import google.generativeai as genai
            genai.configure(api_key=self.api_key)
            model = genai.GenerativeModel(
                model_name=settings.GEMINI_MODEL,
                system_instruction=system_instruction or "You are CampusX AI, an academic assistant grounded in institutional facts."
            )
            grounded_prompt = f"System Context (Ground Truth Data):\n{json.dumps(context or {}, indent=2)}\n\nUser Question:\n{prompt}"
            response = model.generate_content(grounded_prompt)
            return response.text
        except Exception:
            # Graceful fallback to deterministic grounded model
            return await self.fallback.generate_response(prompt, system_instruction, context)

    async def generate_student_recommendations(
        self,
        student_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        return await self.fallback.generate_student_recommendations(student_data)

    async def answer_rag_query(
        self,
        query: str,
        retrieved_documents: List[Dict[str, Any]],
        role: str
    ) -> Dict[str, Any]:
        return await self.fallback.answer_rag_query(query, retrieved_documents, role)
