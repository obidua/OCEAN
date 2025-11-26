"""
Slab Income service using PostgreSQL database procedures for optimal performance.
Calculates slab differential income and slab override income.
"""
from typing import Dict, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from decimal import Decimal


async def get_user_slab_for_day(db: AsyncSession, user_address: str, day_id: int) -> Dict:
    """
    Get user's slab level and percentage for a specific day.

    Args:
        db: Database session
        user_address: User's wallet address
        day_id: Day ID (0-based from contract start)

    Returns:
        {
            "user_address": str,
            "day_id": int,
            "slab_level": int,
            "slab_percentage": Decimal
        }
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM get_user_slab_for_day(:addr, :day_id)")
    result = await db.execute(query, {"addr": user_address, "day_id": day_id})
    row = result.fetchone()

    if not row:
        return {
            "user_address": user_address,
            "day_id": day_id,
            "slab_level": 0,
            "slab_percentage": 0.0
        }

    return {
        "user_address": row.user_address,
        "day_id": row.day_id,
        "slab_level": row.slab_level,
        "slab_percentage": float(row.slab_percentage) if row.slab_percentage is not None else 0.0
    }


async def calculate_considerable_roi_for_day(
    db: AsyncSession,
    user_address: str,
    day_id: int,
    price_micro_usd: int
) -> Dict:
    """
    Calculate considerable ROI (sum of all legs ROI * 36%) for a user for a specific day.
    This is used in slab income calculation.

    Args:
        db: Database session
        user_address: User's wallet address
        day_id: Day ID
        price_micro_usd: RAMA token price in micro USD (e.g., 50000000 = $0.05)

    Returns:
        {
            "user_address": str,
            "day_id": int,
            "total_legs_roi_micro_usd": int,
            "considerable_roi_micro_usd": int,
            "considerable_roi_usd": Decimal
        }
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM calculate_considerable_roi_for_day(:addr, :day_id, :price)")
    result = await db.execute(query, {
        "addr": user_address,
        "day_id": day_id,
        "price": price_micro_usd
    })
    row = result.fetchone()

    if not row:
        return {
            "user_address": user_address,
            "day_id": day_id,
            "total_legs_roi_micro_usd": 0,
            "considerable_roi_micro_usd": 0,
            "considerable_roi_usd": Decimal("0.00")
        }

    return {
        "user_address": row.user_address,
        "day_id": row.day_id,
        "total_legs_roi_micro_usd": int(row.total_legs_roi_micro_usd) if row.total_legs_roi_micro_usd is not None else 0,
        "considerable_roi_micro_usd": int(row.considerable_roi_micro_usd) if row.considerable_roi_micro_usd is not None else 0,
        "considerable_roi_usd": float(row.considerable_roi_usd) if row.considerable_roi_usd is not None else 0.0
    }


