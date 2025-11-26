"""
Check what the deployed contract considers as the current day
"""
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()

w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))
contract_addr = Web3.to_checksum_address(os.getenv('SlabIncomeDistributorWithProof_CONTRACT_ADDRESS'))

print(f"Contract: {contract_addr}")
print()

# Get current block timestamp
current_block = w3.eth.get_block('latest')
current_timestamp = current_block['timestamp']
print(f"Current block timestamp: {current_timestamp}")
print(f"Block number: {current_block['number']}")
print()

# Calculate what _getCurrentDay() SHOULD return based on different formulas
print("Expected current day calculations:")
print(f"1. Unix epoch (timestamp / 86400): {current_timestamp // 86400}")
print(f"2. From Nov 2, 2024 ((timestamp - 1730563200) / 86400): {(current_timestamp - 1730563200) // 86400}")
print()

# Try to estimate current day by attempting to set different days
# The contract will reject days >= current_day
abi = [{
    "inputs": [{"name": "dayId", "type": "uint32"}, {"name": "slabMerkleRoot", "type": "bytes32"}, {"name": "overrideMerkleRoot", "type": "bytes32"}],
    "name": "setBothMerkleRoots",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
}]

contract = w3.eth.contract(address=contract_addr, abi=abi)

print("Testing which days the contract would accept (via eth_call simulation)...")
print("Note: Days that DON'T revert are in the past, days that revert are >= current day")
print()

# Test a range of days
test_days = [0, 5, 10, 13, 14, 15, 20, 50, 100, 377, 378, 379, 380, 20406, 20407, 20408]
dummy_root = bytes(32)

from_address = "0x43f9032232645721EE504c9d4059F81b07595743"  # Your admin address

for day in test_days:
    try:
        # Try to simulate the transaction
        contract.functions.setBothMerkleRoots(
            day,
            dummy_root,
            dummy_root
        ).call({'from': from_address})

        print(f"Day {day:5}: ✓ Would succeed (day < current_day)")
    except Exception as e:
        error_str = str(e)
        if "0x8467a780" in error_str or "CannotClaimFuture" in error_str:
            print(f"Day {day:5}: ✗ CannotClaimFuture (day >= current_day)")
        elif "0xd92e233d" in error_str or "ZeroAddress" in error_str:
            print(f"Day {day:5}: ✗ ZeroAddress (dummy roots rejected)")
        else:
            print(f"Day {day:5}: ✗ Other error: {error_str[:50]}")

print()
print("Conclusion: The first day that reverts with CannotClaimFuture is the current day")
