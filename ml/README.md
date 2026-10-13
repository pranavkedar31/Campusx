# Machine Learning Architecture & Artifacts

This directory contains pipelines, feature extractors, and serialized model artifacts for CampusX predictive student intelligence.

## Planned Models:
1. **Student Academic Risk Classifier**:
   - Algorithms: Random Forest Classifier / Logistic Regression
   - Target Classes: `LOW RISK`, `MODERATE RISK`, `HIGH RISK`
   - Features: Historical CGPA, attendance percentage, assignment submission rate, internal assessment variance, failed prerequisites.
   - Explainability: SHAP values / feature importance coefficients.

2. **Attendance & Performance Anomaly Detector**:
   - Algorithm: Isolation Forest
   - Detects sudden drops in attendance and aberrant assessment scores.

## Structure:
- `data/`: Processed feature sets and synthetic training inputs.
- `models/`: Serialized model artifacts (`.joblib`).
- `pipelines/`: Scikit-learn pipelines for training and feature engineering.
- `evaluation/`: Accuracy, precision, recall, and confusion matrix evaluators.
