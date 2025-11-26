"""
FastAPI routes for Merkle-based slab income claims
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
import logging

from app.core.db import get_db
from app.services.slab_income_service import calculate_combined_slab_income_for_day
from app.services.merkle_tree_service import (
    get_proof_for_user,
    get_simple_proof_for_user,
    create_slab_income_tree,
    create_simple_income_tree,
    save_tree_data,
    save_simple_tree_data,
    load_simple_tree_data,
    generate_leaf_hash,
    generate_simple_leaf_hash
)
from web3 import Web3

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/slab-merkle",
    tags=["slab-merkle"]
)


def validate_address(address: str) -> str:
    """Validate and normalize Ethereum address."""
    if not address or len(address) != 42 or not address.startswith("0x"):
        raise HTTPException(status_code=400, detail="Invalid Ethereum address")
    return Web3.to_checksum_address(address)


@router.get("/proof/{user_address}/{day_id}")
async def get_proof(
    user_address: str,
    day_id: int,
    tree_dir: str = Query(default="./merkle_trees", description="Directory containing tree data")
):
    """
    **Get Merkle proof for a user for a specific day.**

    Returns proof that can be submitted to smart contract.

    **Parameters:**
    - `user_address`: User's wallet address
    - `day_id`: Day ID to claim
    - `tree_dir`: Directory containing Merkle tree data (optional)

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "usd_amount": "5000000000",
        "rama_amount": "100000000000000000000000",
        "merkle_proof": ["0xabc...", "0xdef..."],
        "merkle_root": "0x123...",
        "leaf_hash": "0x456...",
        "instructions": {
            "contract_method": "claimWithProof(...)",
            "gas_estimate": "60000-80000"
        }
    }
    ```

    **Frontend Usage:**
    ```javascript
    const response = await fetch('/api/slab-merkle/proof/0x.../150');
    const proof = await response.json();

    await contract.claimWithProof(
        proof.day_id,
        proof.usd_amount,
        proof.rama_amount,
        proof.merkle_proof
    );
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")

        # Get proof
        proof_data = get_proof_for_user(day_id, user_address, tree_dir)

        if proof_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"User {user_address} not found in Merkle tree for day {day_id}. "
                       f"Either not an achiever or tree not yet generated."
            )

        # Add instructions
        proof_data['instructions'] = {
            "contract_method": "claimWithProof(uint32 dayId, uint256 usdAmount, uint256 ramaAmount, bytes32[] merkleProof)",
            "gas_estimate": "60000-80000",
            "next_steps": [
                "1. Verify the amounts are correct",
                "2. Call claimWithProof on the smart contract",
                "3. Pass the merkle_proof array as the last parameter",
                "4. Wait for transaction confirmation"
            ]
        }

        return proof_data

    except FileNotFoundError as e:
        raise HTTPException(
            status_code=404,
            detail=f"Merkle tree not found for day {day_id}. Admin may not have generated it yet."
        )
    except Exception as e:
        logger.error(f"Error getting proof: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proof-slab/{user_address}/{day_id}")
