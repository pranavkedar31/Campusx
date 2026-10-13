"""
OpenAI Provider for CampusX.
"""

from typing import Any, Dict, List, Optional
import json
from app.ai.base import BaseAIProvider
from app.ai.providers.mock import MockAIProvider
from app.core.config import settings


class OpenAIProvider(BaseAIProvider):
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or settings.OPENAI_API_KEY
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
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=self.api_key)
            messages = [
                {
                    "role": "system",
                    "content": (system_instruction or "You are CampusX AI, an academic assistant grounded in institutional facts.") +
                               f"\n\nContext Data:\n{json.dumps(context or {})}"
                },
                {"role": "user", "content": prompt}
            ]
            response = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                messages=messages
            )
            return response.choices[0].message.content or ""
        except Exception:
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
