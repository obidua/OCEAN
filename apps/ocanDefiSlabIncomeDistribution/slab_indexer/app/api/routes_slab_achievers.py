"""
API routes for SLAB achiever management and querying.
"""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.db import get_db
from app.services.slab_achiever_service import (
    sync_slab_achievers,
    get_user_slab_achievement,
    get_achievers_by_level,
    clear_day_achievements
)

router = APIRouter(prefix="/api/slab-achievers", tags=["SLAB Achievers"])


@router.post("/sync")
async def sync_achievers(
    day_id: int = Query(..., description="Day ID to associate with achievements"),
    db: AsyncSession = Depends(get_db)
):
    """
    Sync all SLAB achievers from blockchain to database.

    This will fetch all users who have achieved SLAB levels from the smart contract
    and store their achievements in the database for the specified day.
    """
    result = await sync_slab_achievers(db, day_id)
    return {
        "success": True,
        "message": "SLAB achievers synced successfully",
        "data": result
    }


@router.get("/user/{user_address}")
async def get_user_achievement(
    user_address: str,
    day_id: int = Query(..., description="Day ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get SLAB achievement for a specific user on a given day.

    Returns the SLAB level and percentage achieved by the user.
    """
    result = await get_user_slab_achievement(db, user_address, day_id)
    return {
        "success": True,
        "data": result
    }


@router.get("/level/{slab_level}")
async def get_level_achievers(
    slab_level: int,
    day_id: int = Query(..., description="Day ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all users who achieved a specific SLAB level on a given day.

    Args:
        slab_level: SLAB level (0-10, corresponding to 5%-60%)
        day_id: Day ID
    """
    if slab_level < 0 or slab_level > 10:
        return {
            "success": False,
            "error": "Invalid slab_level. Must be between 0 and 10."
        }

    result = await get_achievers_by_level(db, day_id, slab_level)
    return {
        "success": True,
        "day_id": day_id,
        "slab_level": slab_level,
        "slab_percentage": [5, 10, 15, 20, 25, 30, 35, 45, 50, 55, 60][slab_level],
        "total_achievers": len(result),
        "achievers": result
    }


@router.delete("/day/{day_id}")
async def clear_day_data(
    day_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Clear all SLAB achievement records for a specific day.

    Useful for resyncing data. Use with caution!
    """
    deleted_count = await clear_day_achievements(db, day_id)
    return {
        "success": True,
        "message": f"Cleared achievements for day {day_id}",
        "deleted_records": deleted_count
    }
