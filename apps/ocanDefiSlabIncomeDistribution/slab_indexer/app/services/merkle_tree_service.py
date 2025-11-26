"""
Merkle Tree Service for Slab Income Distribution

Generates Merkle trees for daily slab income claims.
Admin uses this to create trees and store roots on-chain.
Users use this to get proofs for claiming.
"""
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
import json
from pathlib import Path
from eth_abi import encode
from web3 import Web3
import logging

logger = logging.getLogger(__name__)


@dataclass
class SlabIncomeLeaf:
    """Represents a leaf node in the Merkle tree (combined format)."""
    user_address: str
    day_id: int
    usd_amount: int  # micro USD
    rama_amount: int  # wei
    leaf_hash: bytes


@dataclass
class SimpleIncomeLeaf:
    """Represents a leaf node for slab-only or override-only trees."""
    user_address: str
    day_id: int
    amount: int  # micro USD or wei
    leaf_hash: bytes


class MerkleTree:
    """
    Merkle Tree implementation for slab income claims.

    Generates tree from list of achievers and their amounts.
    Provides root and proofs for verification.
    """

    def __init__(self, leaves: List[SlabIncomeLeaf]):
        """
        Initialize Merkle tree.

        Args:
            leaves: List of slab income leaves (sorted)
        """
        if len(leaves) == 0:
            raise ValueError("Cannot create tree with no leaves")

        self.leaves = sorted(leaves, key=lambda x: x.leaf_hash)
        self.layers = self._build_tree()

    def _build_tree(self) -> List[List[bytes]]:
        """Build Merkle tree layers."""
        layers = [[leaf.leaf_hash for leaf in self.leaves]]

        while len(layers[-1]) > 1:
            current_layer = layers[-1]
            next_layer = []

            # Process pairs
            for i in range(0, len(current_layer), 2):
                left = current_layer[i]

                if i + 1 < len(current_layer):
                    right = current_layer[i + 1]
                else:
                    # Odd number of nodes, duplicate last one
                    right = left

                # Sort pair before hashing (for deterministic tree)
                if left <= right:
                    combined = left + right
                else:
                    combined = right + left

                parent_hash = Web3.keccak(combined)
                next_layer.append(parent_hash)

            layers.append(next_layer)

        return layers

    def get_root(self) -> bytes:
        """Get Merkle root."""
        return self.layers[-1][0]

    def get_root_hex(self) -> str:
        """Get Merkle root as hex string."""
        return '0x' + self.get_root().hex()

    def get_proof(self, leaf: SlabIncomeLeaf) -> List[bytes]:
        """
        Get Merkle proof for a specific leaf.

        Args:
            leaf: Leaf to generate proof for

        Returns:
            List of sibling hashes proving leaf is in tree
        """
        try:
            index = next(i for i, l in enumerate(self.leaves) if l.leaf_hash == leaf.leaf_hash)
        except StopIteration:
            raise ValueError("Leaf not found in tree")

        proof = []

        for layer in self.layers[:-1]:  # Exclude root layer
            # Determine sibling index
            if index % 2 == 0:
                # Left node, sibling is right
                sibling_index = index + 1
            else:
                # Right node, sibling is left
                sibling_index = index - 1

            # Add sibling if it exists
            if sibling_index < len(layer):
                proof.append(layer[sibling_index])

            # Move to parent index in next layer
            index = index // 2

        return proof

    def get_proof_hex(self, leaf: SlabIncomeLeaf) -> List[str]:
        """Get Merkle proof as hex strings."""
        proof = self.get_proof(leaf)
        return ['0x' + p.hex() for p in proof]

    def verify_proof(self, leaf: SlabIncomeLeaf, proof: List[bytes]) -> bool:
        """
        Verify a Merkle proof.

        Args:
            leaf: Leaf to verify
            proof: Merkle proof

        Returns:
            True if proof is valid
        """
        current_hash = leaf.leaf_hash

        for sibling in proof:
            if current_hash <= sibling:
                combined = current_hash + sibling
            else:
                combined = sibling + current_hash

            current_hash = Web3.keccak(combined)

        return current_hash == self.get_root()


