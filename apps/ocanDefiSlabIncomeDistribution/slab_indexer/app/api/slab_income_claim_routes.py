"""
FastAPI routes for Slab Income Claiming with EIP-712 Signatures (Method 3)

These endpoints provide signed claims ready for on-chain submission.
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from decimal import Decimal
import logging

from app.core.db import get_db
from app.services.slab_income_service import (
    calculate_combined_slab_income_for_day,
    calculate_slab_income_for_period
)
from app.services.signature_service import (
    get_signature_service,
    nonce_manager,
    claim_tracker
)

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/slab-claim",
    tags=["slab-claim"]
)


def validate_address(address: str) -> str:
    """Validate and normalize Ethereum address."""
    if not address or len(address) != 42 or not address.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    return address.lower()


@router.get("/calculate/{user_address}/{from_day}/{to_day}")
async def calculate_and_sign(
    user_address: str,
    from_day: int,
    to_day: int,
    price_micro_usd: int = Query(..., description="RAMA price in micro USD (e.g., 50000000 = $0.05)"),
    db: AsyncSession = Depends(get_db)
):
    """
    **Method 3: Calculate slab income and return signed claim.**

    This is the main endpoint for off-chain calculation with signature verification.

    **Flow:**
    1. Calculate slab income for the period using PostgreSQL
    2. Get user's current nonce
    3. Create EIP-712 signature
    4. Return signed claim ready for on-chain submission

    **Parameters:**
    - `user_address`: User's wallet address
    - `from_day`: Start day (inclusive)
    - `to_day`: End day (inclusive)
    - `price_micro_usd`: RAMA token price in micro USD

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "from_day": 100,
        "to_day": 150,
        "usd_amount": "6000000000",
        "rama_amount": "120000000000000000000000",
        "nonce": 5,
        "signature": "0xabc123...",
        "breakdown": {
            "slab_income_usd": "5000.00",
            "override_income_usd": "1000.00",
            "total_income_usd": "6000.00"
        },
        "instructions": {
            "contract_method": "claimWithProof",
            "gas_estimate": "100000-120000"
        }
    }
    ```

    **Usage:**
    ```javascript
    // Frontend
    const response = await fetch('/api/slab-claim/calculate/0x.../100/150?price_micro_usd=50000000');
    const data = await response.json();

    // Submit to smart contract
    await contract.claimWithProof(
        data.from_day,
        data.to_day,
        data.usd_amount,
        data.rama_amount,
        data.signature
    );
    ```
    """
    try:
        user_address = validate_address(user_address)

        # Validation
        if from_day < 0:
            raise HTTPException(status_code=400, detail="from_day must be >= 0")
        if to_day < from_day:
            raise HTTPException(status_code=400, detail="to_day must be >= from_day")
        if to_day - from_day > 365:
            raise HTTPException(status_code=400, detail="Period cannot exceed 365 days")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        # Check if already claimed
        is_claimed = await claim_tracker.is_claimed(db, user_address, from_day, to_day)
        if is_claimed:
            raise HTTPException(
                status_code=400,
                detail=f"Period {from_day}-{to_day} already claimed"
            )

        # Calculate slab income for the period
        logger.info(f"Calculating slab income for {user_address}, days {from_day}-{to_day}")
        period_result = await calculate_slab_income_for_period(
            db, user_address, from_day, to_day, price_micro_usd
        )

        # Extract amounts
        usd_amount = period_result["grand_total_income_micro_usd"]
        rama_amount = period_result["grand_total_income_rama_wei"]

        # Check if user has any income to claim
        if usd_amount == 0 and rama_amount == 0:
            return {
                "user_address": user_address,
                "from_day": from_day,
                "to_day": to_day,
                "usd_amount": "0",
                "rama_amount": "0",
                "message": "No slab income to claim for this period",
                "breakdown": {
                    "slab_income_usd": "0.00",
                    "override_income_usd": "0.00",
                    "total_income_usd": "0.00"
                }
            }

        # Get current nonce
        nonce = await nonce_manager.get_nonce(db, user_address)

        # Create signature
        signature_service = get_signature_service()
        signature = signature_service.create_claim_signature(
            user_address=user_address,
            from_day=from_day,
            to_day=to_day,
            usd_amount=usd_amount,
            rama_amount=rama_amount,
            nonce=nonce
        )

        logger.info(f"Created signed claim for {user_address}: ${period_result['grand_total_income_usd']}")

        # Return signed claim
        return {
            "user_address": user_address,
            "from_day": from_day,
            "to_day": to_day,
            "usd_amount": str(usd_amount),
            "rama_amount": str(rama_amount),
            "nonce": nonce,
            "signature": signature,
            "breakdown": {
                "slab_income_usd": str(period_result["total_slab_income_usd"]),
                "slab_income_rama_wei": str(period_result["total_slab_income_rama_wei"]),
                "override_income_usd": str(period_result["total_override_income_usd"]),
                "override_income_rama_wei": str(period_result["total_override_income_rama_wei"]),
                "total_income_usd": str(period_result["grand_total_income_usd"]),
                "days_count": period_result["days_count"]
            },
            "price_used_micro_usd": price_micro_usd,
            "instructions": {
                "contract_method": "claimWithProof(uint32 fromDay, uint32 toDay, uint256 usdAmount, uint256 ramaAmount, bytes signature)",
                "gas_estimate": "100000-120000",
                "next_steps": [
                    "1. Verify the amounts are correct",
                    "2. Call claimWithProof on the smart contract with these parameters",
                    "3. Wait for transaction confirmation",
                    "4. Nonce will be incremented automatically on-chain"
                ]
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating signed claim: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claimable/{user_address}")
async def get_claimable_signed(
    user_address: str,
    price_micro_usd: int = Query(..., description="RAMA price in micro USD"),
    current_day: int = Query(..., description="Current day ID"),
    last_claimed_day: int = Query(default=-1, description="Last day claimed (optional, -1 if never claimed)"),
    db: AsyncSession = Depends(get_db)
):
    """
    **Get claimable slab income with signature ready to claim.**

    Automatically determines the claimable period and returns a signed claim.

    **Parameters:**
    - `user_address`: User's wallet address
    - `price_micro_usd`: RAMA token price in micro USD
    - `current_day`: Current day ID
    - `last_claimed_day`: Last day claimed (optional, defaults to -1 for never claimed)

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "claimable": true,
        "from_day": 0,
        "to_day": 150,
        "usd_amount": "300000000000",
        "rama_amount": "6000000000000000000000",
        "nonce": 5,
        "signature": "0xabc...",
        "breakdown": {...}
    }
    ```

    **Example:**
    ```bash
    curl "http://api/slab-claim/claimable/0x...?price_micro_usd=50000000&current_day=150"
    ```
    """
    try:
        user_address = validate_address(user_address)

        if current_day < 0:
            raise HTTPException(status_code=400, detail="current_day must be >= 0")
        if price_micro_usd <= 0:
            raise HTTPException(status_code=400, detail="price_micro_usd must be > 0")

        # Determine claimable period
        from_day = max(0, last_claimed_day + 1)
        to_day = current_day

        if from_day > to_day:
            return {
                "user_address": user_address,
                "claimable": False,
                "message": "No days available to claim",
                "current_day": current_day,
                "last_claimed_day": last_claimed_day
            }

        # Check if already claimed
        is_claimed = await claim_tracker.is_claimed(db, user_address, from_day, to_day)
        if is_claimed:
            return {
                "user_address": user_address,
                "claimable": False,
                "message": f"Period {from_day}-{to_day} already claimed",
                "from_day": from_day,
                "to_day": to_day
            }

        # Calculate and sign
        logger.info(f"Calculating claimable for {user_address}, days {from_day}-{to_day}")
        period_result = await calculate_slab_income_for_period(
            db, user_address, from_day, to_day, price_micro_usd
        )

        usd_amount = period_result["grand_total_income_micro_usd"]
        rama_amount = period_result["grand_total_income_rama_wei"]

        if usd_amount == 0 and rama_amount == 0:
            return {
                "user_address": user_address,
                "claimable": False,
                "message": "No slab income earned for this period",
                "from_day": from_day,
                "to_day": to_day,
                "breakdown": {
                    "slab_income_usd": "0.00",
                    "override_income_usd": "0.00",
                    "total_income_usd": "0.00"
                }
            }

        # Get nonce and create signature
        nonce = await nonce_manager.get_nonce(db, user_address)
        signature_service = get_signature_service()
        signature = signature_service.create_claim_signature(
            user_address=user_address,
            from_day=from_day,
            to_day=to_day,
            usd_amount=usd_amount,
            rama_amount=rama_amount,
            nonce=nonce
        )

        return {
            "user_address": user_address,
            "claimable": True,
            "from_day": from_day,
            "to_day": to_day,
            "days_count": period_result["days_count"],
            "usd_amount": str(usd_amount),
            "rama_amount": str(rama_amount),
            "nonce": nonce,
            "signature": signature,
            "breakdown": {
                "slab_income_usd": str(period_result["total_slab_income_usd"]),
                "slab_income_rama_wei": str(period_result["total_slab_income_rama_wei"]),
                "override_income_usd": str(period_result["total_override_income_usd"]),
                "override_income_rama_wei": str(period_result["total_override_income_rama_wei"]),
                "total_income_usd": str(period_result["grand_total_income_usd"])
            },
            "price_used_micro_usd": price_micro_usd,
            "current_day": current_day,
            "last_claimed_day": last_claimed_day
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting claimable: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-signature")
async def verify_signature(
    user_address: str = Query(..., description="User address"),
    from_day: int = Query(..., description="From day"),
    to_day: int = Query(..., description="To day"),
    usd_amount: int = Query(..., description="USD amount in micro USD"),
    rama_amount: int = Query(..., description="RAMA amount in wei"),
    nonce: int = Query(..., description="Nonce"),
    signature: str = Query(..., description="Signature to verify")
):
    """
    **Verify an EIP-712 signature (for testing/debugging).**

    Checks if a signature is valid for the given claim parameters.

    **Parameters:**
    - All claim parameters
    - `signature`: Signature to verify

    **Returns:**
    ```json
    {
        "valid": true,
        "signer_address": "0x...",
        "message": "Signature is valid"
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        signature_service = get_signature_service()
        is_valid = signature_service.verify_signature(
            signature=signature,
            user_address=user_address,
            from_day=from_day,
            to_day=to_day,
            usd_amount=usd_amount,
            rama_amount=rama_amount,
            nonce=nonce
        )

        return {
            "valid": is_valid,
            "signer_address": signature_service.signer_address,
            "message": "Signature is valid" if is_valid else "Signature is invalid",
            "parameters": {
                "user_address": user_address,
                "from_day": from_day,
                "to_day": to_day,
                "usd_amount": str(usd_amount),
                "rama_amount": str(rama_amount),
                "nonce": nonce
            }
        }

    except Exception as e:
        logger.error(f"Error verifying signature: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/nonce/{user_address}")
async def get_nonce(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    **Get current nonce for a user.**

    The nonce is used for replay attack prevention.
    It increments with each successful claim.

    **Parameters:**
    - `user_address`: User's wallet address

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "nonce": 5
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        nonce = await nonce_manager.get_nonce(db, user_address)

        return {
            "user_address": user_address,
            "nonce": nonce
        }

    except Exception as e:
        logger.error(f"Error getting nonce: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claim-history/{user_address}")
async def get_claim_history(
    user_address: str,
    db: AsyncSession = Depends(get_db)
):
    """
    **Get claim history for a user.**

    Returns all past claims with amounts and dates.

    **Parameters:**
    - `user_address`: User's wallet address

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "total_claims": 3,
        "claims": [
            {
                "from_day": 100,
                "to_day": 150,
                "usd_amount": "5000000000",
                "rama_amount": "100000000000000000000",
                "claimed_at": "2024-01-15T10:30:00"
            }
        ]
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        claims = await claim_tracker.get_user_claims(db, user_address)

        return {
            "user_address": user_address,
            "total_claims": len(claims),
            "claims": claims
        }

    except Exception as e:
        logger.error(f"Error getting claim history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/signer-info")
async def get_signer_info():
    """
    **Get information about the trusted signer.**

    Returns the signer address, contract address, and chain ID.
    Useful for verifying configuration.

    **Returns:**
    ```json
    {
        "signer_address": "0x...",
        "contract_address": "0x...",
        "chain_id": 137,
        "network": "Polygon Mainnet"
    }
    ```
    """
    try:
        signature_service = get_signature_service()

        network_names = {
            1: "Ethereum Mainnet",
            137: "Polygon Mainnet",
            80001: "Mumbai Testnet",
            56: "BSC Mainnet",
            97: "BSC Testnet"
        }

        return {
            "signer_address": signature_service.signer_address,
            "contract_address": signature_service.contract_address,
            "chain_id": signature_service.chain_id,
            "network": network_names.get(signature_service.chain_id, "Unknown Network"),
            "status": "operational"
        }

    except Exception as e:
        logger.error(f"Error getting signer info: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    **Health check for slab claim service.**

    Verifies that the signature service is initialized and database is accessible.

    **Returns:**
    ```json
    {
        "status": "healthy",
        "signature_service": "operational",
        "database": "connected"
    }
    ```
    """
    try:
        # Check signature service
        signature_service = get_signature_service()

        # Test database
        await db.execute(text("SELECT 1"))

        return {
            "status": "healthy",
            "service": "slab-income-claim",
            "version": "1.0.0",
            "signature_service": "operational",
            "database": "connected",
            "signer_address": signature_service.signer_address
        }

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e)
        }


# ==============================================================================
# Import for health check query
# ==============================================================================
from sqlalchemy import text