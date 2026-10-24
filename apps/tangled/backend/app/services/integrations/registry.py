"""Registry of enterprise integrations (Moodle, SAP, LTI)."""
from typing import Any
from .base import BaseIntegrationAdapter
from .moodle import MoodleIntegrationAdapter
from .sap import SAPSLcMIntegrationAdapter


class IntegrationRegistry:
    def __init__(self):
        self._adapters: dict[str, BaseIntegrationAdapter] = {
            "moodle": MoodleIntegrationAdapter(),
            "sap": SAPSLcMIntegrationAdapter(),
        }

    def get_adapter(self, name: str) -> BaseIntegrationAdapter | None:
        return self._adapters.get(name.lower())

    def list_adapters(self) -> list[BaseIntegrationAdapter]:
        return list(self._adapters.values())

    async def get_all_statuses(self) -> list[dict[str, Any]]:
        statuses = []
        for adapter in self._adapters.values():
            overview = adapter.get_status_overview()
            try:
                test = await adapter.test_connection()
                overview["mode"] = test.get("mode", "mock")
                overview["health"] = "healthy" if test.get("connected") else "mock_contract"
                overview["latency_ms"] = test.get("latency_ms")
                overview["details"] = test.get("details")
            except Exception as exc:
                overview["health"] = "error"
                overview["details"] = str(exc)
            statuses.append(overview)
        return statuses


registry = IntegrationRegistry()
