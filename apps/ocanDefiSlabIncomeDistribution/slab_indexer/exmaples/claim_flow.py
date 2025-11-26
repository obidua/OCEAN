"""
Complete example of Method 3 claim flow using Python backend with EIP-712 signatures.

This demonstrates:
1. Backend calculates slab income off-chain
2. Backend creates EIP-712 signature
3. User submits signed claim to smart contract
4. Contract verifies and transfers tokens
"""
import asyncio
from web3 import Web3
from eth_account import Account
from eth_account.messages import encode_structured_data
import httpx


# ==============================================================================
# CONFIGURATION
# ==============================================================================

# Backend API
API_URL = "http://localhost:8000"

# Blockchain
RPC_URL = "https://polygon-rpc.com"
CHAIN_ID = 137

# Contract
CONTRACT_ADDRESS = "0x..."  # SlabIncomeDistributorWithProof address

# User
USER_PRIVATE_KEY = "0x..."  # User's private key (to sign transaction)
USER_ADDRESS = "0x..."  # User's address

# ABI (simplified - add full ABI)
CONTRACT_ABI = [
    {
        "inputs": [
            {"name": "fromDay", "type": "uint32"},
            {"name": "toDay", "type": "uint32"},
            {"name": "usdAmount", "type": "uint256"},
            {"name": "ramaAmount", "type": "uint256"},
            {"name": "signature", "type": "bytes"}
        ],
        "name": "claimWithProof",
        "outputs": [],
        "stateMutability": "nonpayable",
        "type": "function"
    }
]


# ==============================================================================
# STEP 1: Get Signed Claim from Backend
# ==============================================================================

async def get_signed_claim(user_address: str, from_day: int, to_day: int):
    """
    Call backend API to get calculated slab income with signature.
    """
    print(f"\n📊 Step 1: Getting signed claim from backend...")
    print(f"   User: {user_address}")
    print(f"   Period: Day {from_day} to {to_day}")

    # Call backend API
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_URL}/api/slab-claim/calculate/{user_address}/{from_day}/{to_day}",
            params={"price_micro_usd": 50000000}  # $0.05 RAMA price
        )

        if response.status_code != 200:
            raise Exception(f"Backend error: {response.text}")

        claim = response.json()

    # Display claim details
    print(f"\n✅ Claim retrieved successfully!")
    print(f"   USD Amount: ${float(claim['breakdown']['total_income_usd']):.2f}")
    print(f"   Breakdown:")
    print(f"     - Slab Income: ${claim['breakdown']['slab_income_usd']}")
    print(f"     - Override Income: ${claim['breakdown']['override_income_usd']}")
    print(f"   RAMA Amount: {int(claim['rama_amount']) / 1e18:.2f} RAMA")
    print(f"   Nonce: {claim['nonce']}")
    print(f"   Signature: {claim['signature'][:20]}...")

    return claim


# ==============================================================================
# STEP 2: Verify Signature (Optional - for debugging)
# ==============================================================================

async def verify_signature_with_backend(claim):
    """
    Optional: Verify the signature using backend endpoint.
    """
    print(f"\n🔍 Step 2: Verifying signature...")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{API_URL}/api/slab-claim/verify-signature",
            params={
                "user_address": claim["user_address"],
                "from_day": claim["from_day"],
                "to_day": claim["to_day"],
                "usd_amount": claim["usd_amount"],
                "rama_amount": claim["rama_amount"],
                "nonce": claim["nonce"],
                "signature": claim["signature"]
            }
        )

        result = response.json()

    if result["valid"]:
        print(f"✅ Signature is valid!")
        print(f"   Signer: {result['signer_address']}")
    else:
        print(f"❌ Signature is INVALID!")
        raise Exception("Signature verification failed")

    return result["valid"]


# ==============================================================================
# STEP 3: Submit Claim to Smart Contract
# ==============================================================================

async def submit_claim_to_contract(claim):
    """
    Submit the signed claim to the smart contract.
    """
    print(f"\n🔗 Step 3: Submitting claim to smart contract...")

    # Connect to blockchain
    w3 = Web3(Web3.HTTPProvider(RPC_URL))

    if not w3.is_connected():
        raise Exception("Failed to connect to blockchain")

    print(f"   Connected to blockchain (Chain ID: {w3.eth.chain_id})")

    # Load user account
    account = Account.from_key(USER_PRIVATE_KEY)
    print(f"   User address: {account.address}")

    # Load contract
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(CONTRACT_ADDRESS),
        abi=CONTRACT_ABI
    )

    # Build transaction
    print(f"   Building transaction...")

    tx = contract.functions.claimWithProof(
        int(claim["from_day"]),
        int(claim["to_day"]),
        int(claim["usd_amount"]),
        int(claim["rama_amount"]),
        bytes.fromhex(claim["signature"][2:])  # Remove 0x prefix
    ).build_transaction({
        'from': account.address,
        'nonce': w3.eth.get_transaction_count(account.address),
        'gas': 200000,  # Estimate: 100K-120K
        'gasPrice': w3.eth.gas_price,
        'chainId': CHAIN_ID
    })

    # Sign transaction
    print(f"   Signing transaction...")
    signed_tx = account.sign_transaction(tx)

    # Send transaction
    print(f"   Sending transaction...")
    tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

    print(f"   Transaction sent: {tx_hash.hex()}")
    print(f"   Waiting for confirmation...")

    # Wait for confirmation
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

    if receipt['status'] == 1:
        print(f"\n✅ Claim successful!")
        print(f"   Transaction hash: {receipt['transactionHash'].hex()}")
        print(f"   Block number: {receipt['blockNumber']}")
        print(f"   Gas used: {receipt['gasUsed']:,}")
        print(f"   Gas savings: ~{((2000000 - receipt['gasUsed']) / 2000000 * 100):.1f}% vs Method 1")
    else:
        print(f"\n❌ Transaction failed!")
        raise Exception(f"Transaction reverted")

    return receipt


