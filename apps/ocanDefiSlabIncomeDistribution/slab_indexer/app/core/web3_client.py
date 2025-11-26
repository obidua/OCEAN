from web3 import Web3
from app.core.config import settings

w3 = Web3(Web3.HTTPProvider(settings.RPC_URL))

if not w3.is_connected():
    raise RuntimeError("Cannot connect to RPC")
