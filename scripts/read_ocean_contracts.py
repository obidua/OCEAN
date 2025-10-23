#!/usr/bin/env python3
"""
Quick inspector for Ocean DeFi contracts.

Loads contract addresses from .env, picks the matching ABI from either
  - ./abis
  - ./apps/dashboard/store/Contract_ABI
and calls every read-only function that does not require inputs.

Usage:
  python scripts/read_ocean_contracts.py            # inspect default set
  python scripts/read_ocean_contracts.py --keys ADMINCONTROL SAFEWALLET
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

from dotenv import load_dotenv
from web3 import Web3

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

DEFAULT_ENV_KEYS: List[str] = [
    "ADMINCONTROL",
    "FREEZEPOLICY",
    "PORTFOLIOMANAGER",
    "PRICEORACLE",
    "REWARDVAULT",
    "ROYALTYMANAGER",
    "SLABMANAGER",
    "USERREGISTRY",
    "INCOMEDISTRIBUTOR",
    "SAFEWALLET",
    "MAINWALLET",
    "CAP_PAYOUT_ROUTER",
    "CAPPINGINCOMEMANAGER",
    "OWNER",
    "TREASURY",
    "RAMA",
    "OCEANQUERYUPGRADEABLE",
    "ROIDISTRIBUTOR",
    "OCEANVIEW",
    "OCEANVIEWV2",
    "OCEANICVIEW",
    "CORECONFIG",
]

SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parent
ABI_DIRS: Tuple[Path, ...] = (
    PROJECT_ROOT / "abis",
    PROJECT_ROOT / "apps" / "dashboard" / "store" / "Contract_ABI",
)


# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------

def build_abi_index() -> List[Tuple[Path, str]]:
    """Return a list of (path, normalized_key) pairs."""
    items: List[Tuple[Path, str]] = []
    for abi_root in ABI_DIRS:
        if not abi_root.exists():
            continue
        for path in sorted(abi_root.glob("*.json")):
            key = path.stem.upper()
            items.append((path, key))
    return items


def find_abi_path(key: str, index: Iterable[Tuple[Path, str]]) -> Optional[Path]:
    key_upper = key.upper()
    candidates: List[Path] = []

    for path, normalized in index:
        if normalized == key_upper:
            return path
        if key_upper in normalized or normalized in key_upper:
            candidates.append(path)

    return candidates[0] if candidates else None


def load_abi(path: Path) -> List[Dict]:
    with path.open() as fh:
        return json.load(fh)


def call_view_functions(
    w3: Web3, address: str, abi: List[Dict], *, label: str, abi_path: Path
) -> None:
    contract = w3.eth.contract(address=address, abi=abi)

    print(
        f"\n📡 {label}\n"
        f"   address : {address}\n"
        f"   abi     : {abi_path.relative_to(PROJECT_ROOT)}"
    )

    for item in abi:
        if item.get("type") != "function":
            continue
        if item.get("stateMutability") not in ("view", "pure"):
            continue
        if item.get("inputs"):
            print(f"   ⏩ Skipping `{item['name']}` — requires inputs")
            continue

        fn_name = item["name"]
        try:
            result = getattr(contract.functions, fn_name)().call()
            print(f"   ✅ {fn_name}() → {result}")
        except Exception as exc:  # pragma: no cover - best effort script
            print(f"   ❌ {fn_name}() failed: {exc}")


# ------------------------------------------------------------------------------
# Main
# ------------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Call all read-only Ocean DeFi contract functions that require no inputs."
    )
    parser.add_argument(
        "--keys",
        nargs="+",
        help="Specific .env keys to inspect (defaults to common Ocean contracts).",
    )
    args = parser.parse_args()

    load_dotenv()
    rpc_url = os.getenv("RPC_URL")
    if not rpc_url:
        raise SystemExit("RPC_URL missing in environment (.env)")

    w3 = Web3(Web3.HTTPProvider(rpc_url))
    assert w3.is_connected(), "❌ Not connected to RPC endpoint"
    print(f"✅ Connected to RPC: {rpc_url}")

    abi_index = build_abi_index()
    if not abi_index:
        raise SystemExit("No ABI files found. Check ABI directories in the script.")

    env_keys = [k.upper() for k in (args.keys or DEFAULT_ENV_KEYS)]
    seen = set()
    for key in env_keys:
        if key in seen:
            continue
        seen.add(key)

        raw_addr = os.getenv(key)
        if not raw_addr:
            print(f"\n⚠️  {key} is not set in environment; skipping.")
            continue

        try:
            checksum = Web3.to_checksum_address(raw_addr)
        except Exception as exc:
            print(f"\n❌ {key} has invalid address `{raw_addr}`: {exc}")
            continue

        abi_path = find_abi_path(key, abi_index)
        if not abi_path:
            print(f"\n❌ ABI file not found for {key} (address {checksum})")
            continue

        try:
            abi = load_abi(abi_path)
        except Exception as exc:  # pragma: no cover
            print(f"\n❌ Failed to load ABI for {key} at {abi_path}: {exc}")
            continue

        call_view_functions(w3, checksum, abi, label=key, abi_path=abi_path)


if __name__ == "__main__":
    main()
