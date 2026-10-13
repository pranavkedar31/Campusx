"""
Pydantic schemas for AI Assistant and Grounded Intelligence.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class AIChatRequest(BaseModel):
    prompt: str = Field(..., min_length=2, max_length=2000)
    context_override: Optional[Dict[str, Any]] = None


class AIChatResponse(BaseModel):
    response: str
    role: str
    grounding_evidence: Dict[str, Any]
    provider: str
    timestamp: datetime


class SuggestedPromptResponse(BaseModel):
    role: str
    suggestions: List[str]
