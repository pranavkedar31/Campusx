# CampusX Utilities & Automation Scripts

This directory contains standalone execution scripts for database population, model training, and knowledge base initialization.

## Available Scripts:
- `seed_data.py`: Generates 1,000+ realistic synthetic student records, faculty, courses, attendance patterns, and placement history without using real personal information (Phase 2+).
- `train_models.py`: Trains and serializes the Scikit-learn student risk prediction models into `ml/models/` (Phase 8).
- `init_vector_store.py`: Ingests and vectorizes campus policies from `ai/knowledge_base/` into PostgreSQL pgvector or FAISS (Phase 10).