# ==============================================================================
# STEP 4: Verify Claim in Database (Optional)
# ==============================================================================

async def verify_claim_in_database(user_address: str):
    """
    Check claim history in backend database.
    """
    print(f"\n📋 Step 4: Checking claim history...")

    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{API_URL}/api/slab-claim/claim-history/{user_address}"
        )

        history = response.json()

    print(f"   Total claims: {history['total_claims']}")

    if history['claims']:
        latest = history['claims'][0]
        print(f"   Latest claim:")
        print(f"     - Period: Day {latest['from_day']} to {latest['to_day']}")
        print(f"     - USD Amount: ${int(latest['usd_amount']) / 1e6:.2f}")
        print(f"     - Claimed at: {latest['claimed_at']}")

    return history


# ==============================================================================
# MAIN FLOW
# ==============================================================================

async def main():
    """
    Complete claim flow demonstration.
    """
    print("=" * 80)
    print("Method 3: Off-Chain Calculation with EIP-712 Signature")
    print("Complete Claim Flow Demonstration")
    print("=" * 80)

    try:
        # Configuration
        from_day = 100
        to_day = 150

        # Step 1: Get signed claim from backend
        claim = await get_signed_claim(USER_ADDRESS, from_day, to_day)

        # Check if there's anything to claim
        if int(claim.get("usd_amount", 0)) == 0:
            print("\n⚠️ No slab income to claim for this period")
            return

        # Step 2: Verify signature (optional)
        await verify_signature_with_backend(claim)

        # Step 3: Submit to smart contract
        receipt = await submit_claim_to_contract(claim)

        # Step 4: Verify in database
        await verify_claim_in_database(USER_ADDRESS)

        print("\n" + "=" * 80)
        print("✅ CLAIM COMPLETED SUCCESSFULLY!")
        print("=" * 80)

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()


# ==============================================================================
# ALTERNATIVE: Frontend Integration Example
# ==============================================================================

class SlabIncomeClaimClient:
    """
    Reusable client for integrating into frontend applications.
    """

    def __init__(self, api_url: str, contract_address: str, contract_abi: list):
        self.api_url = api_url
        self.contract_address = contract_address
        self.contract_abi = contract_abi

    async def get_claimable_amount(self, user_address: str, current_day: int):
        """Get claimable amount without signing."""
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/api/slab-claim/claimable/{user_address}",
                params={
                    "price_micro_usd": 50000000,
                    "current_day": current_day
                }
            )
            return response.json()

    async def claim(self, user_private_key: str, from_day: int, to_day: int):
        """Execute complete claim flow."""
        # Get user address
        account = Account.from_key(user_private_key)
        user_address = account.address

        # Get signed claim
        async with httpx.AsyncClient() as client:
            response = await client.get(
                f"{self.api_url}/api/slab-claim/calculate/{user_address}/{from_day}/{to_day}",
                params={"price_micro_usd": 50000000}
            )
            claim = response.json()

        # Submit to contract
        w3 = Web3(Web3.HTTPProvider(RPC_URL))
        contract = w3.eth.contract(
            address=Web3.to_checksum_address(self.contract_address),
            abi=self.contract_abi
        )

        tx = contract.functions.claimWithProof(
            int(claim["from_day"]),
            int(claim["to_day"]),
            int(claim["usd_amount"]),
            int(claim["rama_amount"]),
            bytes.fromhex(claim["signature"][2:])
        ).build_transaction({
            'from': account.address,
            'nonce': w3.eth.get_transaction_count(account.address),
            'gas': 200000,
            'gasPrice': w3.eth.gas_price,
            'chainId': CHAIN_ID
        })

        signed_tx = account.sign_transaction(tx)
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash)

        return {
            "success": receipt['status'] == 1,
            "tx_hash": receipt['transactionHash'].hex(),
            "gas_used": receipt['gasUsed'],
            "claim": claim
        }


# ==============================================================================
# RUN
# ==============================================================================

if __name__ == "__main__":
    asyncio.run(main())