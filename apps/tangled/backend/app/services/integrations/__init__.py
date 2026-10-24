from .base import BaseIntegrationAdapter
from .moodle import MoodleIntegrationAdapter
from .sap import SAPSLcMIntegrationAdapter
from .registry import registry, IntegrationRegistry

__all__ = [
    "BaseIntegrationAdapter",
    "MoodleIntegrationAdapter",
    "SAPSLcMIntegrationAdapter",
    "registry",
    "IntegrationRegistry",
]
