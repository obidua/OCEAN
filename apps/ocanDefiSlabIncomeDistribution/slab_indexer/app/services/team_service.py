"""
Team service for fetching and analyzing user team structures
"""
from typing import Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


async def get_user_team(db: AsyncSession, user_address: str) -> Dict:
    """
    Get complete team structure for a user including:
    - Directs (direct referrals)
    - Downlines (recursive)
    - Max depth
    - Total team count
    - Leg-wise team counts (each direct forms a leg)

    Args:
        db: Database session
        user_address: Address of the user whose team to fetch

    Returns:
        Dictionary containing:
        {
            "user_address": str,
            "total_team_count": int,
            "max_depth": int,
            "directs_count": int,
            "legs": [
                {
                    "direct_address": str,
                    "direct_user_id": int,
                    "leg_count": int,
                    "leg_depth": int,
                    "team": [list of team members]
                }
            ]
        }
    """
    # Normalize address
    user_address = user_address.lower()

    # Check if user exists
    result = await db.execute(
        select(User).where(User.user_address == user_address)
    )
    user = result.scalar_one_or_none()

    if not user:
        return {
            "error": "User not found",
            "user_address": user_address,
            "total_team_count": 0,
            "max_depth": 0,
            "directs_count": 0,
            "legs": []
        }

    # Get direct referrals (people who have this user as referrer)
    result = await db.execute(
        select(User).where(User.referrer_address == user_address)
    )
    directs = result.scalars().all()

    # Build leg structure for each direct
    legs = []
    total_team_count = 0
    max_depth_overall = 0

    for direct in directs:
        # Recursively get the team for this direct
        leg_team, leg_count, leg_depth = await _get_downline_recursive(
            db,
            direct.user_address,
            current_depth=1,
            visited=set()
        )

        legs.append({
            "direct_address": direct.user_address,
            "direct_user_id": direct.user_id,
            "direct_created_at": direct.created_at.isoformat() if direct.created_at else None,
            "leg_count": leg_count,
            "leg_depth": leg_depth,
            "team": leg_team
        })

        total_team_count += leg_count
        max_depth_overall = max(max_depth_overall, leg_depth)

    return {
        "user_address": user_address,
        "user_id": user.user_id,
        "total_team_count": total_team_count,
        "max_depth": max_depth_overall,
        "directs_count": len(directs),
        "legs": legs
    }


async def _get_downline_recursive(
    db: AsyncSession,
    user_address: str,
    current_depth: int = 1,
    visited: Optional[set] = None
) -> tuple[List[Dict], int, int]:
    """
    Recursively fetch all downlines for a user.

    Args:
        db: Database session
        user_address: Address to fetch downlines for
        current_depth: Current depth in the tree
        visited: Set of already visited addresses (to prevent circular refs)

    Returns:
        Tuple of (team_list, total_count, max_depth)
    """
    if visited is None:
        visited = set()

    # Prevent circular references
    if user_address in visited:
        return [], 0, current_depth - 1

    visited.add(user_address)

    # Get direct referrals of this user
    result = await db.execute(
        select(User).where(User.referrer_address == user_address.lower())
    )
    directs = result.scalars().all()

    if not directs:
        # Leaf node
        return [], 0, current_depth

    team = []
    total_count = len(directs)  # Count the directs
    max_depth = current_depth

    for direct in directs:
        # Recursively get this direct's team
        sub_team, sub_count, sub_depth = await _get_downline_recursive(
            db,
            direct.user_address,
            current_depth + 1,
            visited
        )

        team.append({
            "address": direct.user_address,
            "user_id": direct.user_id,
            "referrer": direct.referrer_address,
            "tier": direct.tier,
            "total_directs": direct.total_directs,
            "created_at": direct.created_at.isoformat() if direct.created_at else None,
            "depth": current_depth,
            "downline_count": sub_count,
            "downlines": sub_team
        })

        total_count += sub_count
        max_depth = max(max_depth, sub_depth)

    return team, total_count, max_depth


async def get_leg_summary(db: AsyncSession, user_address: str) -> Dict:
    """
    Get a summary of team distribution across legs (simplified, no full tree).

    Returns just the counts and depths for each leg without full team data.
    """
    user_address = user_address.lower()

    # Get direct referrals
    result = await db.execute(
        select(User).where(User.referrer_address == user_address)
    )
    directs = result.scalars().all()

    legs_summary = []
    total_team = 0

    for direct in directs:
        # Count downlines for this leg
        leg_count = await _count_downline_recursive(db, direct.user_address, set())
        leg_depth = await _get_max_depth_recursive(db, direct.user_address, 1, set())

        legs_summary.append({
            "direct_address": direct.user_address,
            "direct_user_id": direct.user_id,
            "leg_total_count": leg_count,
            "leg_max_depth": leg_depth
        })

        total_team += leg_count

    return {
        "user_address": user_address,
        "directs_count": len(directs),
        "total_team_count": total_team,
        "legs": legs_summary
    }


async def _count_downline_recursive(
    db: AsyncSession,
    user_address: str,
    visited: set
) -> int:
    """
    Count total downlines recursively (no data, just count).
    """
    if user_address in visited:
        return 0

    visited.add(user_address)

    result = await db.execute(
        select(User).where(User.referrer_address == user_address.lower())
    )
    directs = result.scalars().all()

    count = len(directs)

    for direct in directs:
        count += await _count_downline_recursive(db, direct.user_address, visited)

    return count


async def _get_max_depth_recursive(
    db: AsyncSession,
    user_address: str,
    current_depth: int,
    visited: set
) -> int:
    """
    Get maximum depth recursively.
    """
    if user_address in visited:
        return current_depth - 1

    visited.add(user_address)

    result = await db.execute(
        select(User).where(User.referrer_address == user_address.lower())
    )
    directs = result.scalars().all()

    if not directs:
        return current_depth

    max_depth = current_depth

    for direct in directs:
        depth = await _get_max_depth_recursive(
            db,
            direct.user_address,
            current_depth + 1,
            visited
        )
        max_depth = max(max_depth, depth)

    return max_depth
