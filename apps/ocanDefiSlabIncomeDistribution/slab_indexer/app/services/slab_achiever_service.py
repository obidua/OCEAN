"""
Service for syncing SLAB achievers from the blockchain to the database.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from datetime import datetime
from app.contracts.slab_manager import slab_manager_contract
from app.models.slab_achiever import SlabAchievement


async def sync_slab_achievers(db: AsyncSession, day_id: int) -> dict:
    """
    Fetch all SLAB achievers from the blockchain and sync to database.

    Args:
        db: Database session
        day_id: Day ID to associate with this sync

    Returns:
        Dictionary with sync statistics
    """
    print(f"Starting SLAB achievers sync for day_id={day_id}...")

    # Fetch all achievers from blockchain
    achievers_by_stage = slab_manager_contract.get_all_slab_achievers()

    total_synced = 0
    total_new = 0
    total_updated = 0

    for stage, addresses in achievers_by_stage.items():
        slab_percentage = slab_manager_contract.get_slab_percentage(stage)

        for address in addresses:
            address_lower = address.lower()

            # Check if record exists
            stmt = select(SlabAchievement).where(
                SlabAchievement.user_address == address_lower,
                SlabAchievement.day_id == day_id
            )
            result = await db.execute(stmt)
            existing = result.scalar_one_or_none()

            if existing:
                # Update if slab level changed
                if existing.slab_level != stage or existing.slab_percentage != slab_percentage:
                    existing.slab_level = stage
                    existing.slab_percentage = slab_percentage
                    existing.achieved_at = datetime.utcnow()
                    total_updated += 1
            else:
                # Create new record
                achievement = SlabAchievement(
                    user_address=address_lower,
                    day_id=day_id,
                    slab_level=stage,
                    slab_percentage=slab_percentage
                )
                db.add(achievement)
                total_new += 1

            total_synced += 1

    await db.commit()

    print(f"SLAB achievers sync complete. Total: {total_synced}, New: {total_new}, Updated: {total_updated}")

    return {
        "day_id": day_id,
        "total_synced": total_synced,
        "new_records": total_new,
        "updated_records": total_updated,
        "stages_synced": len(achievers_by_stage),
        "synced_at": datetime.utcnow().isoformat()
    }


async def get_user_slab_achievement(db: AsyncSession, user_address: str, day_id: int) -> dict:
    """
    Get SLAB achievement for a specific user and day.

    Args:
        db: Database session
        user_address: User wallet address
        day_id: Day ID

    Returns:
        Dictionary with user's SLAB achievement data or None
    """
    user_address = user_address.lower()

    stmt = select(SlabAchievement).where(
        SlabAchievement.user_address == user_address,
        SlabAchievement.day_id == day_id
    )
    result = await db.execute(stmt)
    achievement = result.scalar_one_or_none()

    if not achievement:
        return {
            "user_address": user_address,
            "day_id": day_id,
            "has_achievement": False,
            "slab_level": None,
            "slab_percentage": None
        }

    return {
        "user_address": achievement.user_address,
        "day_id": achievement.day_id,
        "has_achievement": True,
        "slab_level": achievement.slab_level,
        "slab_percentage": float(achievement.slab_percentage),
        "achieved_at": achievement.achieved_at.isoformat() if achievement.achieved_at else None
    }


async def get_achievers_by_level(db: AsyncSession, day_id: int, slab_level: int) -> list[dict]:
    """
    Get all achievers for a specific SLAB level on a given day.

    Args:
        db: Database session
        day_id: Day ID
        slab_level: SLAB level (0-10)

    Returns:
        List of user addresses who achieved this level
    """
    stmt = select(SlabAchievement).where(
        SlabAchievement.day_id == day_id,
        SlabAchievement.slab_level == slab_level
    ).order_by(SlabAchievement.achieved_at.desc())

    result = await db.execute(stmt)
    achievements = result.scalars().all()

    return [
        {
            "user_address": ach.user_address,
            "slab_level": ach.slab_level,
            "slab_percentage": float(ach.slab_percentage),
            "achieved_at": ach.achieved_at.isoformat() if ach.achieved_at else None
        }
        for ach in achievements
    ]


async def clear_day_achievements(db: AsyncSession, day_id: int) -> int:
    """
    Clear all SLAB achievements for a specific day.
    Useful for resyncing data.

    Args:
        db: Database session
        day_id: Day ID to clear

    Returns:
        Number of records deleted
    """
    stmt = delete(SlabAchievement).where(SlabAchievement.day_id == day_id)
    result = await db.execute(stmt)
    await db.commit()
    return result.rowcount
