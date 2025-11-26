"""
FastAPI routes for Slab Income calculation.
Provides REST API endpoints for calculating slab income and override income.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from decimal import Decimal
import logging

from app.core.db import get_db
from app.services.slab_income_service import (
    get_user_slab_for_day,
    calculate_considerable_roi_for_day,
    calculate_slab_income_for_day,
    calculate_slab_override_income_for_day,
    calculate_combined_slab_income_for_day,
    calculate_slab_income_for_period
)

logger = logging.getLogger(__name__)

router = APIRouter()


def validate_address(address: str) -> str:
    """Validate and normalize Ethereum address."""
    if not address or len(address) != 42 or not address.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    return address.lower()


@router.get("/slab/{user_address}/{day_id}")
async def get_slab(
    user_address: str,
    day_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get user's slab level and percentage for a specific day.

    **Parameters:**
    - `user_address`: Ethereum wallet address
    - `day_id`: Day ID (0-based from contract start)

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "slab_level": 3,
        "slab_percentage": 10.00
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")

        result = await get_user_slab_for_day(db, user_address, day_id)
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting slab: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/considerable-roi/{user_address}/{day_id}")
async def get_considerable_roi(
    user_address: str,
    day_id: int,
    price_micro_usd: int = Query(..., description="RAMA price in micro USD (e.g., 50000000 = $0.05)"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate considerable ROI (sum of all legs ROI × 36%) for a user for a specific day.

    **Parameters:**
    - `user_address`: Ethereum wallet address
    - `day_id`: Day ID
    - `price_micro_usd`: RAMA token price in micro USD (e.g., 50000000 = $0.05)

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "total_legs_roi_micro_usd": 10000000000,
        "considerable_roi_micro_usd": 3600000000,
        "considerable_roi_usd": 3600.00
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        result = await calculate_considerable_roi_for_day(
            db, user_address, day_id, price_micro_usd
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating considerable ROI: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/slab-income/{user_address}/{day_id}")
async def get_slab_income(
    user_address: str,
    day_id: int,
    price_micro_usd: int = Query(..., description="RAMA price in micro USD"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate slab differential income for a user for a specific day.

    Implements:
    - Slab differential calculation (your slab % - their slab %)
    - Applied to considerable ROI of each downline member
    - 60% cap per leg
    - Detailed leg-wise breakdown

    **Parameters:**
    - `user_address`: Ethereum wallet address
    - `day_id`: Day ID
    - `price_micro_usd`: RAMA token price in micro USD

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "user_slab_level": 3,
        "user_slab_percentage": 10.00,
        "total_slab_income_micro_usd": 5000000000,
        "total_slab_income_usd": 5000.00,
        "total_slab_income_rama_wei": "100000000000000000000",
        "legs_count": 5,
        "legs_detail": [...]
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        result = await calculate_slab_income_for_day(
            db, user_address, day_id, price_micro_usd
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating slab income: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/override-income/{user_address}/{day_id}")
async def get_override_income(
    user_address: str,
    day_id: int,
    price_micro_usd: int = Query(..., description="RAMA price in micro USD"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate slab override income for achievers who reached/exceeded user's slab.

    Implements:
    - 10% to direct upline when downline reaches their slab
    - 5% to second upline
    - 5% to third upline

    **Parameters:**
    - `user_address`: Ethereum wallet address
    - `day_id`: Day ID
    - `price_micro_usd`: RAMA token price in micro USD

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "user_slab_level": 3,
        "total_override_income_micro_usd": 1000000000,
        "total_override_income_usd": 1000.00,
        "total_override_income_rama_wei": "20000000000000000000",
        "achievers_count": 3,
        "achievers_detail": [...]
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        result = await calculate_slab_override_income_for_day(
            db, user_address, day_id, price_micro_usd
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating override income: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/combined/{user_address}/{day_id}")
async def get_combined_income(
    user_address: str,
    day_id: int,
    price_micro_usd: int = Query(..., description="RAMA price in micro USD"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate both slab income and override income in a single call.
    **Most efficient endpoint for getting complete slab income breakdown.**

    **Parameters:**
    - `user_address`: Ethereum wallet address
    - `day_id`: Day ID
    - `price_micro_usd`: RAMA token price in micro USD

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "user_slab_level": 3,
        "user_slab_percentage": 10.00,
        "slab_income_micro_usd": 5000000000,
        "slab_income_usd": 5000.00,
        "slab_income_rama_wei": "100000000000000000000",
        "legs_count": 5,
        "override_income_micro_usd": 1000000000,
        "override_income_usd": 1000.00,
        "override_income_rama_wei": "20000000000000000000",
        "achievers_count": 3,
        "total_income_micro_usd": 6000000000,
        "total_income_usd": 6000.00,
        "total_income_rama_wei": "120000000000000000000",
        "slab_details": [...],
        "override_details": [...]
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        result = await calculate_combined_slab_income_for_day(
            db, user_address, day_id, price_micro_usd
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating combined income: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/period/{user_address}")
async def get_period_income(
    user_address: str,
    from_day: int = Query(..., description="Start day ID (inclusive)"),
    to_day: int = Query(..., description="End day ID (inclusive)"),
    price_micro_usd: int = Query(..., description="RAMA price in micro USD"),
    db: AsyncSession = Depends(get_db)
):
    """
    Calculate slab income for a range of days.
    Aggregates daily calculations and provides both totals and daily breakdown.

    **Parameters:**
    - `user_address`: Ethereum wallet address
    - `from_day`: Start day ID (inclusive)
    - `to_day`: End day ID (inclusive)
    - `price_micro_usd`: RAMA token price in micro USD

    **Example:** `/api/slab-income/period/0x.../100/150?price_micro_usd=50000000`

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "from_day": 100,
        "to_day": 150,
        "days_count": 51,
        "total_slab_income_micro_usd": 250000000000,
        "total_slab_income_usd": 250000.00,
        "total_slab_income_rama_wei": "5000000000000000000000",
        "total_override_income_micro_usd": 50000000000,
        "total_override_income_usd": 50000.00,
        "total_override_income_rama_wei": "1000000000000000000000",
        "grand_total_income_micro_usd": 300000000000,
        "grand_total_income_usd": 300000.00,
        "grand_total_income_rama_wei": "6000000000000000000000",
        "daily_breakdown": [...]
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if from_day < 0:
            raise HTTPException(status_code=400, detail="from_day must be >= 0")
        if to_day < from_day:
            raise HTTPException(status_code=400, detail="to_day must be >= from_day")
        if to_day - from_day > 365:
            raise HTTPException(status_code=400, detail="Period cannot exceed 365 days")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        result = await calculate_slab_income_for_period(
            db, user_address, from_day, to_day, price_micro_usd
        )
        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error calculating period income: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claimable/{user_address}")
