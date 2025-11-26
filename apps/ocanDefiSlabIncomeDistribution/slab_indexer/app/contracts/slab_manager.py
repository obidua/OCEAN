"""
SlabManager contract wrapper for interacting with on-chain SLAB achievement data.
"""
import json
from pathlib import Path
from web3 import Web3
from app.core.web3_client import w3
from app.core.config import settings


# Load ABI
abi_path = Path(__file__).parent / "abi" / "SlabManager.json"
with open(abi_path, "r") as f:
    abi_data = json.load(f)
    # Handle both raw ABI array and compiled contract JSON
    SLAB_MANAGER_ABI = abi_data if isinstance(abi_data, list) else abi_data.get("abi", [])


class SlabManagerContract:
    """Wrapper for SlabManager contract interactions"""

    # Achievement kinds
    KIND_SLAB = 0
    KIND_REWARD = 1
    KIND_ROYALTY = 2

    # SLAB percentages by index
    SLAB_PERCENTAGES = [5, 10, 15, 20, 25, 30, 35, 45, 50, 55, 60]

    def __init__(self):
        self.contract = w3.eth.contract(
            address=Web3.to_checksum_address(settings.SLAB_MANAGER_ADDRESS),
            abi=SLAB_MANAGER_ABI
        )

    def get_slab_achievers(self, stage: int, offset: int = 0, limit: int = 100) -> list[str]:
        """
        Get SLAB achievers for a specific stage (slab level).

        Args:
            stage: SLAB stage/level (0-10 corresponding to 5%-60%)
            offset: Pagination offset
            limit: Number of results to fetch

        Returns:
            List of achiever addresses
        """
        try:
            addresses = self.contract.functions.getAchievers(
                self.KIND_SLAB,
                stage,
                offset,
                limit
            ).call()
            return [Web3.to_checksum_address(addr) for addr in addresses]
        except Exception as e:
            print(f"Error fetching SLAB achievers for stage {stage}: {e}")
            return []

    def get_all_slab_achievers(self, batch_size: int = 100) -> dict[int, list[str]]:
        """
        Get all SLAB achievers for all stages with pagination.

        Args:
            batch_size: Number of addresses to fetch per batch

        Returns:
            Dictionary mapping stage -> list of achiever addresses
        """
        all_achievers = {}

        for stage in range(11):  # 11 SLAB levels (0-10)
            stage_achievers = []
            offset = 0

            while True:
                batch = self.get_slab_achievers(stage, offset, batch_size)
                if not batch:
                    break

                stage_achievers.extend(batch)
                offset += batch_size

                # If we got less than batch_size, we've reached the end
                if len(batch) < batch_size:
                    break

            if stage_achievers:
                all_achievers[stage] = stage_achievers
                print(f"Fetched {len(stage_achievers)} achievers for SLAB level {stage} ({self.SLAB_PERCENTAGES[stage]}%)")

        return all_achievers

    def get_slab_percentage(self, stage: int) -> float:
        """Get the SLAB percentage for a given stage"""
        if 0 <= stage < len(self.SLAB_PERCENTAGES):
            return self.SLAB_PERCENTAGES[stage]
        return 0.0


# Global instance
slab_manager_contract = SlabManagerContract()
