"""
Admin script to generate DUAL Merkle trees for slab income distribution.

This script generates TWO separate Merkle trees per day:
1. SLAB TREE: Contains slab differential income only
2. OVERRIDE TREE: Contains override income only

This allows users to:
- Claim slab income independently
- Claim override income independently
- Claim both in one transaction
- Provides transparent breakdown of income sources

Process:
1. Calculates slab and override income separately for all achievers
2. Creates two Merkle trees (slab + override)
3. Saves both tree data for proof generation
4. Optionally sets both Merkle roots on-chain

Usage:
    python admin_generate_merkle_tree.py --day 150
    python admin_generate_merkle_tree.py --day 150 --publish
    python admin_generate_merkle_tree.py --from-day 100 --to-day 150 --publish
"""
import asyncio
import argparse
import logging
from typing import List, Dict
from pathlib import Path
import sys
from decimal import Decimal

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from web3 import Web3
from eth_account import Account
import os
from dotenv import load_dotenv

from app.services.slab_income_service import calculate_combined_slab_income_for_day
from app.services.merkle_tree_service import (
    create_slab_income_tree,
    create_simple_income_tree,
    save_tree_data,
    save_simple_tree_data,
    generate_leaf_hash,
    generate_simple_leaf_hash
)

# Load environment
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class MerkleTreeGenerator:
    """
    Generates Merkle trees for slab income distribution.
    """

    # Offset between contract days and database Unix epoch days
    # Database day = Contract day + DAY_OFFSET
    # Example: Contract day 13 = Database day 20407 (20394 + 13)
    DAY_OFFSET = 20394

    def __init__(self, db_url: str, rpc_url: str, contract_address: str, admin_key: str):
        """
        Initialize generator.

        Args:
            db_url: PostgreSQL database URL
            rpc_url: Blockchain RPC URL
            contract_address: SlabIncomeDistributorWithProof contract address
            admin_key: Admin private key (for setting roots on-chain)
        """
        self.db_url = db_url
        self.rpc_url = rpc_url
        self.contract_address = Web3.to_checksum_address(contract_address)
        self.admin_key = admin_key

        # Setup database
        self.engine = create_async_engine(db_url, echo=False)
        self.async_session = sessionmaker(
            self.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )

        # Setup Web3
        self.w3 = Web3(Web3.HTTPProvider(rpc_url))
        if not self.w3.is_connected():
            raise ConnectionError(f"Failed to connect to RPC: {rpc_url}")

        self.admin_account = Account.from_key(admin_key)
        logger.info(f"Admin address: {self.admin_account.address}")
        logger.info(f"Contract: {self.contract_address}")

        # Load contract ABI (simplified - add full ABI in production)
        self.contract = self.w3.eth.contract(
            address=self.contract_address,
            abi=[
                {
                    "inputs": [{"name": "dayId", "type": "uint32"}, {"name": "slabMerkleRoot", "type": "bytes32"}, {"name": "overrideMerkleRoot", "type": "bytes32"}],
                    "name": "setBothMerkleRoots",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [{"name": "dayIds", "type": "uint32[]"}, {"name": "slabMerkleRoots", "type": "bytes32[]"}, {"name": "overrideMerkleRoots", "type": "bytes32[]"}],
                    "name": "setBatchBothMerkleRoots",
                    "outputs": [],
                    "stateMutability": "nonpayable",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "owner",
                    "outputs": [{"name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                },
                {
                    "inputs": [],
                    "name": "coreConfig",
                    "outputs": [{"name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                }
            ]
        )

        # Create CoreConfig contract to get contractStartTime
        self.core_config_abi = [
            {
                "inputs": [],
                "name": "contractStartTime",
                "outputs": [{"name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
            }
        ]

    async def get_all_achievers_for_day(self, contract_day: int, db_day: int, price_micro_usd: int) -> tuple[List[Dict], List[Dict]]:
        """
        Get all users with slab and override income for a specific day.

        Args:
            contract_day: Day ID for the contract (will be used in Merkle tree)
            db_day: Day ID for database query (Unix epoch day)
            price_micro_usd: RAMA price in micro USD

        Returns:
            Tuple of (slab_achievers, override_achievers)
            - slab_achievers: List with slab differential income only (using contract_day)
            - override_achievers: List with override income only (using contract_day)
        """

        logger.info(f"Querying database for Unix epoch day {db_day} (contract day {contract_day})...")

        async with self.async_session() as session:
            # Get all users who achieved a slab (from slab_achievements table)
            from sqlalchemy import text

            query = text("""
                SELECT DISTINCT user_address
                FROM slab_achievements
                WHERE day_id = :day_id
                  AND slab_level > 0
                ORDER BY user_address
            """)

            result = await session.execute(query, {"day_id": db_day})
            users = result.fetchall()

            logger.info(f"Found {len(users)} users with slab achievements on database day {db_day} (contract day {contract_day})")

            # Calculate income for each user
            slab_achievers = []
            override_achievers = []

            for row in users:
                user_address = row.user_address

                try:
                    # Calculate combined income to get breakdown (using database day)
                    income_data = await calculate_combined_slab_income_for_day(
                        session,
                        user_address,
                        db_day,
                        price_micro_usd
                    )

                    slab_income_micro_usd = income_data["slab_income_micro_usd"]
                    override_income_micro_usd = income_data["override_income_micro_usd"]

                    # For RAMA amounts, use same value (1:1 for now)
                    slab_income_rama_wei = slab_income_micro_usd
                    override_income_rama_wei = override_income_micro_usd

                    # Add to slab tree if has slab income (use contract_day for Merkle tree)
                    if slab_income_micro_usd > 0:
                        slab_achievers.append({
                            "user_address": user_address,
                            "day_id": contract_day,  # Use contract day for Merkle tree
                            "amount": slab_income_micro_usd  # Single amount for slab tree
                        })

                    # Add to override tree if has override income (use contract_day for Merkle tree)
                    if override_income_micro_usd > 0:
                        override_achievers.append({
                            "user_address": user_address,
                            "day_id": contract_day,  # Use contract day for Merkle tree
                            "amount": override_income_micro_usd  # Single amount for override tree
                        })

                    logger.debug(f"  {user_address}: Slab=${slab_income_micro_usd / 1e6:.2f}, Override=${override_income_micro_usd / 1e6:.2f}")

                except Exception as e:
                    logger.error(f"Error calculating income for {user_address}: {e}")
                    continue

        logger.info(f"Slab achievers: {len(slab_achievers)}, Override achievers: {len(override_achievers)}")
        return slab_achievers, override_achievers

    async def generate_tree_for_day(self, contract_day: int, price_micro_usd: int, output_dir: str = "./merkle_trees"):
        """
        Generate DUAL Merkle trees (slab + override) for a specific day.

        Args:
            contract_day: Day ID for the contract (0, 1, 2, ... 13, etc.)
            price_micro_usd: RAMA price in micro USD
            output_dir: Directory to save tree data

        Returns:
            Tuple of (slab_merkle_root, override_merkle_root) or None if no achievers
        """

        # Convert contract day to database Unix epoch day
        db_day = int(contract_day) + self.DAY_OFFSET

        logger.info(f"\n{'='*80}")
        logger.info(f"Generating DUAL Merkle Trees for contract day {contract_day}")
        logger.info(f"Database day: {db_day} (Unix epoch)")
        logger.info(f"{'='*80}\n")

        # Get achievers (separated by income type)
        slab_achievers, override_achievers = await self.get_all_achievers_for_day(contract_day, db_day, price_micro_usd)

        if not slab_achievers and not override_achievers:
            logger.warning(f"No achievers found for contract day {contract_day} (database day {db_day})")
            return None, None

        # Calculate totals
        total_slab = sum(a["amount"] for a in slab_achievers) if slab_achievers else 0
        total_override = sum(a["amount"] for a in override_achievers) if override_achievers else 0

        logger.info(f"\nSummary:")
        logger.info(f"  Slab Achievers: {len(slab_achievers)}")
        logger.info(f"  Override Achievers: {len(override_achievers)}")
        logger.info(f"  Total Slab USD: ${total_slab / 1e6:,.2f}")
        logger.info(f"  Total Override USD: ${total_override / 1e6:,.2f}")
        logger.info(f"  Total Combined USD: ${(total_slab + total_override) / 1e6:,.2f}")

        slab_merkle_root = None
        override_merkle_root = None

        # Create SLAB Merkle tree (using contract_day for file naming)
        if slab_achievers:
            logger.info(f"\n📊 Creating SLAB Merkle tree...")
            slab_tree, slab_leaves = create_simple_income_tree(slab_achievers, "slab")
            save_simple_tree_data(contract_day, slab_tree, slab_leaves, "slab", output_dir)
            slab_merkle_root = slab_tree.get_root_hex()
            logger.info(f"   Slab Root: {slab_merkle_root}")
            logger.info(f"   Saved to: {output_dir}/day_{contract_day}_slab.json")
        else:
            logger.warning("   No slab achievers - skipping slab tree")

        # Create OVERRIDE Merkle tree (using contract_day for file naming)
        if override_achievers:
            logger.info(f"\n📊 Creating OVERRIDE Merkle tree...")
            override_tree, override_leaves = create_simple_income_tree(override_achievers, "override")
            save_simple_tree_data(contract_day, override_tree, override_leaves, "override", output_dir)
            override_merkle_root = override_tree.get_root_hex()
            logger.info(f"   Override Root: {override_merkle_root}")
            logger.info(f"   Saved to: {output_dir}/day_{contract_day}_override.json")
        else:
            logger.warning("   No override achievers - skipping override tree")

        logger.info(f"\n✅ Dual Merkle Trees Generated Successfully!")

        return slab_merkle_root, override_merkle_root

    def publish_both_merkle_roots(self, day_id: int, slab_root: str, override_root: str):
        """
        Publish BOTH slab and override Merkle roots to smart contract.

        Args:
            day_id: Day ID
            slab_root: Slab Merkle root (hex string)
            override_root: Override Merkle root (hex string)
        """
        logger.info(f"\n📤 Publishing DUAL Merkle roots to blockchain...")
        logger.info(f"   Day: {day_id}")
        logger.info(f"   Slab Root: {slab_root}")
        logger.info(f"   Override Root: {override_root}")

        # Calculate contract current day
        try:
            # Get CoreConfig address
            core_config_address = self.contract.functions.coreConfig().call()
            core_config = self.w3.eth.contract(address=core_config_address, abi=self.core_config_abi)

            # Get contract start time
            start_time = core_config.functions.contractStartTime().call()
            current_timestamp = self.w3.eth.get_block('latest')['timestamp']

            # Calculate current day: (current_timestamp - start_time) / 86400
            if current_timestamp >= start_time:
                current_day = (current_timestamp - start_time) // 86400
            else:
                current_day = 0

            logger.info(f"   Contract Start Time: {start_time}")
            logger.info(f"   Current Timestamp: {current_timestamp}")
            logger.info(f"   Contract Current Day: {current_day}")

            if day_id >= current_day:
                logger.error(f"❌ Day {day_id} is >= current day {current_day} (CannotClaimFuture)")
                logger.error(f"   Contract will reject this transaction!")
                return None
        except Exception as e:
            logger.warning(f"   Could not get current day: {e}")
            logger.warning(f"   Proceeding without day validation...")

        # Check if admin is owner
        try:
            owner = self.contract.functions.owner().call()
            logger.info(f"   Contract Owner: {owner}")
            logger.info(f"   Admin Address: {self.admin_account.address}")

            if owner.lower() != self.admin_account.address.lower():
                logger.error(f"❌ Admin is not the owner! Transaction will fail.")
                return None
        except Exception as e:
            logger.warning(f"   Could not get owner: {e}")

        # Check balance
        balance = self.w3.eth.get_balance(self.admin_account.address)
        logger.info(f"   Admin Balance: {self.w3.from_wei(balance, 'ether')} ETH")

        # Build transaction
        try:
            tx = self.contract.functions.setBothMerkleRoots(
                day_id,
                bytes.fromhex(slab_root[2:]) if slab_root else bytes(32),
                bytes.fromhex(override_root[2:]) if override_root else bytes(32)
            ).build_transaction({
                'from': self.admin_account.address,
                'nonce': self.w3.eth.get_transaction_count(self.admin_account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })

            # Sign and send
            signed_tx = self.admin_account.sign_transaction(tx)
            tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)

            logger.info(f"   Transaction: {tx_hash.hex()}")
            logger.info(f"   Waiting for confirmation...")

            # Wait for confirmation
            receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

            if receipt['status'] == 1:
                logger.info(f"✅ Both Merkle roots published successfully!")
                logger.info(f"   Block: {receipt['blockNumber']}")
                logger.info(f"   Gas used: {receipt['gasUsed']:,}")
            else:
                logger.error(f"❌ Transaction failed!")
                logger.error(f"   Block: {receipt['blockNumber']}")
                logger.error(f"   Gas used: {receipt['gasUsed']:,}")

                # Try to get revert reason
                try:
                    self.w3.eth.call(tx, receipt['blockNumber'])
                except Exception as e:
                    logger.error(f"   Revert reason: {e}")

            return receipt

        except Exception as e:
            logger.error(f"❌ Error publishing roots: {e}")
            return None

    def publish_batch_both_merkle_roots(self, roots: List[tuple]):
        """
        Publish multiple DUAL Merkle roots in one transaction.

        Args:
            roots: List of (day_id, slab_root, override_root) tuples
        """
        logger.info(f"\n📤 Publishing {len(roots)} DUAL Merkle root pairs in batch...")

        day_ids = [r[0] for r in roots]
        slab_roots = [bytes.fromhex(r[1][2:]) if r[1] else bytes(32) for r in roots]
        override_roots = [bytes.fromhex(r[2][2:]) if r[2] else bytes(32) for r in roots]

        # Build transaction
        tx = self.contract.functions.setBatchBothMerkleRoots(
            day_ids,
            slab_roots,
            override_roots
        ).build_transaction({
            'from': self.admin_account.address,
            'nonce': self.w3.eth.get_transaction_count(self.admin_account.address),
            'gas': 150000 + len(roots) * 50000,
            'gasPrice': self.w3.eth.gas_price
        })

        # Sign and send
        signed_tx = self.admin_account.sign_transaction(tx)
        tx_hash = self.w3.eth.send_raw_transaction(signed_tx.raw_transaction)

        logger.info(f"   Transaction: {tx_hash.hex()}")
        logger.info(f"   Waiting for confirmation...")

        # Wait for confirmation
        receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)

        if receipt['status'] == 1:
            logger.info(f"✅ Batch DUAL Merkle roots published successfully!")
            logger.info(f"   Days: {min(day_ids)} to {max(day_ids)}")
            logger.info(f"   Block: {receipt['blockNumber']}")
            logger.info(f"   Gas used: {receipt['gasUsed']:,}")
        else:
            logger.error(f"❌ Transaction failed!")

        return receipt


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Generate Merkle trees for slab income distribution")
    parser.add_argument("--day", type=int, help="Single day to generate")
    parser.add_argument("--from-day", type=int, help="Start day for batch generation")
    parser.add_argument("--to-day", type=int, help="End day for batch generation")
    parser.add_argument("--price", type=int, default=50000000, help="RAMA price in micro USD (default: 50000000 = $0.05)")
    parser.add_argument("--publish", action="store_true", help="Publish Merkle roots to blockchain")
    parser.add_argument("--output-dir", default="./merkle_trees", help="Output directory for tree data")

    args = parser.parse_args()

    # Validate arguments
    if args.day is None and (args.from_day is None or args.to_day is None):
        parser.error("Must specify either --day or both --from-day and --to-day")

    # Load configuration
    db_url = os.getenv("DATABASE_URL")
    rpc_url = os.getenv("RPC_URL")
    contract_address = os.getenv("SlabIncomeDistributorWithProof_CONTRACT_ADDRESS")
    admin_key = os.getenv("ADMIN_PRIVATE_KEY")

    if not all([db_url, rpc_url, contract_address, admin_key]):
        logger.error("Missing required environment variables")
        logger.error("Required: DATABASE_URL, RPC_URL, CONTRACT_ADDRESS, ADMIN_PRIVATE_KEY")
        return

    # Initialize generator
    generator = MerkleTreeGenerator(db_url, rpc_url, contract_address, admin_key)

    # Generate tree(s)
    roots_to_publish = []  # List of (day_id, slab_root, override_root) tuples

    if args.day is not None:
        # Single day
        slab_root, override_root = await generator.generate_tree_for_day(args.day, args.price, args.output_dir)
        if slab_root or override_root:
            roots_to_publish.append((args.day, slab_root, override_root))
    else:
        # Batch
        for day_id in range(args.from_day, args.to_day + 1):
            slab_root, override_root = await generator.generate_tree_for_day(day_id, args.price, args.output_dir)
            if slab_root or override_root:
                roots_to_publish.append((day_id, slab_root, override_root))

    # Publish if requested
    if args.publish and roots_to_publish:
        logger.info(f"\n{'='*80}")
        logger.info(f"Publishing {len(roots_to_publish)} DUAL Merkle root pairs to blockchain")
        logger.info(f"{'='*80}\n")

        if len(roots_to_publish) == 1:
            # Single pair
            day_id, slab_root, override_root = roots_to_publish[0]
            generator.publish_both_merkle_roots(day_id, slab_root, override_root)
        else:
            # Batch
            generator.publish_batch_both_merkle_roots(roots_to_publish)

    logger.info(f"\n{'='*80}")
    logger.info(f"✅ Complete!")
    logger.info(f"{'='*80}")


if __name__ == "__main__":
    asyncio.run(main())