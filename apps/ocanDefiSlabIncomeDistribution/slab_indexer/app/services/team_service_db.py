"""
Team service using PostgreSQL database procedures for optimal performance
"""
from typing import Dict, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


async def get_user_team(db: AsyncSession, user_address: str) -> Dict:
    """
    Get complete team structure using database procedures.
    Much faster than Python recursion for large trees.

    Returns:
        {
            "user_address": str,
            "user_id": int,
            "total_team_count": int,
            "max_depth": int,
            "directs_count": int,
            "legs": [...]
        }
    """
    user_address = user_address.lower()

    # Get summary data
    summary_query = text("SELECT * FROM get_team_summary(:addr)")
    result = await db.execute(summary_query, {"addr": user_address})
    summary = result.fetchone()

    if not summary:
        return {
            "error": "User not found",
            "user_address": user_address,
            "total_team_count": 0,
            "max_depth": 0,
            "directs_count": 0,
            "legs": []
        }

    # Get legs breakdown
    legs_query = text("SELECT * FROM get_legs_breakdown(:addr)")
    result = await db.execute(legs_query, {"addr": user_address})
    legs_data = result.fetchall()

    # Build legs array with full team data for each leg
    legs = []
    for leg in legs_data:
        # Get full team for this leg
        leg_team_query = text("SELECT * FROM get_leg_team(:user_addr, :direct_addr)")
        result = await db.execute(
            leg_team_query,
            {"user_addr": user_address, "direct_addr": leg.direct_address}
        )
        leg_team_members = result.fetchall()

        # Build hierarchical structure
        team_tree = _build_hierarchy(leg_team_members)

        legs.append({
            "direct_address": leg.direct_address,
            "direct_user_id": leg.direct_user_id,
            "direct_created_at": leg.direct_created_at.isoformat() if leg.direct_created_at else None,
            "leg_count": leg.leg_count,
            "leg_depth": leg.leg_depth,
            "team": team_tree
        })

    return {
        "user_address": summary.user_address,
        "user_id": summary.user_id,
        "total_team_count": summary.total_team_count,
        "max_depth": summary.max_depth,
        "directs_count": summary.directs_count,
        "legs": legs
    }


async def get_leg_summary(db: AsyncSession, user_address: str) -> Dict:
    """
    Get team summary with leg breakdown (counts only, no full tree).
    Very fast - uses single database query.
    """
    user_address = user_address.lower()

    # Get summary
    summary_query = text("SELECT * FROM get_team_summary(:addr)")
    result = await db.execute(summary_query, {"addr": user_address})
    summary = result.fetchone()

    if not summary:
        return {
            "error": "User not found",
            "user_address": user_address,
            "total_team_count": 0,
            "directs_count": 0,
            "legs": []
        }

    # Get legs breakdown
    legs_query = text("SELECT * FROM get_legs_breakdown(:addr)")
    result = await db.execute(legs_query, {"addr": user_address})
    legs_data = result.fetchall()

    legs_summary = [
        {
            "direct_address": leg.direct_address,
            "direct_user_id": leg.direct_user_id,
            "leg_total_count": leg.leg_count,
            "leg_max_depth": leg.leg_depth
        }
        for leg in legs_data
    ]

    return {
        "user_address": summary.user_address,
        "user_id": summary.user_id,
        "directs_count": summary.directs_count,
        "total_team_count": summary.total_team_count,
        "legs": legs_summary
    }


