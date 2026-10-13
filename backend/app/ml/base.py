"""
Abstract base class for Machine Learning models in CampusX.
Specifies standards for student risk prediction and early warning anomaly detection.
Training and inference pipelines are scheduled for Phase 8.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List


class BaseMLModel(ABC):
    """
    Standard interface for all predictive ML models in CampusX.
    Requires explainability and feature contribution tracking.
    """

    @abstractmethod
    def train(self, features: Any, targets: Any) -> Dict[str, float]:
        """Train the model on prepared dataset and return performance evaluation metrics."""
        pass

    @abstractmethod
    def predict(self, feature_vector: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute prediction for a student.
        Must return:
        - risk_level ('LOW RISK', 'MODERATE RISK', 'HIGH RISK')
        - confidence_score (float)
        - contributing_factors (List[str] or Dict[str, float])
        - model_version (str)
        """
        pass

    @abstractmethod
    def save(self, filepath: str) -> None:
        """Persist model artifact using joblib."""
        pass

    @abstractmethod
    def load(self, filepath: str) -> None:
        """Load model artifact from disk."""
        pass
