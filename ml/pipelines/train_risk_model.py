"""
Student Academic Risk Model Training Pipeline.
Trains a Random Forest Classifier to identify at-risk students based on attendance,
grades, failed assessments, submission rates, and performance drops.
"""

import os
from pathlib import Path
import json
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import joblib

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
MODELS_DIR = BASE_DIR / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_SAVE_PATH = MODELS_DIR / "student_risk_model.joblib"


def generate_synthetic_academic_data(n_samples: int = 1500, random_seed: int = 42):
    """
    Generates a realistic student academic performance dataset.
    Features:
      0: attendance_pct (45.0 - 100.0)
      1: cgpa (4.0 - 10.0)
      2: failed_assessments_count (0 - 5)
      3: assignment_submission_rate (40.0 - 100.0)
      4: marks_drop (percentage drop: -5.0 to 30.0)
    """
    np.random.seed(random_seed)

    attendance = np.random.normal(loc=78.0, scale=14.0, size=n_samples)
    attendance = np.clip(attendance, 40.0, 100.0)

    cgpa = np.random.normal(loc=7.2, scale=1.4, size=n_samples)
    cgpa = np.clip(cgpa, 3.5, 10.0)

    assignment_rate = np.random.normal(loc=82.0, scale=15.0, size=n_samples)
    assignment_rate = np.clip(assignment_rate, 35.0, 100.0)

    # Correlate failed assessments with low attendance and low CGPA
    base_fails = np.where(cgpa < 5.5, 3, np.where(cgpa < 7.0, 1, 0))
    att_fails = np.where(attendance < 65.0, 2, np.where(attendance < 75.0, 1, 0))
    fails = base_fails + att_fails + np.random.poisson(lam=0.4, size=n_samples)
    fails = np.clip(fails, 0, 6)

    # Marks drop: positive means grades declined recently
    marks_drop = np.random.normal(loc=4.0, scale=8.0, size=n_samples)
    marks_drop = np.where(attendance < 65.0, marks_drop + 10.0, marks_drop)
    marks_drop = np.clip(marks_drop, -10.0, 35.0)

    X = np.column_stack([attendance, cgpa, fails, assignment_rate, marks_drop])

    # Determine ground truth risk level:
    # 0 = LOW, 1 = MODERATE, 2 = HIGH
    y = np.zeros(n_samples, dtype=int)
    for i in range(n_samples):
        att = attendance[i]
        gpa = cgpa[i]
        fl = fails[i]
        sub = assignment_rate[i]
        drp = marks_drop[i]

        risk_score = 0
        if att < 65.0:
            risk_score += 3
        elif att < 75.0:
            risk_score += 1.5

        if gpa < 5.5:
            risk_score += 3
        elif gpa < 7.0:
            risk_score += 1.5

        if fl >= 3:
            risk_score += 3.5
        elif fl >= 1:
            risk_score += 1.5

        if sub < 60.0:
            risk_score += 2
        elif sub < 75.0:
            risk_score += 1

        if drp > 18.0:
            risk_score += 2.5
        elif drp > 10.0:
            risk_score += 1.5

        # Noise perturbation
        risk_score += np.random.normal(0, 0.5)

        if risk_score >= 5.5:
            y[i] = 2  # HIGH
        elif risk_score >= 2.5:
            y[i] = 1  # MODERATE
        else:
            y[i] = 0  # LOW

    return X, y


def train_and_export_model():
    print("Generating synthetic student academic performance dataset (1500 samples)...")
    X, y = generate_synthetic_academic_data(n_samples=1500)

    feature_names = [
        "attendance_pct",
        "cgpa",
        "failed_assessments_count",
        "assignment_submission_rate",
        "marks_drop"
    ]
    class_labels = ["LOW", "MODERATE", "HIGH"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    print(f"Training RandomForestClassifier on {len(X_train)} samples...")
    clf = RandomForestClassifier(
        n_estimators=100,
        max_depth=6,
        min_samples_split=4,
        class_weight="balanced",
        random_state=42
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    report = classification_report(y_test, y_pred, target_names=class_labels, output_dict=True)
    matrix = confusion_matrix(y_test, y_pred).tolist()

    print(f"\nModel Performance on Test Set:")
    print(f"Accuracy: {acc * 100:.2f}%")
    print(classification_report(y_test, y_pred, target_names=class_labels))

    # Feature Importances
    importances = {
        feat: round(float(imp), 4)
        for feat, imp in zip(feature_names, clf.feature_importances_)
    }
    print(f"Feature Importances: {importances}")

    # Artifact Bundle
    bundle = {
        "model": clf,
        "feature_names": feature_names,
        "class_labels": class_labels,
        "metrics": {
            "accuracy": round(float(acc), 4),
            "report": report,
            "confusion_matrix": matrix,
            "feature_importances": importances
        }
    }

    # Save to ml/models/student_risk_model.joblib
    joblib.dump(bundle, MODEL_SAVE_PATH)
    print(f"\nModel serialized successfully to: {MODEL_SAVE_PATH}")

    # Also save an operational copy to backend/app/ml for instant backend loading
    backend_ml_dir = Path(__file__).resolve().parent.parent.parent / "backend" / "app" / "ml"
    backend_ml_dir.mkdir(parents=True, exist_ok=True)
    backend_model_path = backend_ml_dir / "student_risk_model.joblib"
    joblib.dump(bundle, backend_model_path)
    print(f"Operational copy saved to: {backend_model_path}")


if __name__ == "__main__":
    train_and_export_model()