async def get_team_tree_flat(db: AsyncSession, user_address: str) -> List[Dict]:
    """
    Get complete team as a flat list (not hierarchical).
    Returns all team members with their depth level.
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM get_team_tree(:addr)")
    result = await db.execute(query, {"addr": user_address})
    rows = result.fetchall()

    return [
        {
            "address": row.address,
            "user_id": row.user_id,
            "referrer_address": row.referrer_address,
            "tier": row.tier,
            "total_directs": row.total_directs,
            "created_at": row.created_at.isoformat() if row.created_at else None,
            "depth": row.depth,
            "path": row.path
        }
        for row in rows
    ]


async def get_directs_only(db: AsyncSession, user_address: str) -> List[Dict]:
    """
    Get only direct referrals (no downlines).
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM get_directs(:addr)")
    result = await db.execute(query, {"addr": user_address})
    rows = result.fetchall()

    return [
        {
            "address": row.address,
            "user_id": row.user_id,
            "tier": row.tier,
            "total_directs": row.total_directs,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


async def get_team_stats(db: AsyncSession, user_address: str) -> Dict:
    """
    Get quick team statistics (single optimized query).
    """
    user_address = user_address.lower()

    summary_query = text("SELECT * FROM get_team_summary(:addr)")
    result = await db.execute(summary_query, {"addr": user_address})
    summary = result.fetchone()

    if not summary:
        return {
            "error": "User not found",
            "user_address": user_address,
            "total_team_count": 0,
            "max_depth": 0,
            "directs_count": 0
        }

    return {
        "user_address": summary.user_address,
        "user_id": summary.user_id,
        "total_team_count": summary.total_team_count,
        "max_depth": summary.max_depth,
        "directs_count": summary.directs_count
    }


async def get_legs_portfolio_volume(db: AsyncSession, user_address: str) -> Dict:
    """
    Get leg-wise portfolio volume breakdown.
    Returns total portfolio count and volume for each leg (direct + their downlines).
    """
    user_address = user_address.lower()

    # Get legs portfolio volume
    query = text("SELECT * FROM get_legs_portfolio_volume(:addr)")
    result = await db.execute(query, {"addr": user_address})
    legs_data = result.fetchall()

    legs = [
        {
            "direct_address": leg.direct_address,
            "direct_user_id": leg.direct_user_id,
            "direct_created_at": leg.direct_created_at.isoformat() if leg.direct_created_at else None,
            "leg_portfolio_count": int(leg.leg_portfolio_count),
            "leg_total_volume_micro_usd": int(leg.leg_total_volume_micro_usd),
            "leg_total_volume_usd": float(leg.leg_total_volume_usd)
        }
        for leg in legs_data
    ]

    # Calculate totals
    total_portfolios = sum(leg["leg_portfolio_count"] for leg in legs)
    total_volume_usd = sum(leg["leg_total_volume_usd"] for leg in legs)

    return {
        "user_address": user_address,
        "directs_count": len(legs),
        "total_portfolio_count": total_portfolios,
        "total_volume_usd": total_volume_usd,
        "legs": legs
    }


async def get_team_total_portfolio_volume(db: AsyncSession, user_address: str) -> Dict:
    """
    Get total portfolio volume across entire team.
    Ultra-fast query returning aggregated stats only.
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM get_team_total_portfolio_volume(:addr)")
    result = await db.execute(query, {"addr": user_address})
    row = result.fetchone()

    if not row:
        return {
            "error": "User not found",
            "user_address": user_address,
            "total_team_count": 0,
            "total_portfolio_count": 0,
            "total_volume_usd": 0.0,
            "directs_count": 0
        }

    return {
        "user_address": row.user_address,
        "total_team_count": row.total_team_count,
        "total_portfolio_count": int(row.total_portfolio_count),
        "total_volume_micro_usd": int(row.total_volume_micro_usd),
        "total_volume_usd": float(row.total_volume_usd),
        "directs_count": row.directs_count
    }


async def calculate_user_roi_for_day(db: AsyncSession, user_address: str, day_id: int, price_micro_usd: int) -> Dict:
    """
    Calculate ROI for a single user for a specific day.
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM calculate_user_roi_for_day(:addr, :day_id, :price)")
    result = await db.execute(query, {"addr": user_address, "day_id": day_id, "price": price_micro_usd})
    row = result.fetchone()

    if not row:
        return {
            "error": "No data found",
            "user_address": user_address,
            "day_id": day_id,
            "total_portfolios": 0,
            "total_roi_micro_usd": 0,
            "total_roi_usd": 0.0,
            "total_roi_rama_wei": "0",
            "price_used_micro_usd": price_micro_usd
        }

    return {
        "user_address": row.user_address,
        "day_id": row.day_id,
        "total_portfolios": row.total_portfolios,
        "total_roi_micro_usd": int(row.total_roi_micro_usd) if row.total_roi_micro_usd is not None else 0,
        "total_roi_usd": float(row.total_roi_usd) if row.total_roi_usd is not None else 0.0,
        "total_roi_rama_wei": str(int(row.total_roi_rama_wei)) if row.total_roi_rama_wei is not None else "0",
        "price_used_micro_usd": int(row.price_used_micro_usd) if row.price_used_micro_usd is not None else price_micro_usd
    }


async def calculate_team_roi_for_day(db: AsyncSession, user_address: str, day_id: int, price_micro_usd: int) -> Dict:
    """
    Calculate ROI for entire team for a specific day.
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM calculate_team_roi_for_day(:addr, :day_id, :price)")
    result = await db.execute(query, {"addr": user_address, "day_id": day_id, "price": price_micro_usd})
    row = result.fetchone()
    
    
    print("row is",row)

    if not row:
        return {
            "error": "No data found",
            "user_address": user_address,
            "day_id": day_id,
            "team_size": 0,
            "total_portfolios": 0,
            "total_roi_micro_usd": 0,
            "total_roi_usd": 0.0,
            "total_roi_rama_wei": "0",
            "price_used_micro_usd": price_micro_usd
        }

    return {
        "user_address": row.user_address,
        "day_id": row.day_id,
        "team_size": row.team_size,
        "total_portfolios": row.total_portfolios,
        "total_roi_micro_usd": int(row.total_roi_micro_usd) if row.total_roi_micro_usd is not None else 0,
        "total_roi_usd": float(row.total_roi_usd) if row.total_roi_usd is not None else 0.0,
        "total_roi_rama_wei": str(int(row.total_roi_rama_wei)) if row.total_roi_rama_wei is not None else "0",
        "price_used_micro_usd": int(row.price_used_micro_usd) if row.price_used_micro_usd is not None else price_micro_usd
    }


async def calculate_legs_roi_for_day(db: AsyncSession, user_address: str, day_id: int, price_micro_usd: int) -> Dict:
    """
    Calculate leg-wise ROI breakdown for a specific day.
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM calculate_legs_roi_for_day(:addr, :day_id, :price)")
    result = await db.execute(query, {"addr": user_address, "day_id": day_id, "price": price_micro_usd})
    legs_data = result.fetchall()

    legs = [
        {
            "direct_address": leg.direct_address,
            "direct_user_id": leg.direct_user_id,
            "day_id": leg.day_id,
            "leg_team_size": leg.leg_team_size,
            "leg_portfolios": leg.leg_portfolios,
            "leg_roi_micro_usd": int(leg.leg_roi_micro_usd) if leg.leg_roi_micro_usd is not None else 0,
            "leg_roi_usd": float(leg.leg_roi_usd) if leg.leg_roi_usd is not None else 0.0,
            "leg_roi_rama_wei": str(int(leg.leg_roi_rama_wei)) if leg.leg_roi_rama_wei is not None else "0",
            "price_used_micro_usd": int(leg.price_used_micro_usd) if leg.price_used_micro_usd is not None else price_micro_usd
        }
        for leg in legs_data
    ]

    # Calculate totals
    total_team_size = sum(leg["leg_team_size"] for leg in legs)
    total_portfolios = sum(leg["leg_portfolios"] for leg in legs)
    total_roi_usd = sum(leg["leg_roi_usd"] for leg in legs)
    total_roi_rama_wei = str(sum(int(leg["leg_roi_rama_wei"]) for leg in legs))

    return {
        "user_address": user_address,
        "day_id": day_id,
        "directs_count": len(legs),
        "total_team_size": total_team_size,
        "total_portfolios": total_portfolios,
        "total_roi_usd": total_roi_usd,
        "total_roi_rama_wei": total_roi_rama_wei,
        "price_used_micro_usd": price_micro_usd,
        "legs": legs
    }


async def get_leg_roi_details_for_day(db: AsyncSession, user_address: str, direct_address: str, day_id: int, price_micro_usd: int) -> Dict:
    """
    Get detailed ROI for each member in a specific leg for a specific day.
    """
    user_address = user_address.lower()
    direct_address = direct_address.lower()

    query = text("SELECT * FROM get_leg_roi_details_for_day(:user_addr, :direct_addr, :day_id, :price)")
    result = await db.execute(query, {
        "user_addr": user_address,
        "direct_addr": direct_address,
        "day_id": day_id,
        "price": price_micro_usd
    })
    members_data = result.fetchall()

    members = [
        {
            "member_address": member.member_address,
            "member_user_id": member.member_user_id,
            "depth": member.depth,
            "portfolio_count": member.portfolio_count,
            "total_roi_micro_usd": int(member.total_roi_micro_usd) if member.total_roi_micro_usd is not None else 0,
            "total_roi_usd": float(member.total_roi_usd) if member.total_roi_usd is not None else 0.0,
            "total_roi_rama_wei": str(int(member.total_roi_rama_wei)) if member.total_roi_rama_wei is not None else "0"
        }
        for member in members_data
    ]

    # Calculate totals
    total_portfolios = sum(m["portfolio_count"] for m in members)
    total_roi_usd = sum(m["total_roi_usd"] for m in members)

    return {
        "user_address": user_address,
        "direct_address": direct_address,
        "day_id": day_id,
        "leg_size": len(members),
        "total_portfolios": total_portfolios,
        "total_roi_usd": total_roi_usd,
        "price_used_micro_usd": price_micro_usd,
        "members": members
    }


def _build_hierarchy(team_members: List) -> List[Dict]:
    """
    Build hierarchical tree structure from flat list of team members.
    Organizes by depth and parent-child relationships.
    """
    if not team_members:
        return []

    # Group by depth
    by_depth = {}
    for member in team_members:
        depth = member.depth
        if depth not in by_depth:
            by_depth[depth] = []
        by_depth[depth].append({
            "address": member.address,
            "user_id": member.user_id,
            "referrer_address": member.referrer_address,
            "tier": member.tier,
            "total_directs": member.total_directs,
            "created_at": member.created_at.isoformat() if member.created_at else None,
            "depth": member.depth,
            "downlines": []
        })

    # Build parent-child relationships
    depths = sorted(by_depth.keys(), reverse=True)
    address_map = {}

    # Create address lookup
    for depth in depths:
        for member in by_depth[depth]:
            address_map[member["address"]] = member

    # Link children to parents
    for depth in depths[:-1]:  # Skip the first depth (no parents in result)
        for member in by_depth[depth]:
            parent_addr = member["referrer_address"]
            if parent_addr in address_map:
                address_map[parent_addr]["downlines"].append(member)

    # Return top level (depth 1 if direct is included)
    min_depth = min(depths)
    return by_depth[min_depth]