async def calculate_slab_income_for_day(
    db: AsyncSession,
    user_address: str,
    day_id: int,
    price_micro_usd: int
) -> Dict:
    """
    Calculate slab differential income for a user for a specific day.

    Implements:
    - Slab differential calculation (your slab % - their slab %)
    - 60% cap per leg
    - Leg-wise breakdown

    Args:
        db: Database session
        user_address: User's wallet address
        day_id: Day ID
        price_micro_usd: RAMA token price in micro USD

    Returns:
        {
            "user_address": str,
            "day_id": int,
            "user_slab_level": int,
            "user_slab_percentage": Decimal,
            "total_slab_income_micro_usd": int,
            "total_slab_income_usd": Decimal,
            "total_slab_income_rama_wei": int,
            "legs_count": int,
            "legs_detail": [
                {
                    "direct_address": str,
                    "direct_user_id": int,
                    "leg_total_income_micro_usd": int,
                    "leg_capped_income_micro_usd": int,
                    "leg_capped_income_usd": Decimal,
                    "cap_applied": bool,
                    "members": [...]
                }
            ]
        }
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM calculate_slab_income_for_day(:addr, :day_id, :price)")
    result = await db.execute(query, {
        "addr": user_address,
        "day_id": day_id,
        "price": price_micro_usd
    })
    row = result.fetchone()

    if not row:
        return {
            "error": "User not found",
            "user_address": user_address,
            "day_id": day_id,
            "user_slab_level": 0,
            "user_slab_percentage": 0.0,
            "total_slab_income_micro_usd": 0,
            "total_slab_income_usd": 0.0,
            "total_slab_income_rama_wei": "0",
            "legs_count": 0,
            "legs_detail": []
        }

    return {
        "user_address": row.user_address,
        "day_id": row.day_id,
        "user_slab_level": row.user_slab_level,
        "user_slab_percentage": float(row.user_slab_percentage) if row.user_slab_percentage is not None else 0.0,
        "total_slab_income_micro_usd": int(row.total_slab_income_micro_usd) if row.total_slab_income_micro_usd is not None else 0,
        "total_slab_income_usd": float(row.total_slab_income_usd) if row.total_slab_income_usd is not None else 0.0,
        "total_slab_income_rama_wei": str(int(row.total_slab_income_rama_wei)) if row.total_slab_income_rama_wei is not None else "0",
        "legs_count": row.legs_count,
        "legs_detail": row.legs_detail if row.legs_detail else []
    }


async def calculate_slab_override_income_for_day(
    db: AsyncSession,
    user_address: str,
    day_id: int,
    price_micro_usd: int
) -> Dict:
    """
    Calculate slab override income for achievers who reached/exceeded user's slab.

    Implements:
    - 10% to direct upline when downline reaches their slab
    - 5% to second upline
    - 5% to third upline

    Args:
        db: Database session
        user_address: User's wallet address
        day_id: Day ID
        price_micro_usd: RAMA token price in micro USD

    Returns:
        {
            "user_address": str,
            "day_id": int,
            "user_slab_level": int,
            "total_override_income_micro_usd": int,
            "total_override_income_usd": Decimal,
            "total_override_income_rama_wei": int,
            "achievers_count": int,
            "achievers_detail": [
                {
                    "achiever_address": str,
                    "achiever_user_id": int,
                    "achiever_slab_level": int,
                    "achiever_slab_percentage": Decimal,
                    "achiever_slab_income_micro_usd": int,
                    "achiever_slab_income_usd": Decimal,
                    "override_percentage": Decimal,
                    "override_income_micro_usd": int,
                    "override_income_usd": Decimal
                }
            ]
        }
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM calculate_slab_override_income_for_day(:addr, :day_id, :price)")
    result = await db.execute(query, {
        "addr": user_address,
        "day_id": day_id,
        "price": price_micro_usd
    })
    row = result.fetchone()

    if not row:
        return {
            "error": "User not found",
            "user_address": user_address,
            "day_id": day_id,
            "user_slab_level": 0,
            "total_override_income_micro_usd": 0,
            "total_override_income_usd": 0.0,
            "total_override_income_rama_wei": "0",
            "achievers_count": 0,
            "achievers_detail": []
        }

    return {
        "user_address": row.user_address,
        "day_id": row.day_id,
        "user_slab_level": row.user_slab_level,
        "total_override_income_micro_usd": int(row.total_override_income_micro_usd) if row.total_override_income_micro_usd is not None else 0,
        "total_override_income_usd": float(row.total_override_income_usd) if row.total_override_income_usd is not None else 0.0,
        "total_override_income_rama_wei": str(int(row.total_override_income_rama_wei)) if row.total_override_income_rama_wei is not None else "0",
        "achievers_count": row.achievers_count,
        "achievers_detail": row.achievers_detail if row.achievers_detail else []
    }


