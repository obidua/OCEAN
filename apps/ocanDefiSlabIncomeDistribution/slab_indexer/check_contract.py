"""
Check SlabIncomeDistributor contract configuration
"""
from web3 import Web3
import os
from dotenv import load_dotenv

load_dotenv()

w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))
print(f"Connected to: {os.getenv('RPC_URL')}")
print(f"Chain ID: {w3.eth.chain_id}")
print()

# Contract addresses
slab_contract_address = Web3.to_checksum_address(os.getenv('SlabIncomeDistributorWithProof_CONTRACT_ADDRESS'))
print(f"SlabIncomeDistributor: {slab_contract_address}")

# Get CoreConfig address
abi = [{
    'inputs': [],
    'name': 'coreConfig',
    'outputs': [{'name': '', 'type': 'address'}],
    'stateMutability': 'view',
    'type': 'function'
}]

contract = w3.eth.contract(address=slab_contract_address, abi=abi)
core_config_address = contract.functions.coreConfig().call()
print(f"CoreConfig: {core_config_address}")
print()

# Check if it's a zero address
if core_config_address == '0x0000000000000000000000000000000000000000':
    print("❌ ERROR: CoreConfig is not initialized!")
    print("You need to call initialize(coreConfigAddress) on the SlabIncomeDistributor contract")
    exit(1)

# Get the bytecode size of CoreConfig to verify it's a contract
code = w3.eth.get_code(core_config_address)
print(f"CoreConfig bytecode size: {len(code)} bytes")

if len(code) <= 2:
    print("❌ ERROR: CoreConfig address has no code! It's not a deployed contract.")
    exit(1)

print("✅ CoreConfig is deployed and initialized")
print()

# Try to determine what we can do
print("SOLUTION OPTIONS:")
print("1. Update the deployed CoreConfig to include contractStartTime()")
print("2. Redeploy SlabIncomeDistributor without the day validation")
print("3. Use a workaround to set merkle roots")
print()
print("Checking if contract is upgradeable...")

# Check if it's a proxy
try:
    proxy_abi = [{
        'inputs': [],
        'name': 'implementation',
        'outputs': [{'name': '', 'type': 'address'}],
        'stateMutability': 'view',
        'type': 'function'
    }]
    proxy = w3.eth.contract(address=slab_contract_address, abi=proxy_abi)
    impl = proxy.functions.implementation().call()
    print(f"✅ Contract is upgradeable! Implementation: {impl}")
    print("You can upgrade the implementation to fix this issue.")
except:
    print("⚠️ Contract doesn't appear to be a standard proxy")