def generate_leaf_hash(user_address: str, day_id: int, usd_amount: int, rama_amount: int) -> bytes:
    """
    Generate leaf hash matching smart contract format (COMBINED tree).

    Solidity:
    keccak256(bytes.concat(keccak256(abi.encode(user, dayId, usdAmount, ramaAmount))))

    Args:
        user_address: User's address (checksummed)
        day_id: Day ID
        usd_amount: USD amount in micro USD
        rama_amount: RAMA amount in wei

    Returns:
        Leaf hash (bytes32)
    """
    # Ensure address is checksummed
    user_address = Web3.to_checksum_address(user_address)

    # First hash: keccak256(abi.encode(...))
    inner_hash = Web3.keccak(
        encode(
            ['address', 'uint32', 'uint256', 'uint256'],
            [user_address, day_id, usd_amount, rama_amount]
        )
    )

    # Second hash: keccak256(bytes.concat(inner_hash))
    # In Solidity, bytes.concat just concatenates, so we hash the inner_hash directly
    leaf_hash = Web3.keccak(inner_hash)

    return leaf_hash


def generate_simple_leaf_hash(user_address: str, day_id: int, amount: int) -> bytes:
    """
    Generate leaf hash for SLAB or OVERRIDE tree (simplified format).

    Solidity:
    keccak256(bytes.concat(keccak256(abi.encode(user, dayId, amount))))

    Used for:
    - Slab differential income tree (slab amount only)
    - Override income tree (override amount only)

    Args:
        user_address: User's address (checksummed)
        day_id: Day ID
        amount: Amount (slab or override income in micro USD/wei)

    Returns:
        Leaf hash (bytes32)
    """
    # Ensure address is checksummed
    user_address = Web3.to_checksum_address(user_address)

    # First hash: keccak256(abi.encode(...))
    inner_hash = Web3.keccak(
        encode(
            ['address', 'uint32', 'uint256'],
            [user_address, day_id, amount]
        )
    )

    # Second hash: keccak256(bytes.concat(inner_hash))
    leaf_hash = Web3.keccak(inner_hash)

    return leaf_hash


def create_slab_income_tree(achievers: List[Dict]) -> Tuple[MerkleTree, List[SlabIncomeLeaf]]:
    """
    Create Merkle tree from list of achievers.

    Args:
        achievers: List of dicts with keys:
            - user_address (str)
            - day_id (int)
            - usd_amount (int) - micro USD
            - rama_amount (int) - wei

    Returns:
        (MerkleTree, List of leaves)
    """
    if not achievers:
        raise ValueError("Cannot create tree with no achievers")

    # Generate leaves
    leaves = []
    for achiever in achievers:
        user_address = Web3.to_checksum_address(achiever['user_address'])
        day_id = int(achiever['day_id'])
        usd_amount = int(achiever['usd_amount'])
        rama_amount = int(achiever['rama_amount'])

        leaf_hash = generate_leaf_hash(user_address, day_id, usd_amount, rama_amount)

        leaf = SlabIncomeLeaf(
            user_address=user_address,
            day_id=day_id,
            usd_amount=usd_amount,
            rama_amount=rama_amount,
            leaf_hash=leaf_hash
        )
        leaves.append(leaf)

    # Create tree
    tree = MerkleTree(leaves)

    logger.info(f"Created Merkle tree with {len(leaves)} leaves")
    logger.info(f"Merkle root: {tree.get_root_hex()}")

    return tree, leaves


def create_simple_income_tree(achievers: List[Dict], income_type: str) -> Tuple[MerkleTree, List[SimpleIncomeLeaf]]:
    """
    Create Merkle tree for SLAB-only or OVERRIDE-only income.

    Args:
        achievers: List of dicts with keys:
            - user_address (str)
            - day_id (int)
            - amount (int) - slab or override income in micro USD/wei
        income_type: "slab" or "override" (for logging)

    Returns:
        (MerkleTree, List of leaves)
    """
    if not achievers:
        raise ValueError(f"Cannot create tree with no {income_type} achievers")

    # Generate leaves
    leaves = []
    for achiever in achievers:
        user_address = Web3.to_checksum_address(achiever['user_address'])
        day_id = int(achiever['day_id'])
        amount = int(achiever['amount'])

        leaf_hash = generate_simple_leaf_hash(user_address, day_id, amount)

        leaf = SimpleIncomeLeaf(
            user_address=user_address,
            day_id=day_id,
            amount=amount,
            leaf_hash=leaf_hash
        )
        leaves.append(leaf)

    # Create tree
    tree = MerkleTree(leaves)

    logger.info(f"Created {income_type} Merkle tree with {len(leaves)} leaves")
    logger.info(f"{income_type.capitalize()} Merkle root: {tree.get_root_hex()}")

    return tree, leaves


