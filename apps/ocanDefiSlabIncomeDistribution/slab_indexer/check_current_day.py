"""Check what the current day is according to the contract"""
from web3 import Web3
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

w3 = Web3(Web3.HTTPProvider(os.getenv('RPC_URL')))
contract_addr = Web3.to_checksum_address(os.getenv('SlabIncomeDistributorWithProof_CONTRACT_ADDRESS'))

# Get CoreConfig address
abi = [{
    'inputs': [],
    'name': 'coreConfig',
    'outputs': [{'name': '', 'type': 'address'}],
    'stateMutability': 'view',
    'type': 'function'
}]
contract = w3.eth.contract(address=contract_addr, abi=abi)
core_config_addr = contract.functions.coreConfig().call()

# Get contract start time
core_abi = [{
    'inputs': [],
    'name': 'contractStartTime',
    'outputs': [{'name': '', 'type': 'uint256'}],
    'stateMutability': 'view',
    'type': 'function'
}]
core = w3.eth.contract(address=core_config_addr, abi=core_abi)

try:
    start_time = core.functions.contractStartTime().call()
    current_time = w3.eth.get_block('latest')['timestamp']
    current_day = (current_time - start_time) // 86400 if current_time >= start_time else 0

    print(f"Contract Start Time: {datetime.fromtimestamp(start_time)} (timestamp: {start_time})")
    print(f"Current Time: {datetime.fromtimestamp(current_time)} (timestamp: {current_time})")
    print(f"Current Day: {current_day}")
    print(f"Requested Day: 20407")
    print()

    if 20407 < current_day:
        print(f"Day 20407 is VALID (it's in the past)")
        print(f"ERROR: There's a different issue!")
    else:
        print(f"Day 20407 is INVALID (it's in the future)")
        print(f"You need to wait {20407 - current_day} more days")
        print(f"Or use a day number <= {current_day}")
        print()
        print(f"Try running with: --day {current_day - 1}")

except Exception as e:
    print(f"Error: {e}")
    print()
    print("The CoreConfig doesn't have contractStartTime() implemented")
    print("You need to use the setBothMerkleRootsUnchecked() workaround")
