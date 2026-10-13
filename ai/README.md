# Artificial Intelligence & RAG Knowledge Engine

This directory houses system prompts, campus knowledge base documents, and vector index assets for CampusX AI assistants.

## Assistants:
1. **Student AI Assistant**:
   - Authorized personal academic tutoring, study schedule recommendations, weakness breakdown.
   - Enforces strict student-only data isolation.
2. **Faculty AI Assistant**:
   - Class-level performance summarization, low-attendance alerts, mentoring recommendations.
3. **Campus Knowledge Assistant (RAG)**:
   - Queries student handbooks, examination codes, leave rules, and placement procedures.
   - Cites official campus documents.
   - Never hallucinates; returns *"I could not find this information in the available campus knowledge base."* when context is missing.

## Security & Anti-Hallucination:
- Prompt-injection defenses preventing user queries from altering system instructions.
- Zero-exposure policy for API keys, secrets, and database credentials.
- Role-based retrieval gating before documents or data reach the model context.