def save_tree_data(day_id: int, tree: MerkleTree, leaves: List[SlabIncomeLeaf], output_dir: str = "./merkle_trees"):
    """
    Save tree data to JSON file for later proof generation.

    Args:
        day_id: Day ID
        tree: Merkle tree
        leaves: List of leaves
        output_dir: Directory to save files
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Prepare data
    data = {
        "day_id": day_id,
        "merkle_root": tree.get_root_hex(),
        "total_achievers": len(leaves),
        "leaves": [
            {
                "user_address": leaf.user_address,
                "day_id": leaf.day_id,
                "usd_amount": leaf.usd_amount,
                "rama_amount": leaf.rama_amount,
                "leaf_hash": '0x' + leaf.leaf_hash.hex()
            }
            for leaf in leaves
        ]
    }

    # Save to file
    filename = output_path / f"day_{day_id}.json"
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

    logger.info(f"Saved tree data to {filename}")

    return filename


def save_simple_tree_data(day_id: int, tree: MerkleTree, leaves: List[SimpleIncomeLeaf], income_type: str, output_dir: str = "./merkle_trees"):
    """
    Save simple tree data (slab or override) to JSON file for later proof generation.

    Args:
        day_id: Day ID
        tree: Merkle tree
        leaves: List of simple leaves
        income_type: "slab" or "override"
        output_dir: Directory to save files
    """
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)

    # Prepare data
    data = {
        "day_id": day_id,
        "income_type": income_type,
        "merkle_root": tree.get_root_hex(),
        "total_achievers": len(leaves),
        "leaves": [
            {
                "user_address": leaf.user_address,
                "day_id": leaf.day_id,
                "amount": leaf.amount,
                "leaf_hash": '0x' + leaf.leaf_hash.hex()
            }
            for leaf in leaves
        ]
    }

    # Save to file with income type suffix
    filename = output_path / f"day_{day_id}_{income_type}.json"
    with open(filename, 'w') as f:
        json.dump(data, f, indent=2)

    logger.info(f"Saved {income_type} tree data to {filename}")

    return filename


def load_tree_data(day_id: int, tree_dir: str = "./merkle_trees") -> Tuple[MerkleTree, List[SlabIncomeLeaf]]:
    """
    Load tree data from JSON file.

    Args:
        day_id: Day ID
        tree_dir: Directory containing tree files

    Returns:
        (MerkleTree, List of leaves)
    """
    filename = Path(tree_dir) / f"day_{day_id}.json"

    if not filename.exists():
        raise FileNotFoundError(f"Tree data not found for day {day_id}")

    with open(filename, 'r') as f:
        data = json.load(f)

    # Reconstruct leaves
    leaves = []
    for leaf_data in data['leaves']:
        leaf = SlabIncomeLeaf(
            user_address=leaf_data['user_address'],
            day_id=leaf_data['day_id'],
            usd_amount=leaf_data['usd_amount'],
            rama_amount=leaf_data['rama_amount'],
            leaf_hash=bytes.fromhex(leaf_data['leaf_hash'][2:])
        )
        leaves.append(leaf)

    # Recreate tree
    tree = MerkleTree(leaves)

    # Verify root matches
    if tree.get_root_hex() != data['merkle_root']:
        raise ValueError("Merkle root mismatch - tree data may be corrupted")

    logger.info(f"Loaded tree for day {day_id} with {len(leaves)} leaves")

    return tree, leaves


def load_simple_tree_data(day_id: int, income_type: str, tree_dir: str = "./merkle_trees") -> Tuple[MerkleTree, List[SimpleIncomeLeaf]]:
    """
    Load simple tree data (slab or override) from JSON file.

    Args:
        day_id: Day ID
        income_type: "slab" or "override"
        tree_dir: Directory containing tree files

    Returns:
        (MerkleTree, List of simple leaves)
    """
    filename = Path(tree_dir) / f"day_{day_id}_{income_type}.json"

    if not filename.exists():
        raise FileNotFoundError(f"{income_type.capitalize()} tree data not found for day {day_id}")

    with open(filename, 'r') as f:
        data = json.load(f)

    # Reconstruct leaves
    leaves = []
    for leaf_data in data['leaves']:
        leaf = SimpleIncomeLeaf(
            user_address=leaf_data['user_address'],
            day_id=leaf_data['day_id'],
            amount=leaf_data['amount'],
            leaf_hash=bytes.fromhex(leaf_data['leaf_hash'][2:])
        )
        leaves.append(leaf)

    # Recreate tree
    tree = MerkleTree(leaves)

    # Verify root matches
    if tree.get_root_hex() != data['merkle_root']:
        raise ValueError(f"{income_type.capitalize()} Merkle root mismatch - tree data may be corrupted")

    logger.info(f"Loaded {income_type} tree for day {day_id} with {len(leaves)} leaves")

    return tree, leaves


def get_proof_for_user(day_id: int, user_address: str, tree_dir: str = "./merkle_trees") -> Optional[Dict]:
    """
    Get Merkle proof for a specific user for a specific day (COMBINED tree - backward compatibility).

    Args:
        day_id: Day ID
        user_address: User's address
        tree_dir: Directory containing tree files

    Returns:
        Dict with proof data or None if user not found
    """
    user_address = Web3.to_checksum_address(user_address)

    # Load tree
    tree, leaves = load_tree_data(day_id, tree_dir)

    # Find user's leaf
    user_leaf = None
    for leaf in leaves:
        if leaf.user_address == user_address:
            user_leaf = leaf
            break

    if user_leaf is None:
        logger.warning(f"User {user_address} not found in tree for day {day_id}")
        return None

    # Generate proof
    proof = tree.get_proof_hex(user_leaf)

    return {
        "user_address": user_leaf.user_address,
        "day_id": user_leaf.day_id,
        "usd_amount": str(user_leaf.usd_amount),
        "rama_amount": str(user_leaf.rama_amount),
        "merkle_proof": proof,
        "merkle_root": tree.get_root_hex(),
        "leaf_hash": '0x' + user_leaf.leaf_hash.hex()
    }


def get_simple_proof_for_user(day_id: int, user_address: str, income_type: str, tree_dir: str = "./merkle_trees") -> Optional[Dict]:
    """
    Get Merkle proof for SLAB or OVERRIDE tree.

    Args:
        day_id: Day ID
        user_address: User's address
        income_type: "slab" or "override"
        tree_dir: Directory containing tree files

    Returns:
        Dict with proof data or None if user not found
    """
    user_address = Web3.to_checksum_address(user_address)

    try:
        # Load simple tree
        tree, leaves = load_simple_tree_data(day_id, income_type, tree_dir)
    except FileNotFoundError:
        logger.warning(f"{income_type.capitalize()} tree not found for day {day_id}")
        return None

    # Find user's leaf
    user_leaf = None
    for leaf in leaves:
        if leaf.user_address == user_address:
            user_leaf = leaf
            break

    if user_leaf is None:
        logger.warning(f"User {user_address} not found in {income_type} tree for day {day_id}")
        return None

    # Generate proof
    proof = tree.get_proof_hex(user_leaf)

    return {
        "user_address": user_leaf.user_address,
        "day_id": user_leaf.day_id,
        "amount": str(user_leaf.amount),
        "income_type": income_type,
        "merkle_proof": proof,
        "merkle_root": tree.get_root_hex(),
        "leaf_hash": '0x' + user_leaf.leaf_hash.hex()
    }


# ==============================================================================
# EXAMPLE USAGE
# ==============================================================================

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)

    # Example: Create tree for day 150
    achievers = [
        {
            "user_address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb",
            "day_id": 150,
            "usd_amount": 5000000000,  # $5000 in micro USD
            "rama_amount": 100000000000000000000000  # 100K RAMA wei
        },
        {
            "user_address": "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
            "day_id": 150,
            "usd_amount": 2000000000,  # $2000
            "rama_amount": 40000000000000000000000  # 40K RAMA
        },
        {
            "user_address": "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
            "day_id": 150,
            "usd_amount": 3000000000,  # $3000
            "rama_amount": 60000000000000000000000  # 60K RAMA
        }
    ]

    # Create tree
    tree, leaves = create_slab_income_tree(achievers)

    print(f"\nMerkle Root: {tree.get_root_hex()}")
    print(f"Total Achievers: {len(leaves)}")

    # Save tree data
    save_tree_data(150, tree, leaves)

    # Get proof for specific user
    proof_data = get_proof_for_user(150, "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb")

    if proof_data:
        print(f"\nProof for user {proof_data['user_address']}:")
        print(f"  USD Amount: ${int(proof_data['usd_amount']) / 1e6:.2f}")
        print(f"  RAMA Amount: {int(proof_data['rama_amount']) / 1e18:.2f} RAMA")
        print(f"  Merkle Proof: {proof_data['merkle_proof']}")
        print(f"  Proof Length: {len(proof_data['merkle_proof'])} hashes")

        # Verify proof
        leaf = next(l for l in leaves if l.user_address == proof_data['user_address'])
        proof_bytes = [bytes.fromhex(p[2:]) for p in proof_data['merkle_proof']]
        is_valid = tree.verify_proof(leaf, proof_bytes)
        print(f"  Proof Valid: {is_valid}")