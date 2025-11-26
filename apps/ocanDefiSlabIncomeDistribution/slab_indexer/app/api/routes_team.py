"""
API routes for team/referral tree operations
Using database procedures for optimal performance
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_db
from app.services.team_service_db import (
    get_user_team,
    get_leg_summary,
    get_team_tree_flat,
    get_directs_only,
    get_team_stats,
    get_legs_portfolio_volume,
    get_team_total_portfolio_volume,
    calculate_user_roi_for_day,
    calculate_team_roi_for_day,
    calculate_legs_roi_for_day,
    get_leg_roi_details_for_day
)

router = APIRouter()


@router.get("/team/{user_address}")
async def get_team_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete team structure for a user.

    Returns:
    - All directs and their downlines (recursive)
    - Total team count
    - Max depth
    - Leg-wise breakdown

    Example: GET /api/team/0x123...
    """
    try:
        team_data = await get_user_team(db, user_address)
        return team_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/summary")
async def get_team_summary_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get team summary (counts and depths only, no full tree).

    This is faster than the full team endpoint as it doesn't
    return the complete hierarchical data.

    Example: GET /api/team/0x123.../summary
    """
    try:
        summary = await get_leg_summary(db, user_address)
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/legs")
async def get_legs_breakdown_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get leg-wise team breakdown.

    Returns detailed breakdown of each leg (direct's team).

    Example: GET /api/team/0x123.../legs
    """
    try:
        team_data = await get_user_team(db, user_address)

        # Return just the legs array with summary
        return {
            "user_address": team_data["user_address"],
            "user_id": team_data.get("user_id"),
            "directs_count": team_data["directs_count"],
            "total_team_count": team_data["total_team_count"],
            "max_depth": team_data["max_depth"],
            "legs": [
                {
                    "direct_address": leg["direct_address"],
                    "direct_user_id": leg["direct_user_id"],
                    "leg_count": leg["leg_count"],
                    "leg_depth": leg["leg_depth"]
                }
                for leg in team_data["legs"]
            ]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/flat")
async def get_team_flat_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get complete team as a flat list (not hierarchical).

    Returns all team members with their depth level.
    Faster than hierarchical view for large teams.

    Example: GET /api/team/0x123.../flat
    """
    try:
        team_flat = await get_team_tree_flat(db, user_address)
        return {
            "user_address": user_address.lower(),
            "team_count": len(team_flat),
            "team": team_flat
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/directs")
async def get_directs_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get only direct referrals (no downlines).

    Fastest endpoint - returns just the first level.

    Example: GET /api/team/0x123.../directs
    """
    try:
        directs = await get_directs_only(db, user_address)
        return {
            "user_address": user_address.lower(),
            "directs_count": len(directs),
            "directs": directs
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/stats")
async def get_team_stats_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get quick team statistics only (no member data).

    Ultra-fast endpoint returning just counts and depth.

    Example: GET /api/team/0x123.../stats
    """
    try:
        stats = await get_team_stats(db, user_address)
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/portfolio-volume")
async def get_portfolio_volume_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get leg-wise portfolio volume breakdown.

    Returns total portfolio count and USD volume for each leg (direct + their downlines).
    Each leg shows:
    - Total number of portfolios in that leg
    - Sum of all principal_usd values
    - Volume in both micro USD and actual USD

    Example: GET /api/team/0x123.../portfolio-volume
    """
    try:
        volume_data = await get_legs_portfolio_volume(db, user_address)
        return volume_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/portfolio-volume/total")
async def get_total_portfolio_volume_route(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Get total portfolio volume across entire team.

    Ultra-fast endpoint returning aggregated portfolio stats only:
    - Total team member count
    - Total portfolio count across all team
    - Total USD volume across all portfolios

    Example: GET /api/team/0x123.../portfolio-volume/total
    """
    try:
        total_volume = await get_team_total_portfolio_volume(db, user_address)
        return total_volume
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/roi/user")
async def calculate_user_roi_route(
    user_address: str,
    day_id: int = Query(..., description="Day ID (Unix timestamp / 86400)"),
    price_micro_usd: int = Query(..., description="Price in micro USD (1e6)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate ROI for a single user for a specific day.

    Parameters:
    - day_id: Day ID (Unix timestamp divided by 86400)
    - price_micro_usd: RAMA price in micro USD (e.g., 500000 = $0.50)

    Returns user's total ROI across all their portfolios for that day.

    Example: GET /api/team/0x123.../roi/user?day_id=19750&price_micro_usd=500000
    """
    try:
        roi_data = await calculate_user_roi_for_day(db, user_address, day_id, price_micro_usd)
        return roi_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/roi/team")
async def calculate_team_roi_route(
    user_address: str,
    day_id: int = Query(..., description="Day ID (Unix timestamp / 86400)"),
    price_micro_usd: int = Query(..., description="Price in micro USD (1e6)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate ROI for entire team (all downlines) for a specific day.

    Parameters:
    - day_id: Day ID (Unix timestamp divided by 86400)
    - price_micro_usd: RAMA price in micro USD (e.g., 500000 = $0.50)

    Returns aggregated ROI for all team members' portfolios.

    Example: GET /api/team/0x123.../roi/team?day_id=19750&price_micro_usd=500000
    """
    try:
        roi_data = await calculate_team_roi_for_day(db, user_address, day_id, price_micro_usd)
        return roi_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/roi/legs")
async def calculate_legs_roi_route(
    user_address: str,
    day_id: int = Query(..., description="Day ID (Unix timestamp / 86400)"),
    price_micro_usd: int = Query(..., description="Price in micro USD (1e6)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate leg-wise ROI breakdown for a specific day.

    Parameters:
    - day_id: Day ID (Unix timestamp divided by 86400)
    - price_micro_usd: RAMA price in micro USD (e.g., 500000 = $0.50)

    Returns one row per leg (direct) with aggregated ROI for that leg's team.

    Example: GET /api/team/0x123.../roi/legs?day_id=19750&price_micro_usd=500000
    """
    try:
        roi_data = await calculate_legs_roi_for_day(db, user_address, day_id, price_micro_usd)
        return roi_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/team/{user_address}/roi/leg/{direct_address}")
async def get_leg_roi_details_route(
    user_address: str,
    direct_address: str,
    day_id: int = Query(..., description="Day ID (Unix timestamp / 86400)"),
    price_micro_usd: int = Query(..., description="Price in micro USD (1e6)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed ROI for each member in a specific leg for a specific day.

    Parameters:
    - direct_address: The direct's wallet address
    - day_id: Day ID (Unix timestamp divided by 86400)
    - price_micro_usd: RAMA price in micro USD (e.g., 500000 = $0.50)

    Returns ROI breakdown for each member in that leg.

    Example: GET /api/team/0x123.../roi/leg/0xabc...?day_id=19750&price_micro_usd=500000
    """
    try:
        roi_data = await get_leg_roi_details_for_day(db, user_address, direct_address, day_id, price_micro_usd)
        return roi_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
