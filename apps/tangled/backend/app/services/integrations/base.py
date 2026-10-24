"""Abstract Base Class for Enterprise LMS and SIS Integration Adapters."""
from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any


class BaseIntegrationAdapter(ABC):
    name: str = "base"
    display_name: str = "Base Adapter"
    description: str = ""
    version: str = "1.0.0"
    category: str = "LMS"  # "LMS" or "SIS"

    @abstractmethod
    async def test_connection(self) -> dict[str, Any]:
        """Verify connectivity and credentials with the upstream system."""
        pass

    @abstractmethod
    async def sync_roster(self, course_id: int | None = None) -> dict[str, Any]:
        """Synchronize course enrollment and student roster from LMS/SIS."""
        pass

    @abstractmethod
    async def sync_course_materials(self, course_id: int | None = None) -> dict[str, Any]:
        """Import or synchronize course syllabi and documents."""
        pass

    @abstractmethod
    async def export_grades(self, course_id: int | None = None) -> dict[str, Any]:
        """Post assessment scores and progress milestones back to the gradebook."""
        pass

    def get_status_overview(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "display_name": self.display_name,
            "description": self.description,
            "version": self.version,
            "category": self.category,
            "status": "ready",
            "last_checked": datetime.now(timezone.utc).isoformat(),
        }
