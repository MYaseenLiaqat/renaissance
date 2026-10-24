"""Enterprise LMS and SIS Integrations Router for Renaissance / Tangled."""
from fastapi import APIRouter, HTTPException, Query
from ..services.integrations import registry

router = APIRouter()


@router.get("/status")
async def list_integrations_status():
    """Return health and synchronization status for all registered institutional integrations."""
    return await registry.get_all_statuses()


@router.post("/{name}/test")
async def test_integration(name: str):
    """Trigger a live connectivity and credential test for the specified integration adapter."""
    adapter = registry.get_adapter(name)
    if not adapter:
        raise HTTPException(404, f"Integration '{name}' is not recognized or installed.")
    return await adapter.test_connection()


@router.post("/{name}/sync")
async def sync_integration(name: str, course_id: int | None = Query(default=None)):
    """Trigger roster and curriculum synchronization for an integration adapter."""
    adapter = registry.get_adapter(name)
    if not adapter:
        raise HTTPException(404, f"Integration '{name}' is not recognized or installed.")
    roster_res = await adapter.sync_roster(course_id)
    materials_res = await adapter.sync_course_materials(course_id)
    return {
        "integration": name,
        "roster_sync": roster_res,
        "materials_sync": materials_res,
    }


@router.post("/{name}/export-grades")
async def export_grades(name: str, course_id: int | None = Query(default=None)):
    """Export assessment and mastery grades back to the upstream LMS or SIS."""
    adapter = registry.get_adapter(name)
    if not adapter:
        raise HTTPException(404, f"Integration '{name}' is not recognized or installed.")
    return await adapter.export_grades(course_id)
