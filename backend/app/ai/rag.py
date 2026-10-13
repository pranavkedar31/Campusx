"""
Retrieval-Augmented Generation (RAG) Campus Knowledge Engine.
Indexes institutional regulations, policies, and codes of conduct,
performing vector-similarity document search to produce grounded answers.
"""

from pathlib import Path
from typing import List, Dict, Any, Optional
import re
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from app.ai.factory import get_ai_provider

KNOWLEDGE_BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "ai" / "knowledge_base"


class CampusKnowledgeRAG:
    def __init__(self):
        self.chunks: List[Dict[str, Any]] = []
        self.vectorizer: Optional[TfidfVectorizer] = None
        self.tfidf_matrix = None
        self._index_documents()

    def _index_documents(self):
        """Parse and chunk all markdown policy documents."""
        self.chunks = []
        if not KNOWLEDGE_BASE_DIR.exists():
            return

        md_files = list(KNOWLEDGE_BASE_DIR.glob("*.md"))
        for file_path in md_files:
            try:
                content = file_path.read_text(encoding="utf-8")
                doc_title = file_path.stem.replace("_", " ").title()

                # Extract top heading if present
                lines = content.splitlines()
                if lines and lines[0].startswith("# "):
                    doc_title = lines[0][2:].strip()

                # Split by sections (## Article ...)
                sections = re.split(r'\n(?=##\s+)', content)
                for sec in sections:
                    sec_clean = sec.strip()
                    if not sec_clean:
                        continue

                    sec_title = "General"
                    first_line = sec_clean.splitlines()[0]
                    if first_line.startswith("## "):
                        sec_title = first_line[3:].strip()
                    elif first_line.startswith("# "):
                        sec_title = first_line[2:].strip()

                    self.chunks.append({
                        "doc_id": file_path.name,
                        "title": doc_title,
                        "section": sec_title,
                        "content": sec_clean,
                        "filename": file_path.name
                    })
            except Exception as e:
                print(f"Error indexing {file_path}: {e}")

        if self.chunks:
            corpus = [f"{c['title']} {c['section']} {c['content']}" for c in self.chunks]
            self.vectorizer = TfidfVectorizer(stop_words="english", ngram_range=(1, 2))
            self.tfidf_matrix = self.vectorizer.fit_transform(corpus)

    def retrieve(self, query: str, top_k: int = 3, min_similarity: float = 0.05) -> List[Dict[str, Any]]:
        """Retrieve most relevant policy sections based on vector cosine similarity."""
        if not self.chunks or not self.vectorizer or self.tfidf_matrix is None:
            return []

        query_vec = self.vectorizer.transform([query])
        sims = cosine_similarity(query_vec, self.tfidf_matrix)[0]

        top_indices = sims.argsort()[::-1][:top_k]
        results = []
        for idx in top_indices:
            score = float(sims[idx])
            if score >= min_similarity:
                chunk = self.chunks[idx].copy()
                chunk["relevance_score"] = round(score, 3)
                results.append(chunk)

        return results

    async def answer(self, query: str, role: str = "STUDENT") -> Dict[str, Any]:
        """Produce evidence-backed answer citing verified policy documents."""
        retrieved = self.retrieve(query, top_k=3)

        if not retrieved:
            return {
                "query": query,
                "answer": "Insufficient verified institutional documentation found matching this inquiry. Please consult the Student Handbook, Department Dean, or University Registrar for definitive policy guidance.",
                "sources": [],
                "confidence": "LOW",
                "retrieved_chunks": []
            }

        provider = get_ai_provider()
        rag_res = await provider.answer_rag_query(
            query=query,
            retrieved_documents=retrieved,
            role=role
        )

        return {
            "query": query,
            "answer": rag_res.get("answer", ""),
            "sources": rag_res.get("sources", []),
            "confidence": rag_res.get("confidence", "HIGH"),
            "retrieved_chunks": [
                {
                    "title": c["title"],
                    "section": c["section"],
                    "content": c["content"],
                    "relevance_score": c.get("relevance_score", 1.0)
                }
                for c in retrieved
            ]
        }

    def list_indexed_documents(self) -> List[Dict[str, Any]]:
        """List summary of indexed institutional policy documents."""
        unique_docs = {}
        for c in self.chunks:
            fname = c["filename"]
            if fname not in unique_docs:
                unique_docs[fname] = {
                    "filename": fname,
                    "title": c["title"],
                    "sections_count": 0,
                    "sections": []
                }
            unique_docs[fname]["sections_count"] += 1
            unique_docs[fname]["sections"].append(c["section"])

        return list(unique_docs.values())


# Singleton instance
_rag_engine: Optional[CampusKnowledgeRAG] = None


def get_rag_engine() -> CampusKnowledgeRAG:
    global _rag_engine
    if _rag_engine is None:
        _rag_engine = CampusKnowledgeRAG()
    return _rag_engine