async def get_slab_proof(
    user_address: str,
    day_id: int,
    tree_dir: str = Query(default="./merkle_trees", description="Directory containing tree data")
):
    """
    **Get SLAB Merkle proof for a user (slab differential income only).**

    Returns proof that can be submitted to smart contract's `claimSlabWithProof()`.

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "amount": "5000000000",
        "income_type": "slab",
        "merkle_proof": ["0xabc...", "0xdef..."],
        "merkle_root": "0x123...",
        "leaf_hash": "0x456..."
    }
    ```

    **Frontend Usage:**
    ```javascript
    const response = await fetch('/api/slab-merkle/proof-slab/0x.../150');
    const proof = await response.json();

    await contract.claimSlabWithProof(
        proof.day_id,
        proof.amount,
        proof.merkle_proof
    );
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")

        # Get slab proof
        proof_data = get_simple_proof_for_user(day_id, user_address, "slab", tree_dir)

        if proof_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"User {user_address} not found in SLAB tree for day {day_id}. "
                       f"Either not a slab achiever or tree not yet generated."
            )

        # Add instructions
        proof_data['instructions'] = {
            "contract_method": "claimSlabWithProof(uint32 dayId, uint256 slabAmount, bytes32[] merkleProof)",
            "gas_estimate": "60000-80000",
            "next_steps": [
                "1. Verify the slab amount is correct",
                "2. Call claimSlabWithProof on the smart contract",
                "3. Pass the merkle_proof array as the last parameter",
                "4. Wait for transaction confirmation"
            ]
        }

        return proof_data

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"SLAB Merkle tree not found for day {day_id}. Admin may not have generated it yet."
        )
    except Exception as e:
        logger.error(f"Error getting slab proof: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proof-override/{user_address}/{day_id}")
async def get_override_proof(
    user_address: str,
    day_id: int,
    tree_dir: str = Query(default="./merkle_trees", description="Directory containing tree data")
):
    """
    **Get OVERRIDE Merkle proof for a user (override income only).**

    Returns proof that can be submitted to smart contract's `claimOverrideWithProof()`.

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "amount": "1000000000",
        "income_type": "override",
        "merkle_proof": ["0xabc...", "0xdef..."],
        "merkle_root": "0x789...",
        "leaf_hash": "0x012..."
    }
    ```

    **Frontend Usage:**
    ```javascript
    const response = await fetch('/api/slab-merkle/proof-override/0x.../150');
    const proof = await response.json();

    await contract.claimOverrideWithProof(
        proof.day_id,
        proof.amount,
        proof.merkle_proof
    );
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")

        # Get override proof
        proof_data = get_simple_proof_for_user(day_id, user_address, "override", tree_dir)

        if proof_data is None:
            raise HTTPException(
                status_code=404,
                detail=f"User {user_address} not found in OVERRIDE tree for day {day_id}. "
                       f"Either not an override achiever or tree not yet generated."
            )

        # Add instructions
        proof_data['instructions'] = {
            "contract_method": "claimOverrideWithProof(uint32 dayId, uint256 overrideAmount, bytes32[] merkleProof)",
            "gas_estimate": "60000-80000",
            "next_steps": [
                "1. Verify the override amount is correct",
                "2. Call claimOverrideWithProof on the smart contract",
                "3. Pass the merkle_proof array as the last parameter",
                "4. Wait for transaction confirmation"
            ]
        }

        return proof_data

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"OVERRIDE Merkle tree not found for day {day_id}. Admin may not have generated it yet."
        )
    except Exception as e:
        logger.error(f"Error getting override proof: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proof-both/{user_address}/{day_id}")