async def get_claimable(
    user_address: str,
    price_micro_usd: int = Query(..., description="RAMA price in micro USD"),
    current_day: int = Query(..., description="Current day ID"),
    db: AsyncSession = Depends(get_db)
):
    """
    Get claimable slab income for a user up to current day.
    Returns the most recent claimable period and total amounts.

    **Parameters:**
    - `user_address`: Ethereum wallet address
    - `price_micro_usd`: RAMA token price in micro USD
    - `current_day`: Current day ID

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "current_day": 150,
        "claimable_from_day": 100,
        "claimable_to_day": 150,
        "days_count": 51,
        "total_claimable_usd": 300000.00,
        "total_claimable_rama_wei": "6000000000000000000000",
        "breakdown": {
            "slab_income_usd": 250000.00,
            "override_income_usd": 50000.00
        }
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if current_day < 0:
            raise HTTPException(status_code=400, detail="current_day must be >= 0")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        # For now, assume claimable from day 0 to current_day
        # In production, you'd check what's already claimed from the smart contract
        from_day = 0
        to_day = current_day

        # Calculate period income
        period_result = await calculate_slab_income_for_period(
            db, user_address, from_day, to_day, price_micro_usd
        )

        return {
            "user_address": user_address,
            "current_day": current_day,
            "claimable_from_day": from_day,
            "claimable_to_day": to_day,
            "days_count": period_result["days_count"],
            "total_claimable_usd": float(period_result["grand_total_income_usd"]),
            "total_claimable_rama_wei": str(period_result["grand_total_income_rama_wei"]),
            "breakdown": {
                "slab_income_usd": float(period_result["total_slab_income_usd"]),
                "slab_income_rama_wei": str(period_result["total_slab_income_rama_wei"]),
                "override_income_usd": float(period_result["total_override_income_usd"]),
                "override_income_rama_wei": str(period_result["total_override_income_rama_wei"])
            },
            "price_used_micro_usd": price_micro_usd
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting claimable income: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==============================================================================
# HEALTH CHECK
# ==============================================================================

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "slab-income-calculator",
        "version": "1.0.0"
    }