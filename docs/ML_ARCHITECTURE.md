# CampusX Machine Learning Architecture Specification

## 1. Objectives

The ML subsystem provides explainable predictive intelligence for early student academic intervention.

## 2. Models & Formulations

### 2.1 Student Risk Classifier
- **Model**: `RandomForestClassifier` with `LogisticRegression` baseline.
- **Target Variable**: Academic Risk Category:
  - `0`: LOW RISK (CGPA $\ge$ 7.5, Attendance $\ge$ 80%, No failed subjects)
  - `1`: MODERATE RISK (CGPA 6.0 - 7.4, Attendance 65% - 79%, 1-2 missed assignments)
  - `2`: HIGH RISK (CGPA < 6.0, Attendance < 65%, Repeated missed exams or assessments)
- **Features**:
  1. `attendance_percentage` (float, 0-100)
  2. `current_cgpa` (float, 0-10)
  3. `assignment_completion_rate` (float, 0-1)
  4. `midterm_score_average` (float, 0-100)
  5. `failed_subjects_count` (int)
  6. `recent_score_trend` (delta between last two assessment rounds)

### 2.2 Anomaly Detector
- **Model**: `IsolationForest`
- **Purpose**: Detect anomalous sharp drops in attendance or unexpected performance volatility that require immediate faculty check-in.

## 3. Explainability & Ethics

> [!IMPORTANT]
> **Model Prediction Notice**: All ML outputs are labeled explicitly as **"Model Prediction"** to remind faculty and administrators that outputs are statistical indicators rather than guaranteed outcomes.

- Model predictions include the **top contributing factors** (e.g., `["Attendance below 65%", "18% drop in internal marks"]`).
- Feature importances and decision paths are logged alongside predictions.
