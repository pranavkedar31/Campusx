"""
Factory module to instantiate the configured AI Provider.
"""

from app.core.config import settings
from app.ai.base import BaseAIProvider
from app.ai.providers.mock import MockAIProvider
from app.ai.providers.gemini import GeminiAIProvider
from app.ai.providers.openai import OpenAIProvider

_provider_instance: BaseAIProvider = None


def get_ai_provider() -> BaseAIProvider:
    """Returns singleton instance of the configured AI provider."""
    global _provider_instance
    if _provider_instance is not None:
        return _provider_instance

    prov = (settings.AI_PROVIDER or "mock").lower()
    if prov == "gemini" and settings.GEMINI_API_KEY:
        _provider_instance = GeminiAIProvider()
    elif prov == "openai" and settings.OPENAI_API_KEY:
        _provider_instance = OpenAIProvider()
    else:
        _provider_instance = MockAIProvider()

    return _provider_instance