async def get_both_proofs(
    user_address: str,
    day_id: int,
    tree_dir: str = Query(default="./merkle_trees", description="Directory containing tree data")
):
    """
    **Get BOTH slab and override Merkle proofs for a user.**

    Returns both proofs that can be submitted to smart contract's `claimBothWithProof()`.
    This is the most gas-efficient way to claim when user has both types of income.

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "day_id": 150,
        "slab": {
            "amount": "5000000000",
            "merkle_proof": ["0xabc...", "0xdef..."],
            "merkle_root": "0x123..."
        },
        "override": {
            "amount": "1000000000",
            "merkle_proof": ["0x789...", "0x012..."],
            "merkle_root": "0x345..."
        },
        "total_amount": "6000000000"
    }
    ```

    **Frontend Usage:**
    ```javascript
    const response = await fetch('/api/slab-merkle/proof-both/0x.../150');
    const data = await response.json();

    await contract.claimBothWithProof(
        data.day_id,
        data.slab.amount,
        data.override.amount,
        data.slab.merkle_proof,
        data.override.merkle_proof
    );
    ```
    """
    try:
        user_address = validate_address(user_address)

        if day_id < 0:
            raise HTTPException(status_code=400, detail="day_id must be >= 0")

        # Get both proofs
        slab_proof = get_simple_proof_for_user(day_id, user_address, "slab", tree_dir)
        override_proof = get_simple_proof_for_user(day_id, user_address, "override", tree_dir)

        if slab_proof is None and override_proof is None:
            raise HTTPException(
                status_code=404,
                detail=f"User {user_address} not found in either tree for day {day_id}. "
                       f"Either not an achiever or trees not yet generated."
            )

        # Calculate total
        slab_amount = int(slab_proof["amount"]) if slab_proof else 0
        override_amount = int(override_proof["amount"]) if override_proof else 0
        total_amount = slab_amount + override_amount

        result = {
            "user_address": user_address,
            "day_id": day_id,
            "slab": {
                "amount": str(slab_amount),
                "merkle_proof": slab_proof["merkle_proof"] if slab_proof else [],
                "merkle_root": slab_proof["merkle_root"] if slab_proof else None
            } if slab_proof else None,
            "override": {
                "amount": str(override_amount),
                "merkle_proof": override_proof["merkle_proof"] if override_proof else [],
                "merkle_root": override_proof["merkle_root"] if override_proof else None
            } if override_proof else None,
            "total_amount": str(total_amount),
            "instructions": {
                "contract_method": "claimBothWithProof(uint32 dayId, uint256 slabAmount, uint256 overrideAmount, bytes32[] slabMerkleProof, bytes32[] overrideMerkleProof)",
                "gas_estimate": "80000-120000",
                "recommended": "Use claimBothWithProof for maximum gas efficiency when claiming both types",
                "next_steps": [
                    "1. Verify both amounts are correct",
                    "2. Call claimBothWithProof on the smart contract",
                    "3. Pass both amounts and both proof arrays",
                    "4. Wait for transaction confirmation"
                ]
            }
        }

        return result

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting both proofs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/proof-batch/{user_address}")
async def get_proof_batch(
    user_address: str,
    from_day: int = Query(..., description="Start day (inclusive)"),
    to_day: int = Query(..., description="End day (inclusive)"),
    tree_dir: str = Query(default="./merkle_trees", description="Tree data directory")
):
    """
    **Get Merkle proofs for multiple days (batch).**

    Returns proofs for all days in range where user is an achiever.

    **Parameters:**
    - `user_address`: User's wallet address
    - `from_day`: Start day (inclusive)
    - `to_day`: End day (inclusive)
    - `tree_dir`: Directory containing Merkle tree data

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "from_day": 100,
        "to_day": 150,
        "proofs": [
            {
                "day_id": 100,
                "usd_amount": "1000000000",
                "rama_amount": "20000000000000000000000",
                "merkle_proof": [...]
            },
            ...
        ],
        "total_days": 51,
        "achiever_days": 45,
        "total_usd": "225000000000",
        "total_rama": "4500000000000000000000000"
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
            raise HTTPException(status_code=400, detail="Range cannot exceed 365 days")

        proofs = []
        total_usd = 0
        total_rama = 0

        for day_id in range(from_day, to_day + 1):
            try:
                proof_data = get_proof_for_user(day_id, user_address, tree_dir)

                if proof_data:
                    proofs.append({
                        "day_id": proof_data["day_id"],
                        "usd_amount": proof_data["usd_amount"],
                        "rama_amount": proof_data["rama_amount"],
                        "merkle_proof": proof_data["merkle_proof"]
                    })

                    total_usd += int(proof_data["usd_amount"])
                    total_rama += int(proof_data["rama_amount"])

            except FileNotFoundError:
                # Tree not generated for this day, skip
                continue

        if not proofs:
            raise HTTPException(
                status_code=404,
                detail=f"No proofs found for user {user_address} in range {from_day}-{to_day}"
            )

        return {
            "user_address": user_address,
            "from_day": from_day,
            "to_day": to_day,
            "proofs": proofs,
            "total_days": to_day - from_day + 1,
            "achiever_days": len(proofs),
            "total_usd": str(total_usd),
            "total_rama": str(total_rama),
            "instructions": {
                "contract_method": "claimBatchWithProof(uint32[] dayIds, uint256[] usdAmounts, uint256[] ramaAmounts, bytes32[][] merkleProofs)",
                "gas_estimate": f"{60000 + len(proofs) * 20000}-{80000 + len(proofs) * 30000}",
                "note": "Batch claiming is more gas efficient for multiple days"
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting batch proofs: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/verify-proof/{user_address}/{day_id}")
async def verify_proof(
    user_address: str,
    day_id: int,
    tree_dir: str = Query(default="./merkle_trees", description="Tree data directory")
):
    """
    **Verify a Merkle proof locally (before submitting on-chain).**

    Useful for testing and debugging.

    **Returns:**
    ```json
    {
        "valid": true,
        "user_address": "0x...",
        "day_id": 150,
        "merkle_root": "0x...",
        "message": "Proof is valid"
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        proof_data = get_proof_for_user(day_id, user_address, tree_dir)

        if proof_data is None:
            return {
                "valid": False,
                "user_address": user_address,
                "day_id": day_id,
                "message": "User not found in Merkle tree"
            }

        # Proof exists and was generated correctly by our service
        return {
            "valid": True,
            "user_address": user_address,
            "day_id": day_id,
            "merkle_root": proof_data["merkle_root"],
            "message": "Proof is valid",
            "usd_amount": proof_data["usd_amount"],
            "rama_amount": proof_data["rama_amount"]
        }

    except FileNotFoundError:
        return {
            "valid": False,
            "user_address": user_address,
            "day_id": day_id,
            "message": f"Merkle tree not generated for day {day_id}"
        }
    except Exception as e:
        logger.error(f"Error verifying proof: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/merkle-root/{day_id}")
async def get_merkle_root(
    day_id: int,
    tree_dir: str = Query(default="./merkle_trees", description="Tree data directory")
):
    """
    **Get Merkle root for a specific day.**

    Used by admin to set root on-chain.

    **Returns:**
    ```json
    {
        "day_id": 150,
        "merkle_root": "0x123...",
        "total_achievers": 1000
    }
    ```
    """
    try:
        from ..merkle_tree_service import load_tree_data

        tree, leaves = load_tree_data(day_id, tree_dir)

        return {
            "day_id": day_id,
            "merkle_root": tree.get_root_hex(),
            "total_achievers": len(leaves),
            "tree_depth": len(tree.layers) - 1,
            "message": "Root ready to be set on-chain"
        }

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Merkle tree not found for day {day_id}"
        )
    except Exception as e:
        logger.error(f"Error getting merkle root: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/claimable/{user_address}")
async def get_claimable(
    user_address: str,
    current_day: int = Query(..., description="Current day ID"),
    last_claimed_day: int = Query(default=0, description="Last day claimed"),
    tree_dir: str = Query(default="./merkle_trees", description="Tree data directory")
):
    """
    **Get all claimable days with proofs for a user.**

    Returns all days from last_claimed_day to current_day where user is achiever.

    **Returns:**
    ```json
    {
        "user_address": "0x...",
        "claimable_days": [100, 101, 105, 110, ...],
        "total_claimable_usd": "50000000000",
        "total_claimable_rama": "1000000000000000000000000",
        "days_with_income": 45,
        "proofs_ready": true
    }
    ```
    """
    try:
        user_address = validate_address(user_address)

        if current_day < 0:
            raise HTTPException(status_code=400, detail="current_day must be >= 0")

        from_day = last_claimed_day
        to_day = current_day - 1

        if from_day > to_day:
            return {
                "user_address": user_address,
                "claimable_days": [],
                "total_claimable_usd": "0",
                "total_claimable_rama": "0",
                "days_with_income": 0,
                "message": "No days available to claim"
            }

        claimable_days = []
        total_usd = 0
        total_rama = 0

        for day_id in range(from_day, to_day + 1):
            try:
                proof_data = get_proof_for_user(day_id, user_address, tree_dir)

                if proof_data:
                    claimable_days.append(day_id)
                    total_usd += int(proof_data["usd_amount"])
                    total_rama += int(proof_data["rama_amount"])

            except FileNotFoundError:
                continue

        return {
            "user_address": user_address,
            "current_day": current_day,
            "last_claimed_day": last_claimed_day,
            "claimable_days": claimable_days,
            "total_claimable_usd": str(total_usd),
            "total_claimable_rama": str(total_rama),
            "days_with_income": len(claimable_days),
            "proofs_ready": len(claimable_days) > 0,
            "message": f"Found {len(claimable_days)} days with claimable income" if claimable_days else "No claimable income"
        }

    except Exception as e:
        logger.error(f"Error getting claimable: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
async def health_check():
    """Health check for Merkle proof service."""
    return {
        "status": "healthy",
        "service": "slab-merkle-proof",
        "version": "1.0.0"
    }