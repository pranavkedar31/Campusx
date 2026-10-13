"""
Machine Learning Student Risk Predictor Service.
Loads the trained Random Forest model, runs inference on academic features,
and generates explainable insights with recommended interventions.
"""

from pathlib import Path
from typing import Dict, List, Any, Optional
import numpy as np
import joblib

MODEL_PATH = Path(__file__).resolve().parent / "student_risk_model.joblib"
ALT_MODEL_PATH = Path(__file__).resolve().parent.parent.parent.parent / "ml" / "models" / "student_risk_model.joblib"

_model_bundle = None


def get_model_bundle():
    global _model_bundle
    if _model_bundle is not None:
        return _model_bundle

    if MODEL_PATH.exists():
        _model_bundle = joblib.load(MODEL_PATH)
    elif ALT_MODEL_PATH.exists():
        _model_bundle = joblib.load(ALT_MODEL_PATH)
    return _model_bundle


def predict_risk(
    attendance_pct: float,
    cgpa: float,
    failed_assessments_count: int,
    assignment_submission_rate: float = 85.0,
    marks_drop: float = 0.0
) -> Dict[str, Any]:
    """
    Run risk classification inference on student feature inputs.
    """
    bundle = get_model_bundle()
    features = np.array([[
        attendance_pct,
        cgpa,
        failed_assessments_count,
        assignment_submission_rate,
        marks_drop
    ]])

    if bundle and "model" in bundle:
        model = bundle["model"]
        class_labels = bundle.get("class_labels", ["LOW", "MODERATE", "HIGH"])
        probs = model.predict_proba(features)[0]
        pred_idx = int(np.argmax(probs))
        risk_level = class_labels[pred_idx]
        prob_dict = {class_labels[i]: round(float(probs[i]), 3) for i in range(len(class_labels))}
        # Risk score is probability of MODERATE (weighted 0.5) + HIGH (weighted 1.0)
        risk_score = round(float(probs[1] * 0.5 + probs[2]), 2) if len(probs) >= 3 else round(float(probs[pred_idx]), 2)
    else:
        # Fallback calibrated heuristic if model artifact is unavailable
        risk_score = 0.0
        if attendance_pct < 65.0:
            risk_score += 0.4
        elif attendance_pct < 75.0:
            risk_score += 0.2

        if cgpa < 5.5:
            risk_score += 0.4
        elif cgpa < 7.0:
            risk_score += 0.2

        if failed_assessments_count >= 2:
            risk_score += 0.3
        elif failed_assessments_count >= 1:
            risk_score += 0.15

        risk_score = min(round(risk_score, 2), 1.0)
        if risk_score >= 0.65:
            risk_level = "HIGH"
        elif risk_score >= 0.35:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"
        prob_dict = {"LOW": round(1.0 - risk_score, 2), "MODERATE": round(risk_score * 0.5, 2), "HIGH": round(risk_score * 0.5, 2)}

    # Top contributing factors (Explainability)
    factors = []
    if attendance_pct < 65.0:
        factors.append(f"Critical attendance deficit: {attendance_pct:.1f}% (below 65% mandatory threshold)")
    elif attendance_pct < 75.0:
        factors.append(f"Attendance warning: {attendance_pct:.1f}% (below 75% institutional requirement)")

    if cgpa < 5.5:
        factors.append(f"Severely low cumulative GPA: {cgpa:.2f} / 10.0")
    elif cgpa < 6.5:
        factors.append(f"Borderline academic standing: CGPA {cgpa:.2f}")

    if failed_assessments_count > 0:
        factors.append(f"Failed {failed_assessments_count} course internal/terminal assessments")

    if marks_drop > 15.0:
        factors.append(f"Steep negative grade trajectory (-{marks_drop:.1f}% recent score decline)")

    if assignment_submission_rate < 70.0:
        factors.append(f"Low coursework submission rate ({assignment_submission_rate:.1f}%)")

    if not factors:
        factors.append("Consistent attendance, solid grade trajectory, and zero course arrears")

    # Recommended Intervention Actions
    interventions = []
    if risk_level == "HIGH":
        interventions.append("Urgent one-on-one academic mentoring session with Department Head")
        interventions.append("Mandatory remedial tutorial attendance for failed subjects")
        interventions.append("Issue formal early-warning notice to academic advisor and student")
    elif risk_level == "MODERATE":
        interventions.append("Advise student on attendance recovery plan before semester cutoff")
        interventions.append("Recommend peer-assisted study group and library workshop")
    else:
        interventions.append("Maintain existing academic study rhythm and project commitments")
        interventions.append("Eligible for advanced research track and honors electives")

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "probabilities": prob_dict,
        "contributing_factors": factors,
        "recommended_interventions": interventions
    }