async def calculate_combined_slab_income_for_day(
    db: AsyncSession,
    user_address: str,
    day_id: int,
    price_micro_usd: int
) -> Dict:
    """
    Calculate both slab income and override income in a single call.
    Most efficient for getting complete slab income breakdown.

    Args:
        db: Database session
        user_address: User's wallet address
        day_id: Day ID
        price_micro_usd: RAMA token price in micro USD

    Returns:
        {
            "user_address": str,
            "day_id": int,
            "user_slab_level": int,
            "user_slab_percentage": Decimal,

            # Slab differential income
            "slab_income_micro_usd": int,
            "slab_income_usd": Decimal,
            "slab_income_rama_wei": int,
            "legs_count": int,

            # Override income
            "override_income_micro_usd": int,
            "override_income_usd": Decimal,
            "override_income_rama_wei": int,
            "achievers_count": int,

            # Total
            "total_income_micro_usd": int,
            "total_income_usd": Decimal,
            "total_income_rama_wei": int,

            # Details
            "slab_details": [...],
            "override_details": [...]
        }
    """
    user_address = user_address.lower()

    query = text("SELECT * FROM calculate_combined_slab_income_for_day(:addr, :day_id, :price)")
    result = await db.execute(query, {
        "addr": user_address,
        "day_id": day_id,
        "price": price_micro_usd
    })
    row = result.fetchone()

    if not row:
        return {
            "error": "User not found",
            "user_address": user_address,
            "day_id": day_id,
            "user_slab_level": 0,
            "user_slab_percentage": 0.0,
            "slab_income_micro_usd": 0,
            "slab_income_usd": 0.0,
            "slab_income_rama_wei": "0",
            "legs_count": 0,
            "override_income_micro_usd": 0,
            "override_income_usd": 0.0,
            "override_income_rama_wei": "0",
            "achievers_count": 0,
            "total_income_micro_usd": 0,
            "total_income_usd": 0.0,
            "total_income_rama_wei": "0",
            "slab_details": [],
            "override_details": []
        }

    return {
        "user_address": row.user_address,
        "day_id": row.day_id,
        "user_slab_level": row.user_slab_level,
        "user_slab_percentage": float(row.user_slab_percentage) if row.user_slab_percentage is not None else 0.0,

        # Slab income
        "slab_income_micro_usd": int(row.slab_income_micro_usd) if row.slab_income_micro_usd is not None else 0,
        "slab_income_usd": float(row.slab_income_usd) if row.slab_income_usd is not None else 0.0,
        "slab_income_rama_wei": str(int(row.slab_income_rama_wei)) if row.slab_income_rama_wei is not None else "0",
        "legs_count": row.legs_count,

        # Override income
        "override_income_micro_usd": int(row.override_income_micro_usd) if row.override_income_micro_usd is not None else 0,
        "override_income_usd": float(row.override_income_usd) if row.override_income_usd is not None else 0.0,
        "override_income_rama_wei": str(int(row.override_income_rama_wei)) if row.override_income_rama_wei is not None else "0",
        "achievers_count": row.achievers_count,

        # Total
        "total_income_micro_usd": int(row.total_income_micro_usd) if row.total_income_micro_usd is not None else 0,
        "total_income_usd": float(row.total_income_usd) if row.total_income_usd is not None else 0.0,
        "total_income_rama_wei": str(int(row.total_income_rama_wei)) if row.total_income_rama_wei is not None else "0",

        # Details
        "slab_details": row.slab_details if row.slab_details else [],
        "override_details": row.override_details if row.override_details else []
    }


