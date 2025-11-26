"""
EIP-712 Signature Service for Slab Income Claims

Generates cryptographic signatures that prove off-chain calculations are correct.
Compatible with SlabIncomeDistributorWithProof.sol contract.
"""
from eth_account import Account
from eth_account.messages import encode_typed_data
from typing import Dict, Optional
import os
from dotenv import load_dotenv
import logging
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

load_dotenv()
logger = logging.getLogger(__name__)


class SignatureService:
    """
    Service for creating EIP-712 signatures for slab income claims.
    """

    def __init__(self, private_key: str, contract_address: str, chain_id: int):
        """
        Initialize signature service.

        Args:
            private_key: Private key of trusted signer (with 0x prefix)
            contract_address: Address of SlabIncomeDistributor contract
            chain_id: Blockchain chain ID (e.g., 137 for Polygon, 80001 for Mumbai)
        """
        self.private_key = private_key
        if not self.private_key.startswith('0x'):
            self.private_key = '0x' + self.private_key

        self.account = Account.from_key(self.private_key)
        self.signer_address = self.account.address
        self.contract_address = contract_address
        self.chain_id = chain_id

        logger.info(f"Signature service initialized")
        logger.info(f"Signer address: {self.signer_address}")
        logger.info(f"Contract address: {self.contract_address}")
        logger.info(f"Chain ID: {self.chain_id}")

    def get_domain(self) -> Dict:
        """
        Get EIP-712 domain separator.
        Must match the domain in the smart contract.
        """
        return {
            "name": "SlabIncomeDistributor",
            "version": "1",
            "chainId": self.chain_id,
            "verifyingContract": self.contract_address
        }

    def get_types(self) -> Dict:
        """
        Get EIP-712 type definitions.
        Must match the struct in the smart contract.
        """
        return {
            "EIP712Domain": [
                {"name": "name", "type": "string"},
                {"name": "version", "type": "string"},
                {"name": "chainId", "type": "uint256"},
                {"name": "verifyingContract", "type": "address"}
            ],
            "SlabIncomeClaim": [
                {"name": "user", "type": "address"},
                {"name": "fromDay", "type": "uint32"},
                {"name": "toDay", "type": "uint32"},
                {"name": "usdAmount", "type": "uint256"},
                {"name": "ramaAmount", "type": "uint256"},
                {"name": "nonce", "type": "uint256"}
            ]
        }

    def create_claim_signature(
        self,
        user_address: str,
        from_day: int,
        to_day: int,
        usd_amount: int,
        rama_amount: int,
        nonce: int
    ) -> str:
        """
        Create EIP-712 signature for a slab income claim.

        Args:
            user_address: User claiming the income
            from_day: Start day (inclusive)
            to_day: End day (inclusive)
            usd_amount: Amount in micro USD (e.g., 1000000 = $1)
            rama_amount: Amount in RAMA wei (18 decimals)
            nonce: User's current nonce

        Returns:
            Signature as hex string (with 0x prefix)
        """
        # Ensure address is checksummed
        user_address = Account.to_checksum_address(user_address)

        # Create the structured data
        structured_data = {
            "types": self.get_types(),
            "primaryType": "SlabIncomeClaim",
            "domain": self.get_domain(),
            "message": {
                "user": user_address,
                "fromDay": from_day,
                "toDay": to_day,
                "usdAmount": str(usd_amount),
                "ramaAmount": str(rama_amount),
                "nonce": nonce
            }
        }

        # Encode and sign
        encoded_data = encode_typed_data(structured_data)
        signed_message = self.account.sign_message(encoded_data)

        signature = signed_message.signature.hex()
        if not signature.startswith('0x'):
            signature = '0x' + signature

        logger.info(f"Created signature for user {user_address}, days {from_day}-{to_day}")
        logger.debug(f"Signature: {signature}")

        return signature

    def verify_signature(
        self,
        signature: str,
        user_address: str,
        from_day: int,
        to_day: int,
        usd_amount: int,
        rama_amount: int,
        nonce: int
    ) -> bool:
        """
        Verify that a signature is valid (for testing).

        Args:
            signature: Signature to verify
            user_address: User address
            from_day: Start day
            to_day: End day
            usd_amount: USD amount in micro USD
            rama_amount: RAMA amount in wei
            nonce: Nonce

        Returns:
            True if signature is valid
        """
        try:
            user_address = Account.to_checksum_address(user_address)

            structured_data = {
                "types": self.get_types(),
                "primaryType": "SlabIncomeClaim",
                "domain": self.get_domain(),
                "message": {
                    "user": user_address,
                    "fromDay": from_day,
                    "toDay": to_day,
                    "usdAmount": str(usd_amount),
                    "ramaAmount": str(rama_amount),
                    "nonce": nonce
                }
            }

            encoded_data = encode_typed_data(structured_data)
            recovered_address = Account.recover_message(
                encoded_data,
                signature=signature
            )

            is_valid = recovered_address.lower() == self.signer_address.lower()
            logger.info(f"Signature verification: {is_valid}")
            return is_valid

        except Exception as e:
            logger.error(f"Error verifying signature: {e}")
            return False


