import json
from pathlib import Path

from web3 import Web3
from app.core.web3_client import w3
from app.core.config import settings



ABI_DIR = Path(__file__).resolve().parent / "abi"


def load_abi(name: str):
    with open(ABI_DIR / f"{name}.json", "r") as f:
        return json.load(f)


user_registry = w3.eth.contract(
    address=Web3.to_checksum_address(settings.USER_REGISTRY_ADDRESS),
    abi=load_abi("UserRegistry"),
)

portfolio_manager = w3.eth.contract(
    address=Web3.to_checksum_address(settings.PORTFOLIO_MANAGER_ADDRESS),
    abi=load_abi("PortfolioManager"),
)

capping_income_manager = w3.eth.contract(
    address=Web3.to_checksum_address(settings.CAPPING_INCOME_MANAGER_ADDRESS),
    abi=load_abi("CappingIncomeManager"),
)

slab_manager = w3.eth.contract(
    address=Web3.to_checksum_address(settings.SLAB_MANAGER_ADDRESS),
    abi=load_abi("SlabManager"),
)

roi_distributor = w3.eth.contract(
    address=Web3.to_checksum_address(settings.ROI_DISTRIBUTOR_ADDRESS),
    abi=load_abi("ROIDistributor"),
)