async def calculate_slab_income_for_period(
    db: AsyncSession,
    user_address: str,
    from_day: int,
    to_day: int,
    price_micro_usd: int
) -> Dict:
    """
    Calculate slab income for a range of days.
    Aggregates daily calculations.

    Args:
        db: Database session
        user_address: User's wallet address
        from_day: Start day ID (inclusive)
        to_day: End day ID (inclusive)
        price_micro_usd: RAMA token price in micro USD

    Returns:
        {
            "user_address": str,
            "from_day": int,
            "to_day": int,
            "days_count": int,
            "total_slab_income_micro_usd": int,
            "total_slab_income_usd": Decimal,
            "total_slab_income_rama_wei": int,
            "total_override_income_micro_usd": int,
            "total_override_income_usd": Decimal,
            "total_override_income_rama_wei": int,
            "grand_total_income_micro_usd": int,
            "grand_total_income_usd": Decimal,
            "grand_total_income_rama_wei": int,
            "daily_breakdown": [...]
        }
    """
    user_address = user_address.lower()

    daily_results = []
    total_slab_micro_usd = 0
    total_slab_rama_wei = 0
    total_override_micro_usd = 0
    total_override_rama_wei = 0

    # Calculate for each day
    for day_id in range(from_day, to_day + 1):
        day_result = await calculate_combined_slab_income_for_day(
            db, user_address, day_id, price_micro_usd
        )

        daily_results.append({
            "day_id": day_id,
            "slab_income_micro_usd": day_result["slab_income_micro_usd"],
            "slab_income_usd": day_result["slab_income_usd"],
            "slab_income_rama_wei": day_result["slab_income_rama_wei"],
            "override_income_micro_usd": day_result["override_income_micro_usd"],
            "override_income_usd": day_result["override_income_usd"],
            "override_income_rama_wei": day_result["override_income_rama_wei"],
            "total_income_micro_usd": day_result["total_income_micro_usd"],
            "total_income_usd": day_result["total_income_usd"],
            "total_income_rama_wei": day_result["total_income_rama_wei"]
        })

        total_slab_micro_usd += day_result["slab_income_micro_usd"]
        total_slab_rama_wei += int(day_result["slab_income_rama_wei"])
        total_override_micro_usd += day_result["override_income_micro_usd"]
        total_override_rama_wei += int(day_result["override_income_rama_wei"])

    grand_total_micro_usd = total_slab_micro_usd + total_override_micro_usd
    grand_total_rama_wei = total_slab_rama_wei + total_override_rama_wei

    return {
        "user_address": user_address,
        "from_day": from_day,
        "to_day": to_day,
        "days_count": to_day - from_day + 1,

        # Slab totals
        "total_slab_income_micro_usd": total_slab_micro_usd,
        "total_slab_income_usd": float(total_slab_micro_usd / 1_000_000),
        "total_slab_income_rama_wei": str(total_slab_rama_wei),

        # Override totals
        "total_override_income_micro_usd": total_override_micro_usd,
        "total_override_income_usd": float(total_override_micro_usd / 1_000_000),
        "total_override_income_rama_wei": str(total_override_rama_wei),

        # Grand total
        "grand_total_income_micro_usd": grand_total_micro_usd,
        "grand_total_income_usd": float(grand_total_micro_usd / 1_000_000),
        "grand_total_income_rama_wei": str(grand_total_rama_wei),

        # Daily breakdown
        "daily_breakdown": daily_results
    }


# ==============================================================================
# USAGE EXAMPLES
# ==============================================================================
#
# from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
# from sqlalchemy.orm import sessionmaker
#
# # Setup
# engine = create_async_engine("postgresql+asyncpg://user:pass@localhost/db")
# async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
#
# async with async_session() as session:
#     # Get user's slab for day 150
#     slab = await get_user_slab_for_day(
#         session,
#         "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
#         150
#     )
#     print(f"User slab: Level {slab['slab_level']} ({slab['slab_percentage']}%)")
#
#     # Calculate slab income for day 150
#     slab_income = await calculate_slab_income_for_day(
#         session,
#         "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
#         150,
#         50_000_000  # $0.05 RAMA price
#     )
#     print(f"Slab income: ${slab_income['total_slab_income_usd']}")
#     print(f"From {slab_income['legs_count']} legs")
#
#     # Calculate override income for day 150
#     override = await calculate_slab_override_income_for_day(
#         session,
#         "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
#         150,
#         50_000_000
#     )
#     print(f"Override income: ${override['total_override_income_usd']}")
#     print(f"From {override['achievers_count']} achievers")
#
#     # Get both combined (most efficient)
#     combined = await calculate_combined_slab_income_for_day(
#         session,
#         "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
#         150,
#         50_000_000
#     )
#     print(f"Total income: ${combined['total_income_usd']}")
#     print(f"  Slab: ${combined['slab_income_usd']}")
#     print(f"  Override: ${combined['override_income_usd']}")
#
#     # Calculate for a period (days 100-150)
#     period = await calculate_slab_income_for_period(
#         session,
#         "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
#         100,
#         150,
#         50_000_000
#     )
#     print(f"Total for {period['days_count']} days: ${period['grand_total_income_usd']}")
#