class NonceManager:
    """
    Manages nonces for users to prevent replay attacks.
    """

    async def get_nonce(self, db: AsyncSession, user_address: str) -> int:
        """
        Get current nonce for a user.

        Args:
            db: Database session
            user_address: User's wallet address

        Returns:
            Current nonce (0 if user not found)
        """
        user_address = user_address.lower()

        # Check if nonce table exists, if not create it
        await self._ensure_nonce_table(db)

        query = text("SELECT nonce FROM slab_income_nonces WHERE user_address = :addr")
        result = await db.execute(query, {"addr": user_address})
        row = result.fetchone()

        if row:
            return row.nonce
        else:
            # Initialize nonce for new user
            insert_query = text(
                "INSERT INTO slab_income_nonces (user_address, nonce) "
                "VALUES (:addr, 0) "
                "ON CONFLICT (user_address) DO NOTHING"
            )
            await db.execute(insert_query, {"addr": user_address})
            await db.commit()
            return 0

    async def increment_nonce(self, db: AsyncSession, user_address: str) -> int:
        """
        Increment nonce for a user (call after successful claim).

        Args:
            db: Database session
            user_address: User's wallet address

        Returns:
            New nonce value
        """
        user_address = user_address.lower()

        query = text(
            "INSERT INTO slab_income_nonces (user_address, nonce) "
            "VALUES (:addr, 1) "
            "ON CONFLICT (user_address) DO UPDATE "
            "SET nonce = slab_income_nonces.nonce + 1, "
            "    updated_at = CURRENT_TIMESTAMP "
            "RETURNING nonce"
        )
        result = await db.execute(query, {"addr": user_address})
        await db.commit()
        row = result.fetchone()

        new_nonce = row.nonce if row else 1
        logger.info(f"Incremented nonce for {user_address} to {new_nonce}")
        return new_nonce

    async def _ensure_nonce_table(self, db: AsyncSession):
        """Create nonce table if it doesn't exist."""
        create_table_query = text("""
            CREATE TABLE IF NOT EXISTS slab_income_nonces (
                user_address TEXT PRIMARY KEY,
                nonce BIGINT NOT NULL DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_nonces_address ON slab_income_nonces(user_address);
        """)
        await db.execute(create_table_query)
        await db.commit()


class ClaimTracker:
    """
    Tracks which periods have been claimed to prevent double-claiming.
    """

    async def is_claimed(
        self,
        db: AsyncSession,
        user_address: str,
        from_day: int,
        to_day: int
    ) -> bool:
        """
        Check if a period has already been claimed.

        Args:
            db: Database session
            user_address: User's wallet address
            from_day: Start day
            to_day: End day

        Returns:
            True if already claimed
        """
        user_address = user_address.lower()

        await self._ensure_claims_table(db)

        query = text(
            "SELECT EXISTS("
            "  SELECT 1 FROM slab_income_claims "
            "  WHERE user_address = :addr "
            "  AND from_day = :from_day "
            "  AND to_day = :to_day"
            ") AS claimed"
        )
        result = await db.execute(query, {
            "addr": user_address,
            "from_day": from_day,
            "to_day": to_day
        })
        row = result.fetchone()
        return row.claimed if row else False

    async def mark_claimed(
        self,
        db: AsyncSession,
        user_address: str,
        from_day: int,
        to_day: int,
        usd_amount: int,
        rama_amount: int,
        signature: str
    ):
        """
        Mark a period as claimed.

        Args:
            db: Database session
            user_address: User's wallet address
            from_day: Start day
            to_day: End day
            usd_amount: Amount in micro USD
            rama_amount: Amount in wei
            signature: Signature provided
        """
        user_address = user_address.lower()

        await self._ensure_claims_table(db)

        query = text(
            "INSERT INTO slab_income_claims "
            "(user_address, from_day, to_day, usd_amount, rama_amount, signature, claimed_at) "
            "VALUES (:addr, :from_day, :to_day, :usd_amount, :rama_amount, :signature, CURRENT_TIMESTAMP)"
        )
        await db.execute(query, {
            "addr": user_address,
            "from_day": from_day,
            "to_day": to_day,
            "usd_amount": usd_amount,
            "rama_amount": rama_amount,
            "signature": signature
        })
        await db.commit()

        logger.info(f"Marked claim for {user_address}, days {from_day}-{to_day}")

    async def get_user_claims(self, db: AsyncSession, user_address: str) -> list:
        """
        Get all claims for a user.

        Args:
            db: Database session
            user_address: User's wallet address

        Returns:
            List of claim records
        """
        user_address = user_address.lower()

        await self._ensure_claims_table(db)

        query = text(
            "SELECT * FROM slab_income_claims "
            "WHERE user_address = :addr "
            "ORDER BY claimed_at DESC"
        )
        result = await db.execute(query, {"addr": user_address})
        rows = result.fetchall()

        return [
            {
                "from_day": row.from_day,
                "to_day": row.to_day,
                "usd_amount": row.usd_amount,
                "rama_amount": row.rama_amount,
                "claimed_at": row.claimed_at.isoformat() if row.claimed_at else None
            }
            for row in rows
        ]

    async def _ensure_claims_table(self, db: AsyncSession):
        """Create claims table if it doesn't exist."""
        create_table_query = text("""
            CREATE TABLE IF NOT EXISTS slab_income_claims (
                id SERIAL PRIMARY KEY,
                user_address TEXT NOT NULL,
                from_day INTEGER NOT NULL,
                to_day INTEGER NOT NULL,
                usd_amount BIGINT NOT NULL,
                rama_amount BIGINT NOT NULL,
                signature TEXT NOT NULL,
                claimed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_address, from_day, to_day)
            );

            CREATE INDEX IF NOT EXISTS idx_claims_user ON slab_income_claims(user_address);
            CREATE INDEX IF NOT EXISTS idx_claims_period ON slab_income_claims(from_day, to_day);
        """)
        await db.execute(create_table_query)
        await db.commit()


# Initialize global instances (will be configured on app startup)
signature_service: Optional[SignatureService] = None
nonce_manager = NonceManager()
claim_tracker = ClaimTracker()


def init_signature_service(private_key: str, contract_address: str, chain_id: int):
    """
    Initialize the global signature service.

    Call this on application startup.

    Args:
        private_key: Private key of trusted signer
        contract_address: SlabIncomeDistributor contract address
        chain_id: Blockchain chain ID
    """
    global signature_service
    signature_service = SignatureService(private_key, contract_address, chain_id)
    logger.info("Global signature service initialized")
    return signature_service


def get_signature_service() -> SignatureService:
    """Get the global signature service instance."""
    if signature_service is None:
        raise RuntimeError(
            "Signature service not initialized. "
            "Call init_signature_service() on app startup."
        )
    return signature_service


# ==============================================================================
# CONFIGURATION FROM ENVIRONMENT
# ==============================================================================

def init_from_env():
    """
    Initialize signature service from environment variables.

    Required environment variables:
    - SIGNER_PRIVATE_KEY: Private key of trusted signer
    - CONTRACT_ADDRESS: SlabIncomeDistributor contract address
    - CHAIN_ID: Blockchain chain ID (default: 137 for Polygon)
    """
    private_key = os.getenv('SIGNER_PRIVATE_KEY')
    contract_address = os.getenv('CONTRACT_ADDRESS')
    chain_id = int(os.getenv('CHAIN_ID', '137'))

    if not private_key:
        raise ValueError("SIGNER_PRIVATE_KEY environment variable is required")
    if not contract_address:
        raise ValueError("CONTRACT_ADDRESS environment variable is required")

    return init_signature_service(private_key, contract_address, chain_id)


# ==============================================================================
# EXAMPLE USAGE
# ==============================================================================
#
# from signature_service import init_signature_service, get_signature_service
#
# # Initialize on app startup
# init_signature_service(
#     private_key="0x1234...",
#     contract_address="0xContractAddress...",
#     chain_id=137
# )
#
# # Use in routes
# service = get_signature_service()
# signature = service.create_claim_signature(
#     user_address="0xUserAddress...",
#     from_day=100,
#     to_day=150,
#     usd_amount=1000000000,  # $1000 in micro USD
#     rama_amount=20000000000000000000000,  # 20000 RAMA wei
#     nonce=5
# )
#